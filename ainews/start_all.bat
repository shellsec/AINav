@echo off
echo Starting AI News Monitor System...

:: Start all monitoring scripts
start /min python ai-bot-news.py
timeout /t 2
start /min python aibase-news.py
timeout /t 2
start /min python anthropic-news.py
timeout /t 2
start /min python cursor-changelog-monitor.py
timeout /t 2
start /min python huggingface-monitor.py
timeout /t 2
start /min python trae-changelog.py
timeout /t 2
start /min python ollama-news.py
timeout /t 2
start /min python cognition-blog-monitor.py
timeout /t 2
start /min python kiro-changelog-monitor.py
timeout /t 2
start /min python openai-news.py
timeout /t 2

echo All monitoring scripts have been started!
echo.
echo Started scripts:
echo   1. ai-bot-news.py
echo   2. aibase-news.py
echo   3. anthropic-news.py
echo   4. cursor-changelog-monitor.py
echo   5. huggingface-monitor.py
echo   6. trae-changelog.py
echo   7. ollama-news.py
echo   8. cognition-blog-monitor.py
echo   9. kiro-changelog-monitor.py
echo  10. openai-news.py
echo.
echo You can minimize this window, the scripts will continue running in the background.
echo.
echo Press any key to exit this window (scripts will continue running)...
pause >nul