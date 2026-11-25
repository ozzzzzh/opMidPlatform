# IT 运维管理平台

内网 IT 运维管理系统，采用 React 18 + NestJS + PostgreSQL 15 的单仓多包结构。

> **当前进度：工单核心闭环已完成**  
> 已交付：公开匿名提交工单、图片截图上传、期望完成时间、公开进度追踪、工单查询码与本地记录、工单二维码、工单列表检索、工单详情、认领/解决/关闭、处理记录、Super Urgent 彩蛋、中英文切换、审计统计图表与 CSV 报告导出。  
> 知识库、子系统门户、LLM 与完整统计面板仍待后续交付。

---

## 1. 阶段进度

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| 1 | 脚手架、Docker、Prisma、认证、用户 CRUD、审计 | ✅ 已完成 |
| 2 | 公开工单提交、截图上传、进度追踪、二维码、列表检索、详情、状态流转、评论 | ✅ 已完成 |
| 3 | 知识库、关键词检索、工单关联与工单沉淀 | ✅ 已完成（关键词检索，语义检索后续评估） |
| 4 | 内部系统导航与通讯录 | ✅ 已完成子系统卡片、账号密码、联系人目录与 CRUD；仅 ADMIN/OPS 可见 |
| 5 | 工作台、统计与工单时效提示 | ✅ 已完成工作台首页、统计概览/明细、工单时效提示与联系人关联 |
| 6 | LLM 流式建议、Embedding、设置页 | ⏳ 待开始 |
| 7 | 自动化测试、完整验收数据 | 🟡 待补充 |

当前产品重点：

1. ADMIN/OPS 登录后默认进入工作台，查看今日指标、趋势、我的待办和需要关注的工单；
2. 任何人无需登录即可通过 `http://localhost:8080/report` 提交工单，并可上传最多 5 张截图；
3. 提交后显示工单号 + 10 位查询码，并进入带随机 token 的进度页；链接丢失后可在 `/track` 用“工单号 + 查询码”找回，本机也会保留提交记录；
4. 提交页可选择“尽快”或指定期望完成时间，工单详情和进度页都会显示；
5. 进度页自动刷新查看“已提交 → 已查收 → 已解决 → 已关闭”流程；
6. 公共页面提供明显的中英文切换，运维登录仅通过直接访问 `/login`，不再在用户端展示入口；
7. 运维登录后在工单列表中检索、筛选、查看详情；工单列表提供超时、即将到期、久未认领和久未更新提示；
8. 运维认领、解决、关闭工单，并追加处理记录；
9. 知识库支持场景卡（一问一答）与上传型长文档，按编号、关键词、系统、标签检索；
10. 工单详情推荐并关联知识，同时可搜索并关联通讯录联系人；已解决/已关闭工单可一键沉淀为场景卡，自动回链；
11. 子系统管理以卡片聚合门禁、安防、Microsoft、邮箱、NAS、会议等内部系统入口，支持分类、搜索、账号密码查看和新增编辑；
12. 通讯录以系统列表组织，展开系统查看联系人；支持按系统/姓名/角色/手机号搜索，复制手机号、座机和邮箱；
13. 统计提供概览/明细两个视图，共享统计区间，明细可按状态、类型、处理人筛选，并可一键导出 CSV 报告。

---

## 2. 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 18、TypeScript、Vite 5、Ant Design 5、React Router 6、TanStack Query 5 |
| 后端 | Node.js 20、NestJS 10、Prisma 5、PostgreSQL 15 |
| 认证 | JWT Access Token（默认 8h）、bcryptjs（cost 10） |
| 数据库扩展 | `pg_trgm`（必需）、`pgvector`（可选，启用语义检索时使用） |
| 部署 | Docker Compose：PostgreSQL + NestJS + Nginx |
| 规范 | ESLint、Prettier、前后端共享类型 `packages/shared` |

---

## 3. 目录结构

