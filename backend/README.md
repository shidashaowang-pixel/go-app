# 围棋 AI 后端服务

本目录包含两个 AI 后端服务：

## 1. local_ai_api.py（推荐 - 纯 Python）

纯 Python 实现的启发式 AI，不需要安装额外的围棋引擎。

### 安装和运行

```bash
cd backend
pip install flask flask-cors
python local_ai_api.py
```

服务启动后会在 `http://localhost:5000/ai` 监听请求。

### API 接口

**POST /ai** - 获取 AI 落子

请求示例：
```json
{
  "board": [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  "current_player": 1,
  "size": 9,
  "difficulty": "advanced"
}
```

响应示例：
```json
{
  "x": 4,
  "y": 2,
  "winrate": 0.52
}
```

**GET /health** - 健康检查

响应：
```json
{
  "status": "running",
  "ai_type": "heuristic"
}
```

## 2. katago_api.py（可选 - 使用 KataGo）

需要安装 KataGo 引擎的更强大 AI。

### 安装 KataGo

1. 从 https://github.com/lightvector/KataGo 下载 KataGo
2. 下载模型文件：
   ```bash
   mkdir models
   wget -O models/g170-b10c128.bin.gz https://media.katago.org/katago/models/g170/1x256/model.bin.gz
   ```
3. 创建配置文件 `default_gtp.cfg`：
   ```ini
   gtpCmd = kata1
   model = models/g170-b10c128.bin.gz
   threads = 4
   ```

### 运行

```bash
python katago_api.py
```

## 启动方式

### 方式一：直接运行（开发用）

```bash
cd backend
pip install -r requirements.txt
python local_ai_api.py
```

### 方式二：后台运行（生产用）

```bash
cd backend
nohup python local_ai_api.py > ai.log 2>&1 &
```

### 方式三：使用 PM2（推荐）

```bash
npm install -g pm2
cd backend
pm2 start local_ai_api.py --name go-ai
pm2 save
pm2 startup
```

## 验证服务是否运行

```bash
curl http://localhost:5000/health
```

应该返回：
```json
{"status": "running", "ai_type": "heuristic"}
```
