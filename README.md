# 健康记录 - 微信小程序 + API 后端

Monorepo 结构，包含饮食/体重/健身记录小程序与自建 API 服务。

## 目录结构

```
packages/
  shared/    # 共享类型、食物/动作数据、营养计算
  server/    # Fastify + Prisma + PostgreSQL API
  miniapp/   # uni-app 微信小程序
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Web 版（浏览器 + IndexedDB，无需后端）

```bash
npm run dev:web
```

浏览器打开 `http://localhost:5173`。

### 3. 启动数据库与 API（Docker）

```bash
docker compose up -d postgres
```

复制环境变量并启动 API：

```bash
cp packages/server/.env.example packages/server/.env
npm run db:push
npm run dev:server
```

API 默认地址：`http://localhost:3000`

### 4. 启动小程序（H5 调试或微信开发者工具）

```bash
npm run dev:miniapp
```

微信开发者工具导入目录：`packages/miniapp/dist/dev/mp-weixin`

在 `packages/miniapp/.env.development` 配置 `VITE_API_BASE_URL`。

### 5. 生产部署

```bash
docker compose up -d --build
```

配置环境变量（项目根目录 `.env`）：

- `JWT_SECRET`：JWT 密钥
- `WX_APPID` / `WX_SECRET`：微信小程序凭证（留空则使用开发模式 openid）

微信公众平台配置 request 合法域名为你的 API HTTPS 地址。

#### 阿里云 / 国内服务器

`docker-compose.yml` 已默认使用 DaoCloud 镜像源（`docker.m.daocloud.io`），无需访问 Docker Hub。若仍拉取失败，可配置阿里云专属加速器：

```bash
sudo sh scripts/configure-docker-mirror.sh https://你的地址.mirror.aliyuncs.com
```

海外本地开发若可直连 Docker Hub，在 `.env` 中设置：

```env
POSTGRES_IMAGE=postgres:16-alpine
NODE_IMAGE=node:22-alpine
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/wx-login | 微信登录 |
| GET/PUT | /api/diet/:date | 饮食记录 |
| GET | /api/diet | 饮食趋势 |
| GET/PUT | /api/weight/:date | 体重记录 |
| GET | /api/weight | 体重趋势 |
| POST | /api/weight/batch | 批量导入体重 |
| GET/PUT | /api/workout/:date | 健身记录 |