```text
opMidPlatform/
├── docker/
│   └── postgres/init.sql          # 初始化 pg_trgm / vector
├── packages/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # 完整数据模型
│   │   │   ├── seed.ts            # admin / ops / user 演示账号
│   │   │   └── migrations/        # 初始迁移（pgvector 可选）
│   │   └── src/
│   │       ├── auth/              # 登录、JWT、/me、logout
│   │       ├── tickets/           # 公开提交、检索、详情、状态流转、二维码
│   │       ├── users/             # 用户 CRUD（软停用）
│   │       ├── audit/             # 审计查询
│   │       ├── common/
│   │       │   ├── decorators/    # Public / Roles / CurrentUser / Audit
│   │       │   ├── filters/       # 统一异常响应
│   │       │   ├── guards/        # JWT、角色守卫
│   │       │   └── interceptors/  # 响应包装、全局审计
│   │       ├── config/            # 启动环境变量校验
│   │       ├── prisma/            # PrismaService
│   │       ├── app.module.ts
│   │       └── main.ts
│   ├── frontend/
│   │   └── src/
│   │       ├── api/               # Axios 封装与接口
│   │       ├── auth/              # AuthContext + token 存储
│   │       ├── components/        # 路由守卫
│   │       ├── layouts/           # 侧边栏 + 顶栏
│   │       ├── pages/             # 公开提交、登录、工单列表/详情、用户、审计
│   │       └── styles/
│   └── shared/                    # 角色、工单枚举、API 类型
├── docker-compose.yml
├── package.json                   # npm workspaces
├── .env.example                   # Compose 变量
└── README.md
```

---

## 4. 快速启动（Docker Compose）

### 4.1 前置条件

- Docker Engine 24+，Docker Compose v2
- 可访问 Docker Hub 或内网镜像仓库
- 首次启动会构建镜像并执行数据库迁移、种子数据

### 4.2 启动

```bash
# 可选：复制变量文件并修改密码/密钥
cp .env.example .env

docker compose up -d --build
docker compose ps
```

浏览器访问 **http://localhost:8080**，未登录时会直接进入公开工单提交页。  
用户端页面不显示运维登录入口；运维人员直接访问 **http://localhost:8080/login**。

| 页面 | 地址 | 权限 |
| --- | --- | --- |
| 提交工单 | `/report`（兼容 `/tickets/new`） | 公开 |
| 查询工单 | `/track` | 公开，凭工单号 + 查询码 |
| 工单进度 | `/track/:token` | 公开、凭随机链接 |
| 二维码生成接口 | `/api/tickets/qrcode` | 公开 |
| 运维登录 | `/login` | 公开，运维直接访问，不在用户端展示入口 |
| 工单列表 | `/tickets` | 登录 |
| 工单详情 | `/tickets/:id` | 登录 |
| 用户 / 审计 | `/admin/users`、`/dashboard/audit` | ADMIN / OPS |

前端 Nginx 会把 `/api/*` 反向代理到后端。数据库仅用于本地调试时暴露 `5432`，可通过 `POSTGRES_PORT` 修改。

### 4.3 默认账号

| 用户名 | 密码 | 角色 | 说明 |
| --- | --- | --- | --- |
| `admin` | `Admin@12345` | ADMIN | 管理员，可管理管理员账号 |
| `ops` | `Ops@12345` | OPS | 运维，可管理普通/运维账号，不可操作管理员账号 |
| `user` | `User@12345` | USER | 普通用户，可查看和处理工单 |

> 生产环境必须通过 `.env` 修改 `SEED_*_PASSWORD` 与 `JWT_SECRET`，并尽快修改默认密码。  
> 种子脚本是幂等的：已存在的账号不会被重置密码、角色或启用状态。

### 4.4 停止 / 重置

```bash
docker compose down          # 停止，保留数据
docker compose down -v       # 停止并删除数据库、附件数据（不可恢复）
```

### 4.5 启动验证

```bash
curl http://localhost:8080/api/health
# {"code":0,"message":"success","data":{"status":"ok","timestamp":"...","database":"up"}}

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@12345\"}"
```

也可查看容器状态：

```bash
docker compose ps
docker compose logs -f backend
```

---

## 5. 本地开发

### 5.1 前置条件

- Node.js 20+（项目目标版本为 Node 20，npm 10+；Docker 镜像固定 `node:20-bookworm-slim`）
- PostgreSQL 15，并启用 `pg_trgm` 扩展；`pgvector` 为可选
- 没有本地 PostgreSQL 时，可先安装 Windows 版 PostgreSQL，或只用 Compose 启动数据库

### 5.2 安装与启动

