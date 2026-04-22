@echo off
setlocal enableextensions
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
chcp 65001 >nul
title AI News Daily Analysis - Run Now

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
echo AI News Daily Analysis - Run Now
echo ========================================
echo.
echo This will run the analysis task immediately.
echo Target date: Yesterday (to ensure data completeness)
echo.
echo ========================================
echo.

%PY_CMD% %PY_ARGS% daily_analysis_task.py --run-now

pause
