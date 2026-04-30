# 围棋应用 - 一键部署指南

## 5分钟快速部署

### 第一步：准备 Supabase

1. 登录 [Supabase](https://supabase.com)
2. 创建一个新项目
3. 在 **Settings → API** 中复制：
   - `Project URL`
   - `anon public` key

4. 在 **Authentication → URL Configuration** 中设置：
   - **Site URL**: 你的网站地址（如 `https://go-app.vercel.app`）
   - **Redirect URLs**: 添加 `https://go-app.vercel.app/*`

### 第二步：部署到 Vercel

1. **打开终端**，在项目目录执行：

```bash
cd goApp
```

2. **安装 Vercel CLI**（如果还没安装）：

```bash
npm install -g vercel
```

3. **登录 Vercel**：

```bash
vercel login
```

4. **部署**：

```bash
vercel --prod
```

5. **输入配置**：
   - Set up and deploy? `Y`
   - Which scope? 选择你的账号
   - Link to existing project? `N`
   - Project name? `go-app`（或你喜欢的名字）
   - Directory? `./`
   - Override settings? `N`

6. **部署成功后会显示 URL**，例如：
   ```
   https://go-app.vercel.app
   ```

### 第三步：配置环境变量

在 Vercel 控制台（https://vercel.com）中：

1. 进入你的项目 → **Settings** → **Environment Variables**

2. 添加以下变量：
   - **Name**: `VITE_SUPABASE_URL`
     **Value**: 你的 Supabase URL

   - **Name**: `VITE_SUPABASE_ANON_KEY`
     **Value**: 你的 Supabase Anon Key

3. 点击 **Save**

4. **重新部署**：
   - 进入 **Deployments**
   - 点击最新部署右边的 **...** → **Redeploy**

### 第四步：验证部署

1. 打开 `https://go-app.vercel.app`
2. 尝试注册/登录
3. 测试基本功能

---

## 自定义域名（可选）

在 Vercel 控制台：
1. **Settings → Domains**
2. 输入你的域名
3. 按提示添加 DNS 记录
4. 等待验证通过

---

## AI 功能说明

⚠️ **重要提示**：

当前应用的 AI 对弈功能（人机对弈）使用了 **KataGo 本地引擎**。

### 情况分析

| 场景 | 是否支持云端 |
|------|------------|
| 注册/登录 | ✅ 支持 |
| 学习微课 | ✅ 支持 |
| 人人对弈 | ✅ 支持 |
| 人机对弈 | ❌ 需要额外配置 |

### 如果你需要云端 AI

**方案 A：使用云端围棋 AI API**

可以集成以下服务：
- [OGS (Online Go Server) API](https://ogs.docs.apiary.io/)
- [GoReviewPartner](https://github.com/pnprog/goreviewpartner)
- 自建 KataGo 服务器

**方案 B：本地运行 AI（推荐毕业设计）**

保持当前架构：
- 前端部署到云端
- AI 功能本地使用

用户访问网站时：
- 普通功能（学习、对弈）→ 云端
- AI 对弈 → 需要本地运行 `go-server`

---

## 故障排查

### 问题：登录后跳转回首页

**原因**：Supabase Redirect URLs 配置不正确

**解决**：
1. 打开 Supabase Dashboard
2. Authentication → URL Configuration
3. 在 Redirect URLs 中添加：
   ```
   https://go-app.vercel.app/auth/callback
   ```

### 问题：CORS 错误

**原因**：API 请求被阻止

**解决**：检查 Vercel 的 vercel.json 配置

### 问题：数据库连接失败

**原因**：Supabase Row Level Security (RLS) 配置

**解决**：
1. 在 Supabase 中检查 RLS 策略
2. 确保匿名用户有注册和登录权限

---

## 下一步

部署完成后，你可以：

1. 🎮 邀请朋友测试
2. 📱 测试移动端访问
3. 🔧 根据反馈优化功能
4. 📚 完善毕设文档

---

## 需要帮助？

如果遇到问题，请检查：
1. Vercel 部署日志
2. 浏览器控制台错误
3. Supabase 日志