```bash
# 1. 安装依赖（monorepo workspaces）
npm install

# 2. 准备环境变量
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
# Windows PowerShell:
# Copy-Item .env.example .env
# Copy-Item packages/backend/.env.example packages/backend/.env
# 修改 packages/backend/.env 中 DATABASE_URL 的密码/主机

# 3. 生成 Prisma Client
npm run db:generate

# 4. 应用已有迁移（推荐；没有 pgvector 也能运行工单核心流程）
npm run db:deploy
# 已安装 pgvector、需要继续做 schema 开发时，也可以使用：
# npm run db:migrate

# 5. 写入演示账号
npm run db:seed

# 6. 同时启动后端 :3000 和前端 :5173
npm run dev
```

访问：

- 前端：http://localhost:5173
- API：http://localhost:3000/api
- 健康检查：http://localhost:3000/api/health

只启动 Docker 数据库、其余本地运行：

```bash
docker compose up -d db
# 确保 packages/backend/.env 的 DATABASE_URL 与 .env 中 POSTGRES_* 一致
```

生产环境应用迁移使用：

```bash
npm run db:deploy
```

---

## 6. 环境变量

### 6.1 根目录 `.env`（Compose）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `POSTGRES_DB` | `itops` | 数据库名 |
| `POSTGRES_USER` | `itops` | 数据库用户 |
| `POSTGRES_PASSWORD` | `itops_password` | 数据库密码，生产必改 |
| `POSTGRES_PORT` | `5432` | 宿主机映射端口 |
| `JWT_SECRET` | 开发占位值 | JWT 签名密钥，生产至少 32 位随机字符串 |
| `JWT_EXPIRES_IN` | `8h` | Token 有效期 |
| `PUBLIC_BASE_URL` | `http://localhost:8080` | 浏览器可访问地址，后续二维码使用 |
| `CORS_ORIGIN` | `http://localhost:8080` | 允许的前端来源，逗号分隔 |
| `SEED_ADMIN_PASSWORD` | `Admin@12345` | 首次 seed 的管理员口令 |
| `SEED_OPS_PASSWORD` | `Ops@12345` | 首次 seed 的运维口令 |
| `SEED_USER_PASSWORD` | `User@12345` | 首次 seed 的普通用户口令 |
| `EMBEDDING_ENABLED` | `false` | 语义检索开关，阶段 5 生效 |

### 6.2 后端 `packages/backend/.env`

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 |
| `JWT_SECRET` | ✅ | 至少 16 字符，启动时校验 |
| `PORT` | - | 默认 `3000` |
| `JWT_EXPIRES_IN` | - | 默认 `8h` |
| `CORS_ORIGIN` | - | 逗号分隔，未配置时不开放跨域 |
| `PUBLIC_BASE_URL` | - | 二维码公开链接使用 |
| `UPLOAD_DIR` | - | 附件目录，默认 `./uploads` |
| `EMBEDDING_ENABLED` | - | 默认 `false` |
| `SEED_*_PASSWORD` | - | seed 口令 |

> 环境变量在启动时进行必要校验；缺失 `DATABASE_URL` 或过短的 `JWT_SECRET` 会直接阻止启动。

---

## 7. API（工单核心）

统一前缀 `/api`，统一响应：

```json
{ "code": 0, "message": "success", "data": {} }
```

失败时 `code` 为 HTTP 状态码，`data` 为 `null`，例如：

```json
{ "code": 401, "message": "用户名或密码错误", "data": null }
```

### 7.1 认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 公开 | 登录，返回 `accessToken` + `user` |
| GET | `/auth/me` | 登录 | 当前用户 |
| POST | `/auth/logout` | 登录 | 写入审计并返回成功（JWT 无服务端会话） |
| GET | `/health` | 公开 | 健康检查（含数据库连通性） |

