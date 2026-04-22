# 数据库写入问题排查和修复指南

## 问题现象

内容没有写入数据库 `push_logs.db`

## 可能的原因

1. **去重逻辑过于严格**：内容被判断为重复，没有写入
2. **数据库权限问题**：文件或目录没有写入权限
3. **数据库连接问题**：SQLite连接失败
4. **异常被静默捕获**：错误没有正确输出

## 排查步骤

### 1. 运行诊断脚本

```bash
cd E:\auto\btc_stock\ainews
python check_database.py
```

这个脚本会检查：
- 数据库文件是否存在
- 数据库连接是否正常
- 表结构是否正确
- 数据统计信息
- 测试写入功能
- 文件权限

### 2. 检查日志输出

运行监控脚本时，注意观察以下输出：

- `[成功]` - 成功写入数据库
- `[跳过]` - 内容重复，跳过写入
- `[数据库错误]` - 数据库写入失败
- `[错误]` - 处理新闻时出错

### 3. 检查去重逻辑

如果看到大量 `[跳过]` 消息，可能是去重逻辑过于严格。

**解决方法**：
- 检查 `push_logger.py` 中的 `is_duplicate()` 方法
- 可以临时降低相似度阈值（从0.7改为0.9）

### 4. 检查文件权限

在Windows上：
```bash
# 检查文件权限
icacls push_logs.db
icacls .

# 如果需要，添加写入权限
icacls push_logs.db /grant Users:F
```

### 5. 手动测试写入

```python
from push_logger import PushLogger
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(current_dir, 'push_logs.db')
push_logger = PushLogger(db_path=db_path)

# 测试写入
success = push_logger.log_push(
    source="测试",
    title="测试标题",
    content="测试内容",
    category="测试",
    url=None,
    push_channel="无",
    push_status="test",
    keywords=None
)

print(f"写入结果: {success}")
```

## 已修复的问题

### 1. 增强错误处理

- 在 `ai_news_monitor.py` 中添加了更详细的错误处理
- 区分数据库错误和其他错误
- 输出详细的错误堆栈信息

### 2. 增强日志输出

- 添加了 `[调试]` 级别的日志
- 显示内容长度
- 显示URL信息

### 3. 创建诊断工具

- `check_database.py` - 完整的数据库诊断工具

## 使用建议

1. **首次运行前**：先运行 `check_database.py` 检查数据库状态
2. **运行监控脚本**：观察日志输出，特别关注错误信息
3. **定期检查**：定期运行诊断脚本，确保数据库正常
4. **备份数据**：定期备份 `push_logs.db` 文件

## 常见问题

### Q: 为什么内容被跳过？

A: 可能是以下原因：
- 内容确实重复（URL相同）
- 内容哈希相同
- 标题相似度超过阈值

**解决方法**：检查 `push_logger.py` 的 `is_duplicate()` 方法，可以临时放宽去重条件。

### Q: 数据库文件被锁定？

A: 可能是多个进程同时访问数据库。

**解决方法**：
- 确保只有一个监控脚本在运行
- 使用 `stop_all.bat` 停止所有脚本
- 重启后再运行

### Q: 权限不足？

A: 在Windows上，确保：
- 当前用户有写入权限
- 文件没有被其他程序占用
- 目录有写入权限

## 更新日志

- 2026-01-23: 增强错误处理和日志输出
- 2026-01-23: 创建数据库诊断工具
- 2026-01-23: 修复异常捕获问题
