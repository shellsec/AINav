# AI资讯系统启动说明

## 启动脚本说明

### 1. `start_web.bat` - Web服务
**作用：** 启动Flask Web服务，提供页面和API接口
- 启动端口：5001
- 自动打开浏览器：http://localhost:5001/
- **必须启动**：用于查看页面和API访问

### 2. `start_all.bat` - 所有独立监控脚本
**作用：** 启动所有独立的采集脚本（后台运行）
- 启动的脚本：
  - ai-bot-news.py
  - aibase-news.py
  - anthropic-news.py
  - cursor-changelog-monitor.py
  - huggingface-monitor.py
  - trae-changelog.py
  - ollama-news.py
  - cognition-blog-monitor.py
  - kiro-changelog-monitor.py
- **建议启动**：用于采集各种AI资讯源的数据

### 3. `start_ai_monitor.bat` - 统一监控脚本
**作用：** 启动统一监控脚本（ai_news_monitor.py）
- 每30分钟自动检查一次
- 监控来源：Google AI、Microsoft AI、Meta AI、DeepMind、Stability AI、Papers with Code、AI News、VentureBeat AI、The Batch、arXiv AI
- **与 start_all.bat 监控内容不同**：主要监控大公司AI博客和学术新闻
- **建议启动**：与 start_all.bat 互补，覆盖更多来源

## 启动建议

### 完整启动（推荐）
1. 先启动 `start_web.bat`（Web服务）
2. 启动 `start_all.bat`（工具类监控：AI工具、模型库更新）
3. 启动 `start_ai_monitor.bat`（资讯类监控：大公司博客、学术新闻）

**注意：** `start_all.bat` 和 `start_ai_monitor.bat` 监控的内容不同，建议都启动以覆盖更多来源

### 最小启动
- 只启动 `start_web.bat`（可以查看已有数据，但不会有新数据）

## 停止服务

- 使用 `stop_all.bat` 停止所有Python进程
- 或直接关闭对应的窗口