### 7.2 工单

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/tickets` | 公开 | 匿名提交工单，支持 multipart `files`（最多 5 张图片），返回工单号与进度 token |
| GET | `/tickets/qrcode` | 公开 | 返回公开提交页二维码 URL 与 Data URL |
| GET | `/tickets/track/:token` | 公开 | 凭随机 token 返回有限进度字段，不暴露描述和附件 |
| POST | `/tickets/lookup` | 公开 | 工单号 + 查询码找回进度链接；查询码不写入审计 |
| GET | `/tickets/attachments/:attachmentId/file` | 公开 | 附件图片能力 URL |
| GET | `/tickets` | 登录 | 分页、关键字、状态、类型、优先级筛选，并返回状态统计 |
| GET | `/tickets/:id` | 登录 | 工单详情、处理记录、附件列表 |
| POST | `/tickets/:id/claim` | 登录 | 认领待处理工单，记录查收时间 |
| POST | `/tickets/:id/resolve` | 登录 | 填写解决说明并标记已解决 |
| POST | `/tickets/:id/close` | 登录 | 关闭工单 |
| POST | `/tickets/:id/comments` | 登录 | 追加处理记录 |

提交工单请求示例（带截图）：

```bash
curl -s -X POST http://localhost:8080/api/tickets \
  -F "category=HARDWARE" \
  -F "description=三楼打印机脱机，无法打印。" \
  -F "reporterName=张伟" \
  -F "priority=HIGH" \
  -F "source=WEB" \
  -F "files=@C:/path/to/screenshot.png;type=image/png" \
  -F "expectedAt=2026-11-22T10:00:00.000Z"
```

不带附件时也可以使用 JSON，字段为 `category`、`description`、`reporterName`、`priority`、`source`、`expectedAt`。  
`expectedAt` 可省略，表示“尽快”；传入时必须晚于当前时间。标题由描述第一句自动生成，也可以传入 `title` 覆盖。

### 7.3 用户

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/users` | ADMIN / OPS | 分页、关键字、角色、状态筛选 |
| POST | `/users` | ADMIN / OPS | 新建；OPS 不能创建 ADMIN |
| PATCH | `/users/:id` | ADMIN / OPS | 修改资料、角色、状态、密码；OPS 不能操作 ADMIN |
| DELETE | `/users/:id` | ADMIN / OPS | 软停用（保留历史关联）；不能停用自己或最后一名管理员 |

### 7.4 审计

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/audit/logs` | ADMIN / OPS | 原始审计记录，按动作、用户、时间范围筛选 |
| GET | `/audit/report?days=30` | ADMIN / OPS | 工单量、类型分布、服务人员处理量、趋势与最近工单动作 |
| GET | `/audit/report/export?days=30&lang=zh` | ADMIN / OPS | 一键导出中英文 CSV 审计报告（汇总 + 趋势 + 人员统计 + 工单明细） |

### 7.5 知识库与工单关联

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/knowledge` | ADMIN / OPS | 关键词、空间、类型、状态筛选与分页 |
| GET | `/knowledge/meta` | ADMIN / OPS | 空间、系统、标签聚合 |
| GET | `/knowledge/suggest?q=` | ADMIN / OPS | 工单/搜索关键词推荐场景卡 |
| GET | `/knowledge/for-ticket/:ticketId` | ADMIN / OPS | 工单已关联知识与推荐知识 |
| POST | `/knowledge/for-ticket/:ticketId/link` | ADMIN / OPS | 手动关联知识 |
| DELETE | `/knowledge/for-ticket/:ticketId/link/:articleId` | ADMIN / OPS | 取消关联 |
| POST | `/knowledge` | ADMIN / OPS | 新建场景卡（可带 `sourceTicketId`） |
| PATCH | `/knowledge/:id` | ADMIN / OPS | 编辑场景卡 |
| POST | `/knowledge/:id/publish` / `archive` | ADMIN / OPS | 发布 / 归档 |
| POST | `/knowledge/documents` | ADMIN / OPS | 上传长文档（PDF/Word/Excel/Markdown/TXT） |
| GET | `/knowledge/:id/file` | ADMIN / OPS | 下载 / 预览长文档 |
| POST | `/knowledge/:id/attachments` | ADMIN / OPS | 场景卡图片上传 |
| GET | `/knowledge/attachments/:attachmentId/file` | 公开能力 URL | 场景卡图片展示 |
| DELETE | `/knowledge/:id` | ADMIN | 删除知识 |

### 7.6 子系统管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/subsystems` | ADMIN / OPS | 卡片列表、关键字/分类筛选，附带分类与标签聚合 |
| GET | `/subsystems/:id` | ADMIN / OPS | 单个系统入口 |
| POST | `/subsystems` | ADMIN / OPS | 新增系统入口 |
| PATCH | `/subsystems/:id` | ADMIN / OPS | 编辑系统入口 |
| DELETE | `/subsystems/:id` | ADMIN | 删除系统入口 |

