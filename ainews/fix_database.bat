@echo off
chcp 65001 >nul
echo ========================================
echo 数据库问题快速修复工具
echo ========================================
echo.

cd /d %~dp0

echo [1/4] 检查Python环境...
python --version
if errorlevel 1 (
    echo ✗ Python未安装或未添加到PATH
    pause
    exit /b 1
)
echo ✓ Python环境正常
echo.

echo [2/4] 运行数据库诊断...
python check_database.py
echo.

echo [3/4] 检查数据库文件权限...
if exist push_logs.db (
    echo ✓ 数据库文件存在
    dir push_logs.db
) else (
    echo ⚠ 数据库文件不存在，将在首次运行时自动创建
)
echo.

echo [4/4] 测试数据库写入...
python -c "from push_logger import PushLogger; import os; logger = PushLogger(); result = logger.log_push('修复工具', '测试写入', '这是一条测试记录', '测试', None, '无', 'test', None); print('写入结果:', '成功' if result else '失败（可能重复）')"
echo.

echo ========================================
echo 修复完成！
echo ========================================
echo.
echo 如果仍有问题，请查看 fix_database_issue.md
echo.
pause
