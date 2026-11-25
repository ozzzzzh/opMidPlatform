/**
 * multipart/form-data 的文件名在部分客户端或 Node 解析链路中会被按 Latin-1 解码，
 * 导致中文文件名变成乱码。这里只在所有字符都处于 Latin-1 范围、且可还原为合法
 * UTF-8 时尝试还原，避免破坏已经是正常 Unicode 的文件名。
 */
export function decodeUploadFilename(name: string): string {
  if (!name) return name;
  if (!/^[\u0000-ÿ]*$/.test(name)) return name;

  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  if (decoded !== name && !decoded.includes('�')) {
    return decoded;
  }
  return name;
}
