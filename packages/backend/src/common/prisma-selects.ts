import { Prisma } from '@prisma/client';

/** 所有用户响应统一使用该 select，避免 passwordHash 泄露。 */
export const SAFE_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
