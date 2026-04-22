@echo off
chcp 65001 >nul
echo ========================================
echo 启动AI资讯统一监控（自动循环运行）
echo ========================================
echo.
echo 提示：脚本将每30分钟自动检查一次
echo       按 Ctrl+C 可停止运行
echo ========================================
echo.
cd /d %~dp0
python ai_news_monitor.py
pause
