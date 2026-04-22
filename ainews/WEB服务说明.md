# AI资讯Web服务说明

## 📋 概述

AI资讯Web服务是一个独立的Flask应用，专门用于提供AI资讯数据的API接口和Web页面展示。

## 🚀 启动方式

### 方式1：直接启动（推荐）
```bash
cd ainews
python app.py
```

### 方式2：使用批处理文件
```bash
cd ainews
start_web.bat
```

### 方式3：从根目录一键启动
```bash
# 在项目根目录执行
start_app.bat
# 这会同时启动：
# - 加密货币新闻服务 (端口5000)
# - AI资讯服务 (端口5001)
# - 增强监控系统
# - AI资讯监控系统
```

## 🌐 访问地址

- **Web页面**: http://localhost:5001
- **API测试**: http://localhost:5001/api/ainews/test
- **API接口**: http://localhost:5001/api/ainews?date=2025-12-22

## 📡 API接口

### GET /api/ainews
获取指定日期的AI资讯数据

**参数**:
- `date` (可选): 日期格式 `YYYY-MM-DD`，默认为今天

**示例**:
```
GET /api/ainews?date=2025-12-22
```

**返回格式**:
```json
[
  {
    "source": "Ollama",
    "title": "Ollama最新模型更新",
    "content": "...",
    "category": "AI模型",
    "url": "https://...",
    "time": "2025-12-22 20:42:42",
    "push_time": "2025-12-22 20:42:42",
    "push_channel": "无"
  }
]
```

### GET /api/ainews/test
测试端点，检查数据库连接和数据

**返回格式**:
```json
{
  "status": "ok",
  "database_path": "...",
  "database_exists": true,
  "today": "2025-12-22",
  "records_count": 12
}
```

### GET /health
健康检查端点

## 🔧 配置

### 端口配置
默认端口为 `5001`，可以通过环境变量 `PORT` 修改：
```bash
set PORT=5002
python app.py
```

### 数据库路径
数据库文件位于 `ainews/push_logs.db`，由 `push_logger.py` 管理。

## 📝 注意事项

1. **端口冲突**: 如果5001端口被占用，可以通过环境变量 `PORT` 修改端口
2. **跨域访问**: 已启用CORS，支持从其他端口访问
3. **独立运行**: 此服务完全独立，不依赖主应用的 `app.py`

## 🔗 相关文件

- `app.py`: Flask应用主文件
- `push_logger.py`: 数据库操作模块
- `push_logs.db`: SQLite数据库文件
- `../ainews.html`: Web页面文件（位于项目根目录）