系统入口保存名称、分类、访问地址、说明、备注、账号、密码和标签。密码按当前要求**明文保存**在数据库中，仅 ADMIN/OPS 可访问；能访问数据库或运维账号的人可以直接读取密码。

### 7.7 工作台与统计

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/dashboard` | ADMIN / OPS | 工作台汇总：今日、待认领、处理中、超时、即将到期、趋势、我的待办、需要关注 |
| GET | `/audit/report?days=30` | ADMIN / OPS | 统计概览数据 |
| GET | `/tickets?from=&to=&status=&category=&assigneeId=&attention=` | ADMIN / OPS | 统计明细、工单快捷视图和时效筛选 |

工单列表支持 `attention=overdue|dueSoon|unassignedAging` 和 `assigneeId` 筛选。

### 7.8 通讯录

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/contacts` | ADMIN / OPS | 联系人列表，按姓名、系统、角色、手机号、邮箱、单位搜索 |
| GET | `/contacts/:id` | ADMIN / OPS | 单个联系人 |
| POST | `/contacts` | ADMIN / OPS | 新增联系人 |
| PATCH | `/contacts/:id` | ADMIN / OPS | 编辑联系人 |
| DELETE | `/contacts/:id` | ADMIN | 删除联系人 |
| GET | `/contacts/for-ticket/:ticketId` | ADMIN / OPS | 工单已关联联系人 |
| POST | `/contacts/for-ticket/:ticketId/link` | ADMIN / OPS | 关联联系人到工单 |
| DELETE | `/contacts/for-ticket/:ticketId/link/:contactId` | ADMIN / OPS | 取消工单联系人关联 |

通讯录包含外部应用系统的负责人、前端/后端运维人员、运维负责人及联系方式，仅 ADMIN/OPS 可访问。

### 7.9 API 调用示例

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@12345\"}" | jq -r '.data.accessToken')

curl -s -X POST http://localhost:8080/api/tickets \
  -H "Content-Type: application/json" \
  -d "{\"category\":\"HARDWARE\",\"description\":\"三楼打印机脱机，无法打印。\",\"reporterName\":\"张伟\",\"priority\":\"HIGH\"}"

curl -s "http://localhost:8080/api/tickets?keyword=打印机&status=OPEN" \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"zhangsan\",\"displayName\":\"张三\",\"password\":\"Passw0rd!\",\"role\":\"USER\"}"

curl -s "http://localhost:8080/api/audit/logs?action=USER_CREATE&page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN"
```

PowerShell：

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"username":"admin","password":"Admin@12345"}'
$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
Invoke-RestMethod -Uri 'http://localhost:8080/api/tickets?page=1&pageSize=20' -Headers $headers
Invoke-RestMethod -Uri http://localhost:8080/api/users -Headers $headers
```

---

## 8. 权限与审计设计

### 8.1 权限

- 所有接口默认要求 JWT；只有 `@Public()` 路由（登录、健康检查、工单提交、进度/查询、二维码、附件读取）无需 Token。
- 任何登录用户都可以查看工单、认领、解决、关闭和追加记录。
- 用户管理和审计查看：`ADMIN`、`OPS`。
- `OPS` 不能创建管理员、不能修改/停用管理员账号。
- 账号不能停用自己；系统至少保留一名启用的管理员。
- `DELETE /users/:id` 为软停用，避免历史工单、评论和审计记录失去关联用户。
- 工单提交为匿名入口，提交人不要求账号；姓名必填。
- 进度页通过随机 `publicToken` 访问；查询码为 10 位随机字符，需与工单号同时提供。
- 本机提交记录保存在浏览器 localStorage，最多保留 20 条，仅作为本地便利凭证。
- 附件只允许 PNG/JPEG/WebP/GIF，单张 10MB、最多 5 张。

### 8.2 审计

`AuditInterceptor` 全局拦截所有 `POST / PUT / PATCH / DELETE`：

