/**
 * 前后端共享枚举、类型和标签。
 *
 * 注意：后端 Prisma 枚举由 schema.prisma 生成；这里的字符串值与数据库保持一致，
 * 供前端展示与请求参数使用。
 */

export enum Role {
  ADMIN = 'ADMIN',
  OPS = 'OPS',
  USER = 'USER',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: '管理员',
  [Role.OPS]: '运维',
  [Role.USER]: '普通用户',
};

export enum TicketCategory {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  INTERNAL_SYSTEM = 'INTERNAL_SYSTEM',
  ASSET_REQUEST = 'ASSET_REQUEST',
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.HARDWARE]: '硬件设备',
  [TicketCategory.SOFTWARE]: '办公软件',
  [TicketCategory.INTERNAL_SYSTEM]: '内部系统',
  [TicketCategory.ASSET_REQUEST]: '出库领用需求',
};

export enum TicketStatus {
  OPEN = 'OPEN',
  CLAIMED = 'CLAIMED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: '待认领',
  [TicketStatus.CLAIMED]: '处理中',
  [TicketStatus.RESOLVED]: '已解决',
  [TicketStatus.CLOSED]: '已关闭',
};

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  SUPER_URGENT = 'SUPER_URGENT',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: '低',
  [Priority.MEDIUM]: '中',
  [Priority.HIGH]: '高',
  [Priority.URGENT]: '紧急',
  [Priority.SUPER_URGENT]: 'Super Urgent',
};

export enum TicketSource {
  WEB = 'WEB',
  SCAN = 'SCAN',
}

export enum CommentType {
  COMMENT = 'COMMENT',
  LLM_SUGGESTION = 'LLM_SUGGESTION',
  SYSTEM = 'SYSTEM',
}

