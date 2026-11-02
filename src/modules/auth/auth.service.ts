import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly jwtSecret = 'AT_SECRET_KEY_123';
  private readonly refreshSecret = 'RT_SECRET_KEY_456';

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOneBy({ username: dto.username });
    if (existing) {
      throw new BadRequestException('Tài khoản đã tồn tại');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      username: dto.username,
      passwordHash,
    });
    await this.usersRepository.save(user);

    return { message: 'Đăng ký thành công' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOneBy({ username: dto.username });
    if (!user) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');

    const tokens = await this.getTokens(user.id, user.username);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshToken(userId: number, refreshToken: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user || !user.currentHashedRefreshToken) {
      throw new UnauthorizedException('Truy cập bị từ chối');
    }

    const matches = await bcrypt.compare(refreshToken, user.currentHashedRefreshToken);
    if (!matches) throw new UnauthorizedException('Refresh Token không hợp lệ');

    const tokens = await this.getTokens(user.id, user.username);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number) {
    await this.usersRepository.update(userId, { currentHashedRefreshToken: undefined });
    return { message: 'Đăng xuất thành công' };
  }

  private async updateRefreshTokenHash(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, { currentHashedRefreshToken: hash });
  }

  private async getTokens(userId: number, username: string) {
    const payload = { sub: userId, username };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}