- 成功、失败均记录；
- 动作名通过 `@Audit('USER_CREATE')` 声明，未声明时自动生成 `HTTP_METHOD_PATH`；
- 记录操作者、目标类型/ID、IP、耗时、状态码、请求参数简化结果；
- 对 `password`、`token`、`secret`、`apiKey`、`authorization` 等字段递归脱敏；
- 审计失败只写应用日志，不影响业务请求；
- 登录成功/失败和退出均会记录；
- 工单创建、认领、解决、关闭、评论分别记录为 `TICKET_*` 动作；
- 审计页不再以登录日志为主，展示工单提交趋势、问题类型分布、服务人员认领/解决/关闭统计和最近工单动作；
- 支持近 7/30/90 天切换，一键导出 CSV 审计报告。
- `SUPER_URGENT`（Super Urgent）在优先级、工单列表和侧栏菜单显示闪烁火焰。

> JWT 为无状态 Token，当前 logout 只清理客户端凭据并记录审计；如需要强制下线，可在后续阶段加入 token 版本号或黑名单。

---

## 9. 数据库

- 完整模型见 `packages/backend/prisma/schema.prisma`。
- 初始迁移 `packages/backend/prisma/migrations/20261121000000_init` 已包含：
  - 所有业务模型、枚举、索引、外键；
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`；
  - **可选的** pgvector 检测：检测到 `vector` 扩展时创建 `KnowledgeArticle.embedding vector(1536)`，没有扩展则跳过。
- `20261121053757_ticket_intake` 迁移增加了匿名提交所需的可空提交人、姓名和每日工单号序列 `TicketSequence`。
- `20261121110000_ticket_tracking_uploads` 迁移增加了 `reporterName`、随机 `publicToken`、`claimedAt`，并允许匿名附件没有上传人。
- `20261121130000_ticket_tracking_code_priority` 迁移增加了 10 位 `accessCode` 查询码和 `SUPER_URGENT` 优先级。
- `20261121140000_ticket_expected_at` 迁移增加了 `Ticket.expectedAt`，为空表示“尽快”。
- Docker 镜像使用 `pgvector/pgvector:pg15`，同时挂载 `docker/postgres/init.sql` 初始化两个扩展。
- 普通 PostgreSQL 15 也能完成工单核心流程与关键词检索；后续需要语义检索时再安装 pgvector 并补列：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "KnowledgeArticle"
  ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
```

> 在没有 pgvector 的环境中请使用 `npm run db:deploy` 应用迁移。  
> `prisma migrate dev` 会把缺失的 embedding 列识别为 schema drift，适合在安装了 pgvector 的环境使用。

种子数据：

```bash
npm run db:seed
```

---

## 10. 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 构建 shared、backend、frontend |
| `npm run dev` | 同时启动后端 watch 与 Vite |
| `npm run lint` | 全仓 ESLint |
| `npm run format` | Prettier 格式化 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate` | 开发环境迁移 |
| `npm run db:deploy` | 生产环境应用迁移 |
| `npm run db:seed` | 幂等种子数据 |
| `npm run db:import-knowledge` | 导入 47 张场景卡 + 5 份长文档（已存在编号跳过） |
| `npm run db:mock-tickets` | 插入 32 张演示工单及处理记录/审计动作（按工单号幂等，可重复执行） |
| `docker compose up -d --build` | 一键启动 |

知识库首次导入（会连同图片一起导入，已存在的编号会跳过）：

```bash
docker cp 驻点服务运维宝典 itops-backend:/tmp/kb-source
docker exec itops-backend npx tsx prisma/import-knowledge.ts /tmp/kb-source
```

---

## 11. 验收清单

1. `npm install && npm run build` 成功，前端 `tsc --noEmit` 无报错。
2. `npm run lint` 无错误。
3. `docker compose up -d --build` 后访问 `http://localhost:8080`，未登录时直接进入工单提交页。
4. 不登录填写问题类型、描述、姓名，并可上传最多 5 张截图。
5. 提交后自动进入 `/track/:token` 进度页，显示工单号、查询码和四步流程图，可复制查询凭证和进度链接；页面每 15 秒自动刷新。
6. 关闭页面后访问 `/track`，使用工单号 + 查询码可以重新找回进度；同一浏览器还会显示“本机提交记录”。
7. 优先级选择 `Super Urgent` 时显示火焰，工单列表和左侧“工单”菜单会继续显示动态小火苗。
8. 使用 `admin / Admin@12345` 登录后认领该工单，公开进度页刷新后显示“运维查收”时间。
9. 提交页“期望完成时间”可以选择尽快或指定时间，详情和进度页显示该时间。
10. 页面右上角可在中英文之间切换，菜单、表单、表格、图表和日期组件同步切换；刷新后语言保持。
11. 用户端页面不再显示“运维入口”，运维人员直接访问 `/login`。
12. 工单列表可按关键字、状态、类型和优先级检索，并显示彩色统计块、类型图标和姓名。
13. 工单详情可查看截图缩略图、填写解决说明、关闭工单并追加处理记录。
14. 工单二维码可生成、复制链接或下载 PNG。
15. 审计报表展示近 7/30/90 天工单趋势、类型分布、服务人员处理统计和最近工单动作，不展示平台登录日志。
16. 点击“导出审计报告”可下载与当前语言一致的 CSV，包含汇总指标、每日趋势、分类、人员统计和工单明细。
17. `GET /api/health` 返回数据库状态 `up`。

