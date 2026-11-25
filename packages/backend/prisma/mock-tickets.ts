import { randomBytes } from 'node:crypto';
import {
  CommentType,
  Priority,
  PrismaClient,
  TicketCategory,
  TicketSource,
  TicketStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

interface MockTicket {
  date: string;
  seq: number;
  title: string;
  description: string;
  category: TicketCategory;
  priority: Priority;
  status: TicketStatus;
  reporter: string;
  createdTime: string;
  claimedTime?: string;
  resolvedTime?: string;
  closedTime?: string;
  expectedAt?: Date | null;
  assignee?: 'admin' | 'ops';
  resolution?: string;
  comment?: string;
  source?: TicketSource;
}

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const now = new Date();
const today = '2026-11-24';

function at(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

function relativeIso(hours: number): Date {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function accessCode(length = 10): string {
  const bytes = randomBytes(length);
  let code = '';
  for (const byte of bytes) code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length];
  return code;
}

const mockTickets: MockTicket[] = [
  {
    date: today,
    seq: 1,
    title: '财务共享客户端提示网络异常',
    description: '财务共享客户端早上开始提示网络异常，无法加载单据列表。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.HIGH,
    status: TicketStatus.OPEN,
    reporter: '王强',
    createdTime: '08:30',
    expectedAt: relativeIso(2),
    comment: '用户反馈早上开始出现，重启客户端无效。',
  },
  {
    date: today,
    seq: 2,
    title: '22楼会议室投屏无信号',
    description: '会议室准备开会，中控显示已连接但大屏一直提示无信号源。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.OPEN,
    reporter: '李娜',
    createdTime: '08:45',
    expectedAt: relativeIso(-3),
  },
  {
    date: today,
    seq: 3,
    title: '新员工电脑无法加入域',
    description: '新入职同事电脑无法加入公司域，登录时提示找不到网络路径。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.CLAIMED,
    reporter: '赵敏',
    createdTime: '08:10',
    claimedTime: '08:40',
    expectedAt: relativeIso(24),
    assignee: 'admin',
    comment: '已远程协助检查 DNS 配置。',
  },
  {
    date: today,
    seq: 4,
    title: '企业邮箱收不到验证码',
    description: '用户重置企业邮箱密码时，手机一直收不到验证码。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.LOW,
    status: TicketStatus.OPEN,
    reporter: '陈晨',
    createdTime: '09:00',
  },
  {
    date: today,
    seq: 5,
    title: 'VPN 连接持续超时',
    description: '外网访问集团业务系统时 VPN 客户端提示连接超时，已更换网络测试。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.URGENT,
    status: TicketStatus.CLAIMED,
    reporter: '张伟',
    createdTime: '08:00',
    claimedTime: '08:20',
    expectedAt: relativeIso(2),
    assignee: 'ops',
    comment: '已让用户 ping zjvpn.zjky.cn，等待结果。',
  },
  {
    date: today,
    seq: 6,
    title: '三楼打印机卡纸',
    description: '三楼公共打印机提示卡纸，无法继续打印会议材料。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.RESOLVED,
    reporter: '王芳',
    createdTime: '07:50',
    claimedTime: '08:10',
    resolvedTime: '08:40',
    assignee: 'admin',
    resolution: '打开后盖取出卡纸，清理进纸轮后测试恢复正常。',
  },
  {
    date: today,
    seq: 7,
    title: '核心数据库连接池耗尽，业务系统大面积超时',
    description: '多个业务系统同时出现数据库连接超时，疑似核心连接池耗尽。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.SUPER_URGENT,
    status: TicketStatus.CLAIMED,
    reporter: '李强',
    createdTime: '08:55',
    claimedTime: '09:00',
    expectedAt: relativeIso(1),
    assignee: 'admin',
    comment: '已联系数据库管理员扩容连接池，持续观察。',
  },
  {
    date: '2026-11-23',
    seq: 3,
    title: 'SAP 账号被锁定',
    description: '用户连续输入错误密码导致 SAP 账号锁定，无法登录。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.HIGH,
    status: TicketStatus.CLOSED,
    reporter: '李强',
    createdTime: '09:10',
    claimedTime: '09:20',
    resolvedTime: '10:30',
    closedTime: '11:00',
    assignee: 'admin',
    resolution: '通过 OA SAP 自助解锁后重置密码，用户登录正常。',
  },
  {
    date: '2026-11-23',
    seq: 4,
    title: '供应商白名单后方案单无法引用',
    description: '供应商白名单审核通过，但方案单里找不到该供应商。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.HIGH,
    status: TicketStatus.CLAIMED,
    reporter: '赵敏',
    createdTime: '16:00',
    claimedTime: '16:30',
    expectedAt: at('2026-11-23', '18:00'),
    assignee: 'admin',
    comment: '已检查供应商主数据，等待同步 SAP。',
  },
  {
    date: '2026-11-23',
    seq: 5,
    title: 'Teams 657rx 报错',
    description: 'Teams 启动时报 657rx 错误，无法进入会议。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.RESOLVED,
    reporter: '陈晨',
    createdTime: '10:00',
    claimedTime: '10:15',
    resolvedTime: '11:00',
    assignee: 'ops',
    resolution: '清理 Teams 和 AAD Broker 缓存后重启电脑恢复。',
  },
  {
    date: '2026-11-23',
    seq: 6,
    title: 'NAS 共享盘无法访问',
    description: '部门同事访问 NAS 共享盘时提示无权限。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.HIGH,
    status: TicketStatus.OPEN,
    reporter: '王芳',
    createdTime: '14:00',
    expectedAt: at('2026-11-23', '18:00'),
  },
  {
    date: '2026-11-22',
    seq: 1,
    title: '显示器指示灯不亮',
    description: '办公位显示器电源指示灯不亮，更换插座后仍无反应。',
    category: TicketCategory.HARDWARE,
    priority: Priority.LOW,
    status: TicketStatus.CLOSED,
    reporter: '李娜',
    createdTime: '09:00',
    claimedTime: '09:20',
    resolvedTime: '10:00',
    closedTime: '10:30',
    assignee: 'admin',
    resolution: '更换电源适配器后恢复。',
  },
  {
    date: '2026-11-22',
    seq: 2,
    title: 'OA 页面空白',
    description: 'OA 登录后页面空白，右上角只显示浏览器兼容提示。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.RESOLVED,
    reporter: '张伟',
    createdTime: '11:00',
    claimedTime: '11:20',
    resolvedTime: '12:10',
    assignee: 'ops',
    resolution: '切换浏览器极速模式并清理缓存后恢复正常。',
  },
  {
    date: '2026-11-22',
    seq: 3,
    title: '22楼会议室麦克风无声',
    description: '视频会议对方听不到本地声音，全向麦红灯。',
    category: TicketCategory.HARDWARE,
    priority: Priority.URGENT,
    status: TicketStatus.CLAIMED,
    reporter: '赵敏',
    createdTime: '13:00',
    claimedTime: '13:15',
    expectedAt: at('2026-11-22', '15:00'),
    assignee: 'admin',
  },
  {
    date: '2026-11-22',
    seq: 4,
    title: '企业微信无法打开合同系统',
    description: '手机企业微信点击合同系统后一直白屏。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.CLOSED,
    reporter: '王强',
    createdTime: '15:00',
    claimedTime: '15:20',
    resolvedTime: '16:00',
    closedTime: '17:00',
    assignee: 'ops',
    resolution: '补充企业微信与合同系统映射后恢复。',
  },
  {
    date: '2026-11-21',
    seq: 8,
    title: '核心交换机端口宕机，部分楼层断网',
    description: '21 楼部分区域网络中断，交换机端口状态异常。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.SUPER_URGENT,
    status: TicketStatus.RESOLVED,
    reporter: '李强',
    createdTime: '09:00',
    claimedTime: '09:05',
    resolvedTime: '10:30',
    assignee: 'admin',
    resolution: '更换故障光模块并恢复端口，网络已恢复。',
  },
  {
    date: '2026-11-21',
    seq: 9,
    title: 'Office 激活失败',
    description: 'Office 365 提示产品未激活，无法保存文档。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.CLOSED,
    reporter: '王芳',
    createdTime: '11:00',
    claimedTime: '11:20',
    resolvedTime: '12:00',
    closedTime: '13:00',
    assignee: 'ops',
    resolution: '重新分配 M365 许可并让用户重新登录激活。',
  },
  {
    date: '2026-11-21',
    seq: 10,
    title: '移动硬盘无法读取',
    description: '移动硬盘插入后没有盘符，换接口仍无反应。',
    category: TicketCategory.HARDWARE,
    priority: Priority.LOW,
    status: TicketStatus.RESOLVED,
    reporter: '陈晨',
    createdTime: '14:00',
    claimedTime: '14:10',
    resolvedTime: '15:20',
    assignee: 'admin',
    resolution: '完成天珣认证后设备正常识别。',
  },
  {
    date: '2026-11-21',
    seq: 11,
    title: '会议室投影仪遥控器丢失',
    description: '22 楼会议室投影仪遥控器找不到，无法切换信号源。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.OPEN,
    reporter: '李娜',
    createdTime: '15:00',
  },
  {
    date: '2026-11-20',
    seq: 1,
    title: '财务系统打印凭证失败',
    description: '财务系统打印凭证时提示打印机不可用，其他文档可打印。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.HIGH,
    status: TicketStatus.CLOSED,
    reporter: '张伟',
    createdTime: '09:30',
    claimedTime: '09:45',
    resolvedTime: '11:00',
    closedTime: '12:00',
    assignee: 'ops',
    resolution: '重新配置财务系统默认打印机后恢复。',
  },
  {
    date: '2026-11-20',
    seq: 2,
    title: '会议室中控无法开机',
    description: '会议室中控平板按电源键无反应，大屏也无法开启。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.RESOLVED,
    reporter: '赵敏',
    createdTime: '13:00',
    claimedTime: '13:20',
    resolvedTime: '14:30',
    assignee: 'admin',
    resolution: '重启中控终端并检查电源后恢复。',
  },
  {
    date: '2026-11-20',
    seq: 3,
    title: '企业微信更换手机号',
    description: '员工更换手机号后无法接收企业微信验证码。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.LOW,
    status: TicketStatus.CLOSED,
    reporter: '王强',
    createdTime: '15:00',
    claimedTime: '15:10',
    resolvedTime: '15:40',
    closedTime: '16:10',
    assignee: 'ops',
    resolution: '指导用户在账号与安全中更换手机号。',
  },
  {
    date: '2026-11-19',
    seq: 1,
    title: '22楼前门门禁无法人脸识别',
    description: '员工在 22 楼前门人脸识别失败，需要检查人脸录入状态。',
    category: TicketCategory.HARDWARE,
    priority: Priority.HIGH,
    status: TicketStatus.CLAIMED,
    reporter: '李娜',
    createdTime: '09:00',
    claimedTime: '09:20',
    expectedAt: at('2026-11-19', '18:00'),
    assignee: 'admin',
  },
  {
    date: '2026-11-19',
    seq: 2,
    title: 'iLearning 页面显示异常',
    description: 'iLearning 页面时间和内容与其他人不一致。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.CLOSED,
    reporter: '陈晨',
    createdTime: '11:00',
    claimedTime: '11:15',
    resolvedTime: '11:45',
    closedTime: '12:30',
    assignee: 'ops',
    resolution: '同步 Windows 时间和时区后恢复。',
  },
  {
    date: '2026-11-18',
    seq: 1,
    title: 'SRM 登录国际化语言初始化失败',
    description: 'SRM 登录后提示国际化语言初始化失败，请刷新重试。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.URGENT,
    status: TicketStatus.RESOLVED,
    reporter: '张伟',
    createdTime: '09:00',
    claimedTime: '09:10',
    resolvedTime: '10:00',
    assignee: 'admin',
    resolution: '校准电脑时间后重新登录正常。',
  },
  {
    date: '2026-11-18',
    seq: 2,
    title: '办公区 WiFi 无法连接',
    description: '办公区笔记本无法连接员工 WiFi，提示密码错误。',
    category: TicketCategory.HARDWARE,
    priority: Priority.LOW,
    status: TicketStatus.CLOSED,
    reporter: '王芳',
    createdTime: '14:00',
    claimedTime: '14:20',
    resolvedTime: '15:00',
    closedTime: '15:30',
    assignee: 'ops',
    resolution: '删除旧无线配置并重新连接员工 WiFi。',
  },
  {
    date: '2026-11-15',
    seq: 1,
    title: '打印机提示碳粉耗尽',
    description: '四楼打印机提示碳粉耗尽，无法继续打印。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.CLOSED,
    reporter: '李强',
    createdTime: '09:30',
    claimedTime: '09:45',
    resolvedTime: '10:30',
    closedTime: '11:00',
    assignee: 'admin',
    resolution: '更换备用碳粉盒后恢复正常。',
  },
  {
    date: '2026-11-15',
    seq: 2,
    title: 'PDF 无法编辑',
    description: '用户需要编辑 PDF 文件，但当前只有福昕阅读版。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.LOW,
    status: TicketStatus.RESOLVED,
    reporter: '赵敏',
    createdTime: '13:00',
    claimedTime: '13:10',
    resolvedTime: '14:00',
    assignee: 'ops',
    resolution: '提交 Adobe 编辑版授权申请，授权后安装。',
  },
  {
    date: '2026-11-10',
    seq: 1,
    title: '合同系统审批流程报错',
    description: '合同审批提交后提示审批人未配置。',
    category: TicketCategory.INTERNAL_SYSTEM,
    priority: Priority.HIGH,
    status: TicketStatus.CLOSED,
    reporter: '王强',
    createdTime: '09:00',
    claimedTime: '09:20',
    resolvedTime: '11:00',
    closedTime: '12:00',
    assignee: 'admin',
    resolution: '联系合同管理员维护审批矩阵后重新提交。',
  },
  {
    date: '2026-11-10',
    seq: 2,
    title: '邮箱客户端授权码失效',
    description: 'Outlook 突然无法登录企业邮箱，提示授权码错误。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.RESOLVED,
    reporter: '陈晨',
    createdTime: '14:00',
    claimedTime: '14:15',
    resolvedTime: '15:00',
    assignee: 'ops',
    resolution: '重新生成客户端授权码并在 Outlook 中更新。',
  },
  {
    date: '2026-10-30',
    seq: 1,
    title: '电脑无法开机',
    description: '主机按下电源键无反应，电源指示灯不亮。',
    category: TicketCategory.HARDWARE,
    priority: Priority.MEDIUM,
    status: TicketStatus.CLOSED,
    reporter: '李娜',
    createdTime: '09:00',
    claimedTime: '09:20',
    resolvedTime: '10:00',
    closedTime: '11:00',
    assignee: 'admin',
    resolution: '更换电源线后恢复。',
  },
  {
    date: '2026-10-30',
    seq: 2,
    title: 'Office 文档只读',
    description: '共享盘中的 Excel 文档打开后为只读，无法保存。',
    category: TicketCategory.SOFTWARE,
    priority: Priority.LOW,
    status: TicketStatus.CLOSED,
    reporter: '张伟',
    createdTime: '13:00',
    claimedTime: '13:15',
    resolvedTime: '14:00',
    closedTime: '15:00',
    assignee: 'ops',
    resolution: '调整共享盘文件权限并取消只读属性。',
  },
];

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { username: { in: ['admin', 'ops'] } },
    select: { id: true, username: true, displayName: true },
  });
  const userMap = new Map(users.map((user) => [user.username, user]));
  const admin = userMap.get('admin');
  const ops = userMap.get('ops');
  if (!admin || !ops) throw new Error('admin/ops users are required');

  let created = 0;
  let skipped = 0;
  const maxSequence = new Map<string, number>();

  for (const mock of mockTickets) {
    const ticketNo = `T-${mock.date}-${String(mock.seq).padStart(4, '0')}`;
    maxSequence.set(mock.date, Math.max(maxSequence.get(mock.date) ?? 0, mock.seq));

    const existing = await prisma.ticket.findUnique({ where: { ticketNo }, select: { id: true } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const assignee = mock.assignee === 'ops' ? ops : mock.assignee === 'admin' ? admin : null;
    const createdAt = at(mock.date, mock.createdTime);
    const claimedAt = mock.claimedTime ? at(mock.date, mock.claimedTime) : null;
    const resolvedAt = mock.resolvedTime ? at(mock.date, mock.resolvedTime) : null;
    const closedAt = mock.closedTime ? at(mock.date, mock.closedTime) : null;
    const updatedAt = closedAt ?? resolvedAt ?? claimedAt ?? createdAt;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        title: mock.title,
        category: mock.category,
        description: mock.description,
        status: mock.status,
        priority: mock.priority,
        source: mock.source ?? TicketSource.WEB,
        reporterName: mock.reporter,
        publicToken: randomBytes(18).toString('base64url'),
        accessCode: accessCode(),
        assigneeId: assignee?.id ?? null,
        expectedAt: mock.expectedAt ?? null,
        claimedAt,
        resolvedAt,
        closedAt,
        resolution: mock.resolution ?? null,
        createdAt,
        updatedAt,
      },
    });

    if (mock.comment) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: (assignee ?? admin).id,
          type: CommentType.COMMENT,
          content: mock.comment,
          createdAt: new Date(createdAt.getTime() + 20 * 60 * 1000),
        },
      });
    }

    const addSystemComment = async (content: string, createdAtValue: Date) => {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: (assignee ?? admin).id,
          type: CommentType.SYSTEM,
          content,
          createdAt: createdAtValue,
        },
      });
    };

    const audit = async (action: string, createdAtValue: Date) => {
      await prisma.auditLog.create({
        data: {
          userId: assignee?.id ?? null,
          action,
          targetType: 'TICKET',
          targetId: ticket.id,
          ticketId: ticket.id,
          detail: { mock: true },
          createdAt: createdAtValue,
        },
      });
    };

    if (assignee && claimedAt) {
      await addSystemComment(`${assignee.displayName} 认领了工单`, claimedAt);
      await audit('TICKET_CLAIM', claimedAt);
    }
    if (assignee && resolvedAt) {
      await addSystemComment(`${assignee.displayName} 将工单标记为已解决`, resolvedAt);
      await audit('TICKET_RESOLVE', resolvedAt);
    }
    if (assignee && closedAt) {
      await addSystemComment(`${assignee.displayName} 关闭了工单`, closedAt);
      await audit('TICKET_CLOSE', closedAt);
    }

    created += 1;
  }

  for (const [date, value] of maxSequence) {
    const existing = await prisma.ticketSequence.findUnique({ where: { date } });
    if (!existing) {
      await prisma.ticketSequence.create({ data: { date, value } });
    } else if (existing.value < value) {
      await prisma.ticketSequence.update({ where: { date }, data: { value } });
    }
  }

  console.log(`Mock 工单完成：新增 ${created} 张，跳过已存在 ${skipped} 张。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
