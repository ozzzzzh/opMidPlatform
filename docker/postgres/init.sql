-- 初始化 PostgreSQL 扩展。数据库镜像使用 pgvector/pgvector:pg15。
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
