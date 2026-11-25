import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SAFE_USER_SELECT } from '../common/prisma-selects';
import { JwtPayload, SafeUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface LoginResult {
  accessToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { ...SAFE_USER_SELECT, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.active) {
      throw new UnauthorizedException('账号已停用，请联系管理员');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    const payload: JwtPayload = {
      sub: safeUser.id,
      username: safeUser.username,
      role: safeUser.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const lastLoginAt = new Date();
    await this.prisma.user.update({
      where: { id: safeUser.id },
      data: { lastLoginAt },
    });

    return {
      accessToken,
      user: { ...safeUser, lastLoginAt },
    };
  }

  /**
   * JWT 无状态，服务端不保存会话。
   * logout 用于清理审计与前端凭据；如需强制下线，后续可加 token 版本号/黑名单。
   */
  logout(): { success: true } {
    return { success: true };
  }
}
