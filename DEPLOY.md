# 围棋应用云端部署配置

## 部署方案

本项目需要部署两部分：
1. **前端**：goApp（React + Vite）
2. **后端**：go-server（Python AI 服务）

---

## 方案一：推荐 - Vercel + Railway

### 前端部署到 Vercel

1. **注册 Vercel 账号**：https://vercel.com

2. **安装 Vercel CLI**：
   ```bash
   npm install -g vercel
   ```

3. **在项目根目录部署**：
   ```bash
   cd goApp
   vercel
   ```

4. **配置环境变量**：
   在 Vercel 控制台添加：
   - `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: 你的 Supabase Anon Key

### 后端部署到 Railway

1. **注册 Railway 账号**：https://railway.app

2. **连接 GitHub 仓库**

3. **添加 Python 项目**：
   - 选择 `backend` 文件夹
   - 设置启动命令：`pip install -r requirements.txt && python app.py`

4. **配置环境变量**：
   - `FLASK_ENV`: production
   - `PORT`: 5000

---

## 方案二：Cloudflare Pages + Workers

### 前端部署到 Cloudflare Pages

1. **注册 Cloudflare 账号**：https://pages.cloudflare.com

2. **构建前端**：
   ```bash
   cd goApp
   npm run build  # 需要先创建构建配置
   ```

3. **上传到 Cloudflare Pages**

### 后端部署到 Cloudflare Workers

Python Flask 需要转换为 Workers 兼容格式，较复杂。

---

## 方案三：腾讯云 / 阿里云

### 前端部署
- 腾讯云 COS + CDN
- 阿里云 OSS + CDN

### 后端部署
- 腾讯云 SCF（云函数）
- 阿里云函数计算

---

## 快速开始（推荐方案一）

### 第一步：修改 Supabase 配置

在 Supabase 控制台中：
1. **Authentication → URL Configuration**
   - 添加你的 Vercel 域名到 Allowed URLs

2. **Authentication → Providers → Email**
   - 启用 Email Sign In

### 第二步：部署前端

```bash
# 安装 Vercel
npm install -g vercel

# 部署
cd goApp
vercel --prod
```

### 第三步：部署后端（如果需要 AI 功能）

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
cd backend
railway init

# 部署
railway up
```

---

## 注意事项

### 1. AI 引擎（KataGo）
KataGo 是本地运行的 AI 引擎，**无法直接在云端运行**。有以下选择：

**方案 A：使用云端 AI API（推荐）**
- 集成 Leela Zero API
- 使用开源围棋 AI 云服务
- 使用商业 AI API

**方案 B：本地运行 AI**
- AI 功能仅本地可用
- 云端部署前端 + Supabase

### 2. 环境变量

创建 `.env.production` 文件：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-backend.railway.app
```

### 3. 域名配置

部署后，在 Supabase 中添加新的域名到 Allowed URLs：
- `https://your-app.vercel.app`
- `https://your-app.vercel.app/auth/callback`

---

## 自定义域名（可选）

在 Vercel 控制台中：
1. 进入项目 → Settings → Domains
2. 添加你的域名
3. 配置 DNS 记录

---

## 监控和维护

### Vercel Analytics
自动开启，可查看访问量、性能等。

### Railway Logs
查看后端日志，排查问题。

---

如需帮助，请提供：
1. 你偏好的云平台（Vercel/Railway/腾讯云）
2. 是否需要 AI 功能在云端运行
3. 是否有自己的域名