export enum KnowledgeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  [KnowledgeStatus.DRAFT]: '草稿',
  [KnowledgeStatus.PUBLISHED]: '已发布',
  [KnowledgeStatus.ARCHIVED]: '已归档',
};

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/** 后端统一响应包装。成功时 code=0；失败时 code 为 HTTP 状态码。 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: Role;
  active?: boolean;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: unknown;
  ip: string | null;
  ticketId: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  } | null;
}

export interface AuditLogQuery {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  database: 'up';
}

export interface UserBrief {
  id: string;
  username: string;
  displayName: string;
}

export interface TicketCommentItem {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  type: CommentType;
  createdAt: string;
  author: UserBrief;
}

export interface TicketAttachmentItem {
  id: string;
  filename: string;
  mimeType: string | null;
  size: number;
  createdAt: string;
}

export interface TicketListItem {
  id: string;
  ticketNo: string;
  title: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  priority: Priority;
  source: TicketSource;
  reporterName: string | null;
  submitterId: string | null;
  assigneeId: string | null;
  resolution: string | null;
  expectedAt: string | null;
  claimedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submitter: UserBrief | null;
  assignee: UserBrief | null;
  _count: {
    comments: number;
  };
}

export interface TicketDetail extends TicketListItem {
  comments: TicketCommentItem[];
  attachments: TicketAttachmentItem[];
}

export interface TicketSummary {
  open: number;
  claimed: number;
  resolved: number;
  closed: number;
  today: number;
  total: number;
  overdue: number;
  dueSoon: number;
  unassignedAging: number;
}

export interface TicketListResponse extends Paginated<TicketListItem> {
  summary: TicketSummary;
}

export type TicketAttention = 'overdue' | 'dueSoon' | 'unassignedAging';

export interface TicketQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: Priority;
  source?: TicketSource;
  assigneeId?: string;
  from?: string;
  to?: string;
  attention?: TicketAttention;
}

export interface CreateTicketPayload {
  category: TicketCategory;
  description: string;
  title?: string;
  priority?: Priority;
  source?: TicketSource;
  reporterName: string;
  expectedAt?: string;
}

export interface CreateStaffTicketPayload extends CreateTicketPayload {
  assignToMe?: boolean;
}

export interface CreateTicketResult {
  id: string;
  ticketNo: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: Priority;
  source: TicketSource;
  reporterName: string | null;
  publicToken: string;
  accessCode: string;
  expectedAt: string | null;
  createdAt: string;
}

export interface TicketTracking {
  ticketNo: string;
  title: string;
  category: TicketCategory;
  priority: Priority;
  status: TicketStatus;
  reporterName: string | null;
  createdAt: string;
  expectedAt: string | null;
  claimedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolution: string | null;
  updatedAt: string;
  assignee: {
    displayName: string;
  } | null;
}

export interface TicketLookupResult extends TicketTracking {
  publicToken: string;
}

export interface AuditReport {
  range: {
    days: number;
    from: string;
    to: string;
  };
  summary: {
    submitted: number;
    today: number;
    pending: number;
    resolved: number;
    closed: number;
    superUrgent: number;
    avgResolutionHours: number | null;
    staffActions: number;
  };
  trend: Array<{
    date: string;
    submitted: number;
    resolved: number;
  }>;
  categories: Array<{
    category: TicketCategory;
    count: number;
  }>;
  staff: Array<{
    userId: string;
    username: string;
    displayName: string;
    claimed: number;
    resolved: number;
    closed: number;
    total: number;
  }>;
  recentActions: Array<{
    id: string;
    action: string;
    createdAt: string;
    user: UserBrief | null;
    ticket: {
      ticketNo: string;
      title: string;
      reporterName: string | null;
    } | null;
  }>;
}

export interface TicketQrResponse {
  url: string;
  dataUrl: string;
}

export enum KnowledgeKind {
  CARD = 'CARD',
  DOCUMENT = 'DOCUMENT',
}

export enum KnowledgeDocType {
  HANDBOOK = 'HANDBOOK',
  REFERENCE = 'REFERENCE',
}

export enum KnowledgeSpace {
  TERM = 'TERM',
  MEET = 'MEET',
  OFFICE = 'OFFICE',
  NET = 'NET',
  BIZ = 'BIZ',
  ASSET = 'ASSET',
  OPS = 'OPS',
}

export interface KnowledgeStep {
  title?: string;
  body: string;
}

export interface KnowledgeAttachmentItem {
  id: string;
  filename: string;
  mimeType: string | null;
  size: number;
  caption: string | null;
  createdAt: string;
}

export interface KnowledgeFileInfo {
  filename: string;
  mimeType: string | null;
  size: number;
}

export interface KnowledgeArticleSummary {
  id: string;
  code: string;
  kind: KnowledgeKind;
  docType: KnowledgeDocType | null;
  space: KnowledgeSpace;
  system: string | null;
  title: string;
  summary: string | null;
  category: TicketCategory | null;
  tags: string[];
  keywords: string[];
  status: KnowledgeStatus;
  needsReview: boolean;
  owner: UserBrief | null;
  sourceTicketId: string | null;
  sourceTicketNo: string | null;
  version: number;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string;
  attachmentCount: number;
  linkedTicketCount: number;
  file: KnowledgeFileInfo | null;
}

export interface KnowledgeLinkedTicket {
  id: string;
  ticketNo: string;
  title: string;
  status: TicketStatus;
  reporterName: string | null;
  createdAt: string;
  source: 'MANUAL' | 'AUTO';
  linkedAt: string;
}

export interface KnowledgeArticleDetail extends KnowledgeArticleSummary {
  symptom: string | null;
  steps: KnowledgeStep[];
  escalation: string | null;
  content: string | null;
  attachments: KnowledgeAttachmentItem[];
  linkedTickets: KnowledgeLinkedTicket[];
}

export interface KnowledgeListQuery {
  q?: string;
  space?: KnowledgeSpace;
  system?: string;
  kind?: KnowledgeKind;
  status?: KnowledgeStatus;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface KnowledgeListResponse extends Paginated<KnowledgeArticleSummary> {}

export interface KnowledgeMetaResponse {
  spaces: Array<{ value: KnowledgeSpace; count: number }>;
  systems: string[];
  tags: string[];
}

export interface CreateKnowledgeCardPayload {
  title: string;
  space: KnowledgeSpace;
  system?: string;
  category?: TicketCategory;
  tags?: string[];
  keywords?: string[];
  summary?: string;
  symptom?: string;
  steps?: KnowledgeStep[];
  escalation?: string;
  status?: KnowledgeStatus;
  sourceTicketId?: string;
  ownerId?: string;
  needsReview?: boolean;
  legacyPaths?: string[];
}

export interface UpdateKnowledgeCardPayload extends Partial<CreateKnowledgeCardPayload> {}

export interface CreateKnowledgeDocumentPayload {
  title: string;
  space: KnowledgeSpace;
  docType: KnowledgeDocType;
  system?: string;
  tags?: string[];
  keywords?: string[];
  summary?: string;
  ownerId?: string;
  category?: TicketCategory;
}

export interface KnowledgeTicketContext {
  linked: KnowledgeArticleSummary[];
  suggestions: KnowledgeArticleSummary[];
}

export interface SubsystemItem {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  accountHint: string | null;
  password: string | null;
  passwordUpdatedAt: string | null;
  hasPassword: boolean;
  icon: string | null;
  url: string | null;
  category: string | null;
  tags: string[];
  sortOrder: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubsystemListQuery {
  q?: string;
  category?: string;
}

export interface SubsystemListResponse {
  items: SubsystemItem[];
  categories: string[];
  tags: string[];
}

export interface CreateSubsystemPayload {
  name: string;
  description?: string;
  notes?: string;
  accountHint?: string;
  icon?: string;
  url?: string;
  category?: string;
  tags?: string[];
  sortOrder?: number;
  visible?: boolean;
  password?: string;
  clearCredential?: boolean;
}

export interface UpdateSubsystemPayload extends Partial<CreateSubsystemPayload> {}

export interface ContactItem {
  id: string;
  name: string;
  role: string;
  systemName: string;
  systemShortName: string | null;
  category: string | null;
  systemUrl: string | null;
  unit: string | null;
  businessDept: string | null;
  landline: string | null;
  mobile: string | null;
  email: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListQuery {
  q?: string;
  category?: string;
  system?: string;
}

export interface ContactListResponse {
  items: ContactItem[];
  categories: string[];
  systems: string[];
}

export interface CreateContactPayload {
  name: string;
  role?: string;
  systemName: string;
  systemShortName?: string;
  category?: string;
  systemUrl?: string;
  unit?: string;
  businessDept?: string;
  landline?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateContactPayload extends Partial<CreateContactPayload> {}

export type DashboardTicketReason =
  'OVERDUE' | 'DUE_SOON' | 'SUPER_URGENT' | 'UNASSIGNED_AGING' | 'STALE';

export interface DashboardTicket {
  id: string;
  ticketNo: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  expectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporterName: string | null;
  assigneeName: string | null;
  reasons: DashboardTicketReason[];
}

export interface DashboardReport {
  summary: {
    today: number;
    open: number;
    claimed: number;
    resolvedToday: number;
    overdue: number;
    dueSoon: number;
    superUrgent: number;
    avgResolutionHours: number | null;
  };
  trend: Array<{ date: string; submitted: number; resolved: number }>;
  categories: Array<{ category: TicketCategory; count: number }>;
  myQueue: DashboardTicket[];
  attention: DashboardTicket[];
  recent: DashboardTicket[];
  workload: Array<{ userId: string; displayName: string; active: number }>;
}

export interface TicketContactContext {
  linked: ContactItem[];
}
