import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SAFE_USER_SELECT } from '../common/prisma-selects';
import { JwtPayload, SafeUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<SafeUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('无效的登录凭据');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (!user.active) {
      throw new UnauthorizedException('账号已停用');
    }

    return user;
  }
}
