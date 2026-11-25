import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** 声明访问该路由所需的角色（满足任一即可）。 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
