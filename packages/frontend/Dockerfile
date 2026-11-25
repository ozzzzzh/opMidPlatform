FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN npm ci --include=dev --include-workspace-root \
  --workspace @it-ops/shared --workspace @it-ops/frontend

COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

RUN npm run build -w @it-ops/shared \
  && npm run build -w @it-ops/frontend

FROM nginx:1.27-alpine

COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80
