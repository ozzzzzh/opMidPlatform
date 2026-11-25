FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Monorepo manifests first, to maximize dependency cache reuse.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN npm ci --include=dev --include-workspace-root \
  --workspace @it-ops/shared --workspace @it-ops/backend

COPY packages/shared packages/shared
COPY packages/backend packages/backend

# Prisma generate 需要解析 datasource；构建期使用占位 URL，运行期由 Compose 注入真实值。
RUN npm run build -w @it-ops/shared \
  && DATABASE_URL="postgresql://build:build@localhost:5432/itops?schema=public" npm run prisma:generate -w @it-ops/backend \
  && npm run build -w @it-ops/backend

WORKDIR /app/packages/backend

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
