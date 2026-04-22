@echo off
chcp 65001 >nul
echo ========================================
echo Starting AI News Web Service
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

:: Check if Python is installed
where python >nul 2>&1
if errorlevel 1 (
    where py >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python not found. Please install Python 3.9+
        pause
        exit /b 1
    ) else (
        echo Using py command...
        start "AI News Web Server" py -3 app.py
    )
) else (
    echo Using python command...
    start "AI News Web Server" python app.py
)

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start service. Please check error messages.
    pause
    exit /b 1
)

:: Wait for service to start
echo.
echo Waiting for service to start...
timeout /t 3 /nobreak >nul

:: Check if port is listening
set PORT=5001
netstat -an | findstr ":%PORT%" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Service may not be fully started, please access manually later
    timeout /t 2 /nobreak >nul
) else (
    echo Service started successfully
)

:: Open browser automatically
echo.
echo Opening browser...
start http://localhost:5001/ainews.html
timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo AI News Web Service Started
echo ========================================
echo.
echo Access URLs:
echo    http://localhost:5001/
echo    http://localhost:5001/ainews.html
echo.
echo Tip: Closing this window will stop the service
echo.
pause
