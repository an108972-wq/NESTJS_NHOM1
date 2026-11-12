import { Injectable, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto, LoginDto, Verify2faDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { UserRole, READER_GROUP_LIMITS } from '../../common/constants/user-role';
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from '../../common/constants/auth-secrets';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly captchaStore = new Map<string, { answer: string; expiresAt: number }>();

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

  // 1. CAPTCHA GENERATOR & VALIDATION
  getCaptcha() {
    const a = Math.floor(Math.random() * 12) + 2;
    const b = Math.floor(Math.random() * 12) + 1;
    const captchaId = Math.random().toString(36).substring(2, 10);
    const answer = String(a + b);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.captchaStore.set(captchaId, { answer, expiresAt });

    // Tự động dọn dẹp các captcha hết hạn
    if (this.captchaStore.size > 200) {
      const now = Date.now();
      for (const [key, val] of this.captchaStore.entries()) {
        if (val.expiresAt < now) this.captchaStore.delete(key);
      }
    }

    return {
      captchaId,
      question: `${a} + ${b} = ?`,
    };
  }

  private validateCaptcha(captchaId?: string, answer?: string): boolean {
    if (!captchaId || !answer) return false;
    const item = this.captchaStore.get(captchaId);
    if (!item) return false;
    this.captchaStore.delete(captchaId);
    if (item.expiresAt < Date.now()) return false;
    return item.answer.trim() === answer.trim();
  }

  // 2. REGISTER
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
    const readerGroup = dto.readerGroup || 'STUDENT';
    const groupLimit = (READER_GROUP_LIMITS[readerGroup] && READER_GROUP_LIMITS[readerGroup].maxActiveLoans) || 5;
    const user = this.usersRepository.create({
      username,
      fullName: dto.fullName.trim(),
      phone: dto.phone.trim(),
      email,
      passwordHash,
      role: UserRole.READER,
      readerGroup,
      maxActiveLoans: groupLimit,
      isActive: false,
      approvedAt: null,
    });
    await this.usersRepository.save(user);

    return { message: 'Đăng ký thành công. Tài khoản đang chờ thư viện duyệt.' };
  }

  // 3. LOGIN VỚI RATE LIMITING / CAPTCHA / REMEMBER ME / 2FA
  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: [{ username: dto.username }, { email: dto.username.toLowerCase() }],
    });

    // Kiểm tra nếu tài khoản đang bị tạm khóa (Lockout)
    if (user && user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const remainingMinutes = Math.max(1, Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / 60000));
      throw new UnauthorizedException(
        `Tài khoản tạm thời bị khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút hoặc bấm 'Quên mật khẩu'.`,
      );
    }

    // Nếu đã nhập sai từ 3 lần trở lên -> Bắt buộc giải mã Captcha
    if (user && user.failedLoginAttempts >= 3) {
      if (!dto.captchaId || !dto.captchaAnswer || !this.validateCaptcha(dto.captchaId, dto.captchaAnswer)) {
        throw new BadRequestException('Vui lòng nhập đúng mã xác thực Captcha để tiếp tục.');
      }
    }

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // Khóa 15 phút
        await this.usersRepository.save(user);
        throw new UnauthorizedException(
          'Bạn đã nhập sai mật khẩu 5 lần. Tài khoản bị tạm khóa 15 phút nhằm chống tấn công dò mật khẩu.',
        );
      }
      await this.usersRepository.save(user);

      if (user.failedLoginAttempts >= 3) {
        throw new UnauthorizedException(
          `Mật khẩu không đúng. Cảnh báo: Bạn đã nhập sai ${user.failedLoginAttempts}/5 lần. Vui lòng giải mã Captcha.`,
        );
      }
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đang chờ thư viện duyệt kích hoạt hoặc đã bị khóa');
    }

    // Đăng nhập thành công -> Reset đếm sai
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.usersRepository.save(user);
    }

    // KIỂM TRA XÁC THỰC 2 YẾU TỐ (2FA / MFA) NẾU USER ĐÃ BẬT TRONG CÀI ĐẶT
    const isStaff = [
      UserRole.ADMIN,
      UserRole.COUNTER_LIBRARIAN,
      UserRole.INVENTORY_LIBRARIAN,
      UserRole.LIBRARIAN,
    ].includes(user.role as any);

    if (user.isTwoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.twoFactorTempCode = code;
      user.twoFactorCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
      await this.usersRepository.save(user);

      const mfaToken = await this.jwtService.signAsync(
        { sub: user.id, isMfaPending: true, rememberMe: Boolean(dto.rememberMe) },
        { secret: JWT_ACCESS_SECRET, expiresIn: '5m' },
      );

      return {
        requiresMfa: true,
        mfaToken,
        message: 'Tài khoản yêu cầu xác thực 2 bước (2FA). Vui lòng nhập mã bảo mật.',
        role: user.role,
        redirectUrl: isStaff ? '/admin/dashboard' : '/opac',
        debugCode: code, // Trợ giúp kiểm thử tại chỗ
      };
    }

    // Không cần 2FA -> Cấp tokens ngay
    const tokens = await this.getTokens(user, dto.rememberMe);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      redirectUrl: isStaff ? '/admin/dashboard' : '/opac',
    };
  }

  // 4. XÁC MINH MÃ 2FA
  async verify2fa(dto: Verify2faDto) {
    let payload: { sub: number; isMfaPending?: boolean; rememberMe?: boolean };
    try {
      payload = await this.jwtService.verifyAsync(dto.mfaToken, { secret: JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!payload.isMfaPending) {
      throw new UnauthorizedException('Mã token không hợp lệ.');
    }

    const user = await this.usersRepository.findOneBy({ id: payload.sub, isActive: true });
    if (!user || !user.twoFactorTempCode || !user.twoFactorCodeExpiresAt) {
      throw new UnauthorizedException('Mã xác thực không tồn tại hoặc đã hết hạn.');
    }

    if (new Date() > new Date(user.twoFactorCodeExpiresAt)) {
      throw new UnauthorizedException('Mã xác thực 2FA đã hết hạn (chỉ có hiệu lực trong 5 phút).');
    }

    if (user.twoFactorTempCode.trim() !== dto.code.trim()) {
      throw new UnauthorizedException('Mã xác thực 2FA không chính xác.');
    }

    // Xóa mã tạm
    user.twoFactorTempCode = null;
    user.twoFactorCodeExpiresAt = null;
    await this.usersRepository.save(user);

    const isStaff = [
      UserRole.ADMIN,
      UserRole.COUNTER_LIBRARIAN,
      UserRole.INVENTORY_LIBRARIAN,
      UserRole.LIBRARIAN,
    ].includes(user.role as any);

    const tokens = await this.getTokens(user, payload.rememberMe);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      ...tokens,
      redirectUrl: isStaff ? '/admin/dashboard' : '/opac',
    };
  }

  // 5. QUÊN MẬT KHẨU / KHÔI PHỤC TÀI KHOẢN
  async forgotPassword(dto: ForgotPasswordDto) {
    const identifier = dto.usernameOrEmail.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      // Để bảo mật thông tin tài khoản, vẫn trả về thông báo chung
      return {
        message: 'Nếu tài khoản tồn tại trong hệ thống, mã xác nhận OTP khôi phục mật khẩu đã được tạo.',
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetToken = otp;
    user.passwordResetExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    await this.usersRepository.save(user);

    return {
      message: 'Mã xác nhận OTP khôi phục mật khẩu (hiệu lực 10 phút) đã sẵn sàng.',
      debugOtp: otp, // Tiện dụng kiểm thử
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const identifier = dto.usernameOrEmail.trim().toLowerCase();
    const user = await this.usersRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });

    if (
      !user ||
      !user.passwordResetToken ||
      !user.passwordResetExpiresAt ||
      user.passwordResetToken.trim() !== dto.otp.trim() ||
      new Date() > new Date(user.passwordResetExpiresAt)
    ) {
      throw new BadRequestException('Mã xác nhận OTP không đúng hoặc đã hết hạn.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await this.usersRepository.save(user);

    return {
      message: 'Đặt lại mật khẩu thành công! Bạn có thể dùng mật khẩu mới để đăng nhập ngay.',
    };
  }

  // 6. BẬT / TẮT 2FA
  async toggle2fa(userId: number, enable: boolean) {
    await this.usersRepository.update(userId, { isTwoFactorEnabled: enable });
    return {
      message: enable ? 'Đã kích hoạt xác thực 2 bước (2FA)' : 'Đã tắt xác thực 2 bước (2FA)',
      isTwoFactorEnabled: enable,
    };
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

  async ssoLogin(provider: string, email?: string, name?: string) {
    const prov = (provider || 'google').toLowerCase();
    const ssoEmail = (email || `${prov}.student@school.edu.vn`).trim().toLowerCase();
    const username = ssoEmail.split('@')[0];
    let user = await this.usersRepository.findOne({
      where: [{ email: ssoEmail }, { username }],
    });
    if (!user) {
      const passwordHash = await bcrypt.hash('SsoDefaultPassword2026!', 10);
      user = this.usersRepository.create({
        username,
        email: ssoEmail,
        fullName: name || (prov === 'google' ? 'Sinh viên Google Workspace' : prov === 'microsoft' ? 'Sinh viên Microsoft 365' : 'Học viên Cổng LMS'),
        role: UserRole.READER,
        isActive: true,
        approvedAt: new Date(),
        passwordHash,
      });
      user = await this.usersRepository.save(user);
    }
    const isStaff = [
      UserRole.ADMIN,
      UserRole.COUNTER_LIBRARIAN,
      UserRole.INVENTORY_LIBRARIAN,
      UserRole.LIBRARIAN,
    ].includes(user.role as any);

    const tokens = await this.getTokens(user);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return { ...tokens, user, redirectUrl: isStaff ? '/admin/dashboard' : '/opac' };
  }

  private async updateRefreshTokenHash(userId: number, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, { currentHashedRefreshToken: hash });
  }

  private async getTokens(user: User, rememberMe?: boolean) {
    const payload = {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      roles: [user.role],
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: JWT_REFRESH_SECRET,
        expiresIn: rememberMe ? '30d' : '7d', // Remember Me kéo dài 30 ngày
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        roles: [user.role],
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      },
    };
  }
}
