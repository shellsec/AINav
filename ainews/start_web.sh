#!/bin/bash
# 启动AI资讯Web服务 (Linux)
# 使用方法: ./start_web.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "🚀 启动AI资讯Web服务"
echo "========================================"
echo ""

# 检查Python
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
elif command -v python &> /dev/null; then
    PY_CMD="python"
else
    echo -e "${RED}❌ 错误: 未找到Python，请先安装Python 3.9+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python版本: $($PY_CMD --version)${NC}"
echo -e "${BLUE}📂 当前目录: $(pwd)${NC}"
echo ""

# 检查app.py是否存在
if [ ! -f "app.py" ]; then
    echo -e "${RED}❌ 错误: app.py 文件不存在${NC}"
    exit 1
fi

# 检查端口是否被占用
PORT=${PORT:-5001}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
    echo -e "${YELLOW}⚠ 警告: 端口 $PORT 已被占用${NC}"
    echo -e "${YELLOW}  可以使用环境变量 PORT 指定其他端口: PORT=5002 ./start_web.sh${NC}"
    exit 1
fi

# 启动服务
echo -e "${BLUE}正在启动服务...${NC}"
$PY_CMD app.py

