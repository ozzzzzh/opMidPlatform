import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记无需 JWT 即可访问的路由（登录、健康检查）。 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
