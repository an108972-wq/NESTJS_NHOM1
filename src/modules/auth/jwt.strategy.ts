import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JWT_ACCESS_SECRET } from '../../common/constants/auth-secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: { sub: number }) {
    const user = await this.usersRepository.findOneBy({ id: payload.sub, isActive: true });
    if (!user) return null;
    return { userId: user.id, username: user.username, role: user.role };
  }
}