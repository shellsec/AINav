@echo off
setlocal enableextensions
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
chcp 65001 >nul
title AI News Daily Analysis Task

set PY_CMD=python
set PY_ARGS=
where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo Python not found. Please install Python 3.9+ or add it to PATH.
    pause
    exit /b 1
  ) else (
    set PY_CMD=py
    set PY_ARGS=-3
  )
)

echo ========================================
echo AI News Daily Analysis Task Scheduler
echo ========================================
echo.
echo This script will start the daily AI analysis task scheduler.
echo The task will run automatically at the configured time (default: 00:05).
echo.
echo Configuration file: ai_analysis_config.json
echo Analysis results: daily_analysis/
echo.
echo ========================================
echo.

%PY_CMD% %PY_ARGS% daily_analysis_task.py

pause
