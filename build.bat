@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   AINav 构建脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 未检测到 Node.js，请先安装: https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] 构建 index.html ...
node build-html-data.js
if errorlevel 1 (
    echo [ERROR] 构建失败！
    pause
    exit /b 1
)
echo       完成。

echo [2/3] 构建国际化英文版 ...
if exist build-i18n-en.cjs (
    node build-i18n-en.cjs
    if errorlevel 1 (
        echo [WARN] 国际化构建失败，已跳过。
    ) else (
        echo       完成。
    )
) else (
    echo       跳过（build-i18n-en.cjs 不存在）。
)

echo [3/3] 下载图标 ...
if exist download-icons.mjs (
    node download-icons.mjs
    if errorlevel 1 (
        echo [WARN] 图标下载失败，已跳过。
    ) else (
        echo       完成。
    )
) else (
    echo       跳过（download-icons.mjs 不存在）。
)

echo.
echo ========================================
echo   构建完成！
echo ========================================
echo.
echo 输出: index.html, ai-encyclopedia-2026.html, free-tier.html, sitemap.xml
echo.
pause
