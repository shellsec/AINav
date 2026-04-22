#!/bin/bash
# 停止所有AI资讯监控脚本 (Linux)
# 使用方法: ./stop_all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MONITORS=(
    "ai-bot-news.py"
    "aibase-news.py"
    "anthropic-news.py"
    "cursor-changelog.py"
    "huggingface-monitor.py"
    "trae-changelog.py"
    "ollama-news.py"
    "cognition-blog-monitor.py"
    "kiro-changelog-monitor.py"
)

echo "Stopping AI News Monitor System..."

for script in "${MONITORS[@]}"; do
    pkill -f "$script" 2>/dev/null || true
done

echo "All monitoring scripts have been stopped."

