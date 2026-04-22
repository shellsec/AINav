#!/bin/bash
# 启动所有AI资讯监控脚本 (Linux)
# 使用方法: ./start_all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "Starting AI News Monitor System..."

# 检查Python
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
else
    PY_CMD="python"
fi

# 创建日志目录
mkdir -p logs

# 启动所有监控脚本
MONITORS=(
    "ai-bot-news.py"
    "aibase-news.py"
    "anthropic-news.py"
    "cursor-changelog-monitor.py"
    "huggingface-monitor.py"
    "trae-changelog.py"
    "ollama-news.py"
    "cognition-blog-monitor.py"
    "kiro-changelog-monitor.py"
    "openai-news.py"
)

for script in "${MONITORS[@]}"; do
    if [ -f "$script" ]; then
        echo -e "${BLUE}启动: $script${NC}"
        nohup $PY_CMD "$script" > "logs/${script%.py}.log" 2>&1 &
        sleep 1
    fi
done

echo -e "${GREEN}All monitoring scripts have been started!${NC}"
echo ""
echo "Started scripts:"
echo "  1. ai-bot-news.py"
echo "  2. aibase-news.py"
echo "  3. anthropic-news.py"
echo "  4. cursor-changelog-monitor.py"
echo "  5. huggingface-monitor.py"
echo "  6. trae-changelog.py"
echo "  7. ollama-news.py"
echo "  8. cognition-blog-monitor.py"
echo "  9. kiro-changelog-monitor.py"
echo " 10. openai-news.py"
echo ""
echo "You can check logs in the logs/ directory"
echo "To stop all monitors, run: ./stop_all.sh"

