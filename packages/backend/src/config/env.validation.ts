/**
 * 启动时校验关键环境变量，避免带着空密钥运行。
 * 注意：不要在此处打印值，尤其是 JWT_SECRET / 数据库密码。
 */
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('缺少环境变量 DATABASE_URL');
  }

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 16) {
    throw new Error('JWT_SECRET 必须配置，且长度不少于 16 个字符');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT 必须是合法端口号');
  }

  return config;
}