---

## 12. 常见问题

### `P1001: Can't reach database server at localhost:5432`

这不是 Prisma 或代码错误，而是本机没有正在运行的 PostgreSQL。`.env` 中的 `DATABASE_URL` 只是连接地址，不会自动启动数据库。

Docker 不是必需的，只要有一个可用的 PostgreSQL 15。两种方案：

**方案一：Windows 原生 PostgreSQL（不需要 Docker）**

```powershell
winget install -e --id PostgreSQL.PostgreSQL.15
# 安装时设置 postgres 用户密码，并记住端口（默认 5432）
```

安装完成后创建业务库和角色（按需替换密码）：

```sql
CREATE ROLE itops LOGIN PASSWORD 'change_me_db_password' SUPERUSER;
CREATE DATABASE itops OWNER itops;
```

然后把 [packages/backend/.env](packages/backend/.env) 的 `DATABASE_URL` 指向该库，并执行：

```powershell
npm run db:deploy
npm run db:seed
npm run dev
```

工单核心流程及关键词检索不要求 pgvector。以后需要语义检索时，再安装 pgvector 并按上一节 SQL 补列。

**方案二：Docker**

```powershell
winget install -e --id Docker.DockerDesktop
# 安装后启动 Docker Desktop（首次可能需要开启 WSL2 / 重启），然后：
docker compose up -d db
docker compose ps          # 等待 db 状态为 healthy
npm run db:deploy
npm run db:seed
npm run dev
```

也可以直接拉起完整环境，迁移和种子会由后端容器自动执行：

```powershell
docker compose up -d --build
# 打开 http://localhost:8080，无需再执行本地 db:deploy / db:seed
```

如果连接的是已有数据库，请确保：

1. PostgreSQL 版本为 15；
2. 已启用 `pg_trgm`（pgvector 可选）：
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS vector; -- 可选
   ```
3. `packages/backend/.env` 的 `DATABASE_URL` 指向该库，并具有建表权限；
4. 没有 pgvector 时使用 `npm run db:deploy`，不要用 `prisma migrate dev` 检查 drift。

### `npm run db:seed` 后默认密码不生效

种子脚本是幂等的，已存在的账号不会重置密码、角色或启用状态。如需重置演示账号，请在数据库中删除对应用户后重新执行 seed，或通过用户管理页面修改密码。

---

## 13. 已知边界与下一阶段

- 查询码和工单号需要用户保存；两者都丢失时无法找回进度。
- 工单列表、详情和内部处理仍需要运维登录。
- 知识库当前为关键词检索（pg_trgm + 中文二元组），未接入 embedding/LLM；长文档只支持上传与预览，不在平台内编辑。
- 子系统管理保存的账号密码为明文，访问控制依赖 ADMIN/OPS 权限和数据库安全；生产环境应限制数据库访问并定期备份。
- LLM 建议和自动化测试仍未接入；审计报表为初版。
- 未实现 Refresh Token、强制下线、登录限流；生产部署建议在网关层增加限流与 HTTPS。
- 默认口令仅用于演示，生产必须修改。
- 后续阶段将补充 Jest 单元测试与 supertest 接口测试（工单状态机、检索、审计中间件）。
