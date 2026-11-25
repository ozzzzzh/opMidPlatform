import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 10;

interface SeedAccount {
  username: string;
  displayName: string;
  email: string;
  role: Role;
  password: string;
}

async function upsertAccount(account: SeedAccount): Promise<void> {
  const passwordHash = await bcrypt.hash(account.password, BCRYPT_COST);

  await prisma.user.upsert({
    where: { username: account.username },
    // 已存在的账号不覆盖密码、角色或启用状态，避免每次重启把管理员改动还原。
    update: {},
    create: {
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      role: account.role,
      passwordHash,
    },
  });
}

interface SeedSubsystem {
  name: string;
  description: string;
  notes?: string;
  icon: string;
  url?: string;
  category: string;
  tags: string[];
  sortOrder: number;
}

async function upsertSubsystems(): Promise<void> {
  const subsystems: SeedSubsystem[] = [
    {
      name: '海康威视门禁',
      description: '门禁系统管理入口',
      notes: '21 楼前门/侧门、22 楼前门/侧门及 22 楼会议室 4 门禁；上班常开，下班关闭。',
      icon: 'shield',
      url: 'https://10.43.210.22/doc/index.html#/portal/login',
      category: '门禁与安防',
      tags: ['门禁', '人脸', '海康'],
      sortOrder: 10,
    },
    {
      name: '综合安防管理平台',
      description: '新员工人脸门禁录入和安防管理',
      icon: 'camera',
      url: 'https://10.43.220.2/portal/cas/loginPage',
      category: '门禁与安防',
      tags: ['安防', '人脸'],
      sortOrder: 20,
    },
    {
      name: 'Microsoft Admin',
      description: 'Microsoft 365 管理中心',
      notes: '新员工发放 Microsoft 账号，主要用于 Teams。',
      icon: 'microsoft',
      url: 'https://admin.microsoft.com/Adminportal',
      category: '账号与办公',
      tags: ['Microsoft', 'Teams', '账号'],
      sortOrder: 10,
    },
    {
      name: 'ITSupport 邮箱',
      description: 'IT 支持邮箱入口',
      notes: '目前停用（Stopped）。',
      icon: 'mail',
      url: 'http://mail.zijinmining.com/',
      category: '账号与办公',
      tags: ['邮箱'],
      sortOrder: 20,
    },
    {
      name: '办公室 WIFI',
      description: '员工与访客 WiFi 信息',
      notes:
        '员工 WiFi 可访问互联网、跨境网络及集团专线；每个工位下方有网络端口。仅限内部员工使用，禁止对外分享。',
      icon: 'wifi',
      category: '网络与存储',
      tags: ['WiFi', '网络'],
      sortOrder: 10,
    },
    {
      name: 'NAS 共享盘',
      description: '境外企业公共材料共享盘',
      notes: '公共材料放在所有境外企业目录下（卡莫阿除外）；每月运维一次会议记录信息。',
      icon: 'nas',
      url: '\\\\10.43.80.11',
      category: '网络与存储',
      tags: ['NAS', '文件'],
      sortOrder: 20,
    },
    {
      name: 'NAS 管理后台',
      description: 'NAS 用户与共享管理',
      notes: '登录管理页面可设置用户账号。',
      icon: 'server',
      url: 'https://10.43.80.11',
      category: '网络与存储',
      tags: ['NAS', '管理'],
      sortOrder: 30,
    },
    {
      name: '华为视频会议系统后台',
      description: '会议室视频会议设备后台',
      notes:
        '后台地址 10.43.200.1-10.43.200.5 对应 22 楼 5 个会议室，10.43.200.11-12 对应 21 楼两个会议室；访问后台需要会议室设备启动。问题联系陈世豪、李霞。',
      icon: 'video',
      url: 'http://10.43.200.1',
      category: '会议与多媒体',
      tags: ['会议', '华为'],
      sortOrder: 10,
    },
    {
      name: '会议看板平板',
      description: '集团会议信息看板',
      notes: '查看集团会议信息。',
      icon: 'tablet',
      category: '会议与多媒体',
      tags: ['会议', '平板'],
      sortOrder: 20,
    },
    {
      name: '会议室 2/4 中控',
      description: '会议室中控面板',
      notes: '用于调整摄像头角度。',
      icon: 'panel',
      category: '会议与多媒体',
      tags: ['会议室', '中控'],
      sortOrder: 30,
    },
    {
      name: '天擎终端安全',
      description: '终端安全客户端',
      notes: '终端安全客户端；卸载需要授权，具体以保密文件为准。',
      icon: 'security',
      category: '终端与安全',
      tags: ['天擎', '终端安全'],
      sortOrder: 10,
    },
  ];

  for (const item of subsystems) {
    const existing = await prisma.subsystem.findFirst({ where: { name: item.name } });
    if (existing) continue;
    await prisma.subsystem.create({
      data: {
        name: item.name,
        description: item.description,
        notes: item.notes ?? null,
        icon: item.icon,
        url: item.url ?? null,
        category: item.category,
        tags: item.tags,
        sortOrder: item.sortOrder,
      },
    });
    console.log('[seed] 已新增子系统入口：' + item.name);
  }
}

async function main(): Promise<void> {
  const accounts: SeedAccount[] = [
    {
      username: 'admin',
      displayName: '系统管理员',
      email: 'admin@it-ops.local',
      role: Role.ADMIN,
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
    },
    {
      username: 'ops',
      displayName: '运维工程师',
      email: 'ops@it-ops.local',
      role: Role.OPS,
      password: process.env.SEED_OPS_PASSWORD ?? 'Ops@12345',
    },
    {
      username: 'user',
      displayName: '普通用户',
      email: 'user@it-ops.local',
      role: Role.USER,
      password: process.env.SEED_USER_PASSWORD ?? 'User@12345',
    },
  ];

  for (const account of accounts) {
    await upsertAccount(account);
    console.log(`[seed] 已确保账号存在：${account.username} (${account.role})`);
  }

  await upsertSubsystems();

  console.log('[seed] 完成。已有账号不会被重置密码。');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] 失败：', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
