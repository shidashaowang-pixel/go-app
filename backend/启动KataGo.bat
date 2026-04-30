@echo off
chcp 65001 >nul
title KataGo 高级AI服务

echo ========================================
echo     KataGo 高级AI 围棋服务
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python，请先安装Python
    pause
    exit /b 1
)

echo [1/2] 检查KataGo配置...
cd /d "%~dp0"

REM 检查KataGo可执行文件是否存在
if not exist "%KATAGO_PATH%\katago.exe" (
    echo [警告] 环境变量 KATAGO_PATH 未设置或KataGo不存在
    echo 将使用默认路径: C:\Users\24816\Desktop\katago\...
)

echo [2/2] 启动KataGo服务 (端口: 5000)...
set KATAGO_PORT=5000
set KATAGO_SIMULATIONS=50
python katago_api.py

pause
