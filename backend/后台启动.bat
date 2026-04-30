@echo off
REM 围棋AI后台启动脚本 - 静默启动所有AI服务
cd /d "%~dp0"

REM 设置模型路径
set TRAINED_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth

REM 启动初级AI (5002)
start /min "" cmd /c "title 初级AI && set GO_MODEL_PATH=%TRAINED_MODEL_PATH% && python api_server_beginner.py >nul 2>&1"

REM 启动中级AI (5001)
start /min "" cmd /c "title 中级AI && set GO_MODEL_PATH=%TRAINED_MODEL_PATH% && python api_server_intermediate.py >nul 2>&1"

REM 启动高级AI KataGo (5000)
start /min "" cmd /c "title KataGo && set KATAGO_PORT=5000 && python katago_api.py >nul 2>&1"

REM 启动智能启动器 (4999)
start /min "" cmd /c "title 启动器 && node auto-start-server.js >nul 2>&1"
