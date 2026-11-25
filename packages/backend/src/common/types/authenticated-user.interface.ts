import { Role } from '@prisma/client';
import type { Request } from 'express';

/** 经过 Prisma select 过滤后的安全用户对象（绝不包含 passwordHash）。 */
export interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: Role;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}
