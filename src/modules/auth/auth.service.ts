import { Injectable, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole } from '../../common/constants/user-role';
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from '../../common/constants/auth-secrets';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ role: UserRole.READER })
      .where('role = :legacyRole', { legacyRole: 'USER' })
      .execute();

    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username && !password) return;
    if (!username || !password) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be configured together');
    }
    if (password.length < 12) {
      throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
    }

    const existingUsers = await this.usersRepository.count();
    if (existingUsers > 0) return;

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = this.usersRepository.create({
      username,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      approvedAt: new Date(),
    });
    await this.usersRepository.save(admin);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username?.trim() || email;
    const existing = await this.usersRepository.findOneBy({ username });
    if (existing || (await this.usersRepository.findOneBy({ email }))) {
      throw new BadRequestException('Email hoặc tài khoản đã được sử dụng');
    }
    if (username !== email && await this.usersRepository.findOneBy({ email: username })) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      username,
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      email,
      passwordHash,
      role: UserRole.READER,
      isActive: false,
      approvedAt: null,
    });
    await this.usersRepository.save(user);

    return { message: 'Đăng ký thành công. Tài khoản đang chờ thư viện duyệt.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: [{ username: dto.username }, { email: dto.username.toLowerCase() }],
    });
    if (!user) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đang chờ thư viện duyệt kích hoạt hoặc đã bị khóa');
    }

    const tokens = await this.getTokens(user);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshToken(refreshToken: string) {
    let payload: { sub: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Refresh Token không hợp lệ');
    }

    const user = await this.usersRepository.findOneBy({ id: payload.sub, isActive: true });
    if (!user || !user.currentHashedRefreshToken) {
      throw new UnauthorizedException('Truy cập bị từ chối');
    }

    const matches = await bcrypt.compare(refreshToken, user.currentHashedRefreshToken);
    if (!matches) throw new UnauthorizedException('Refresh Token không hợp lệ');

    const tokens = await this.getTokens(user);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    await this.usersRepository.update(userId, { currentHashedRefreshToken: null });
    return { message: 'Đăng xuất thành công' };
  }

  private async updateRefreshTokenHash(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, { currentHashedRefreshToken: hash });
  }

  private async getTokens(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}