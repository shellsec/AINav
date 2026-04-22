# AI资讯数据源说明

## 新增数据源

### 已实现并测试的数据源

1. **Google AI Blog** - `https://blog.google/technology/ai/`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：中等（12小时）
   - 抓取难度：低

2. **Microsoft AI Blog** - `https://www.microsoft.com/en-us/research/blog/`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：中等（12小时）
   - 抓取难度：低

3. **DeepMind Blog** - `https://www.deepmind.com/blog`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：中等（12小时）
   - 抓取难度：低
   - 测试结果：成功抓取10条

4. **AI News** - `https://www.artificialintelligence-news.com/`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：高（6小时）
   - 抓取难度：中等
   - 测试结果：成功抓取7条

5. **VentureBeat AI** - `https://venturebeat.com/ai/`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：高（6小时）
   - 抓取难度：中等
   - 测试结果：成功抓取2条

6. **The Batch (DeepLearning.AI)** - `https://www.deeplearning.ai/the-batch/`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：每周（168小时）
   - 抓取难度：中等
   - 测试结果：成功抓取10条

7. **arXiv AI** - `https://arxiv.org/list/cs.AI/recent`
   - 状态：✅ 可用（HTML解析）
   - 更新频率：高（6小时）
   - 抓取难度：低
   - 测试结果：成功抓取10条

### 需要进一步处理的数据源

8. **Meta AI Research** - `https://ai.meta.com/blog`
   - 状态：❌ 暂时禁用（400错误，反爬虫机制）
   - 更新频率：中等（24小时）
   - 抓取难度：高
   - 备注：需要更高级的反反爬虫方案

9. **Stability AI Blog** - `https://stability.ai/blog`
   - 状态：❌ 暂时禁用（404错误）
   - 更新频率：中等（24小时）
   - 抓取难度：中等
   - 备注：URL可能需要调整

10. **Papers with Code** - `https://paperswithcode.com/`
    - 状态：❌ 暂时禁用（找到元素但未提取到内容）
    - 更新频率：高（6小时）
    - 抓取难度：中等
    - 备注：需要优化选择器或处理JavaScript渲染

11. **机器之心** - `https://www.jiqizhixin.com/`
    - 状态：✅ 已实现（HTML 解析首页/文章列表）
    - 更新频率：高（6 小时）
    - 抓取难度：低
    - 配置项：`机器之心 = true`

### 可考虑的新增数据源（未实现）

| 来源 | 说明 |
|------|------|
| **OpenAI Blog** | 官方动态，若可爬或提供 RSS 可纳入 |
| **量子位** | 中文 AI/科技，与科技频道可二选一或双收 |
| **新智元** | 中文 AI 资讯 |
| **MIT Technology Review AI** | 英文 AI 栏目，质量高 |
| **Wired / Wired AI** | 英文科技媒体 AI 标签页 |

## 使用方法

### 运行统一监控脚本

```bash
cd e:\auto\btc_stock\ainews
python ai_news_monitor.py
```

或双击 `start_ai_monitor.bat`

### 配置文件

编辑 `config.ini` 文件中的 `[sources]` 节，可以启用/禁用各个来源：

```ini
[sources]
Google AI = true
Microsoft AI = true
Meta AI = false
DeepMind = true
Stability AI = false
Papers with Code = false
AI News = true
VentureBeat AI = true
The Batch = true
arXiv AI = true
```

## 数据存储

所有抓取的资讯会自动存储到 `ainews/push_logs.db` 数据库中：
- **分类**：AI资讯
- **来源**：对应的网站名称
- **去重**：自动去重，避免重复入库

## 查看数据

抓取的资讯会显示在 `ainews.html` 页面中：
- 访问：`http://localhost:5001/`（如果运行了 `ainews/app.py`）
- 或者通过主页面 `index.html` 的链接访问
