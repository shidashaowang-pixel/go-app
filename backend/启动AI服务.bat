@echo off
chcp 65001 >nul
title 围棋AI训练服务

echo ========================================
echo     围棋AI训练服务 - 一键启动
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python，请先安装Python
    pause
    exit /b 1
)

REM 设置工作目录
cd /d "%~dp0"

REM 设置模型路径（指向训练目录）
set TRAINED_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth

echo [1/5] 启动初级AI服务 (端口: 5002，使用训练的模型)...
start "初级AI" cmd /k "set GO_MODEL_PATH=%TRAINED_MODEL_PATH% && python api_server_beginner.py"

timeout /t 2 /nobreak >nul

echo [2/5] 启动中级AI服务 (端口: 5001，使用训练的模型)...
start "中级AI" cmd /k "set GO_MODEL_PATH=%TRAINED_MODEL_PATH% && python api_server_intermediate.py"

timeout /t 2 /nobreak >nul

echo [3/5] 启动KataGo高级AI服务 (端口: 5000，max_visits=50)...
start "KataGo高级AI" cmd /k "set KATAGO_PORT=5000 && python katago_api.py"

timeout /t 1 /nobreak >nul

echo [4/5] 启动智能启动器 (端口: 4999)...
start "启动器" cmd /k "node auto-start-server.js"

echo.
echo ========================================
echo     所有服务已成功启动！
echo ========================================
echo.
echo   端口映射:
echo   - 启动器:     4999
echo   - 中级AI:     5001 (使用你训练的模型)
echo   - 初级AI:     5002 (使用你训练的模型)
echo   - KataGo高级: 5000 (max_visits=50，减少算力)
echo.
echo   关闭窗口即可停止该服务
echo ========================================
echo.
echo 按任意键打开服务列表...
pause >nul
