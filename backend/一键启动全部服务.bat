@echo off
chcp 65001 >nul
title 围棋AI一键启动器
cd /d "%~dp0"

echo ========================================
echo     围棋AI一键启动器
echo ========================================
echo.

REM 检查并启动Node启动器（端口4999）
echo [1/5] 检查Node启动器...
netstat -an | findstr ":4999" >nul
if %errorlevel% neq 0 (
    echo     启动Node启动器 (端口4999)...
    start "启动器-4999" cmd /k "cd /d %~dp0 && node auto-start-server.js"
    timeout /t 2 /nobreak >nul
) else (
    echo     Node启动器已在运行
)

REM 检查并启动初级AI（端口5002）
echo [2/5] 检查初级AI...
netstat -an | findstr ":5002" >nul
if %errorlevel% neq 0 (
    echo     启动初级AI (端口5002)...
    start "初级AI-5002" cmd /k "set GO_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth && cd /d %~dp0 && python api_server_beginner.py"
    timeout /t 2 /nobreak >nul
) else (
    echo     初级AI已在运行
)

REM 检查并启动中级AI（端口5001）
echo [3/5] 检查中级AI...
netstat -an | findstr ":5001" >nul
if %errorlevel% neq 0 (
    echo     启动中级AI (端口5001)...
    start "中级AI-5001" cmd /k "set GO_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth && cd /d %~dp0 && python api_server_intermediate.py"
    timeout /t 2 /nobreak >nul
) else (
    echo     中级AI已在运行
)

REM 检查并启动高级AI KataGo（端口5000）
echo [4/5] 检查高级AI KataGo...
netstat -an | findstr ":5000" >nul
if %errorlevel% neq 0 (
    echo     启动高级AI KataGo (端口5000)...
    echo     注意: KataGo首次加载需要1-5分钟，请耐心等待...
    start "高级AI-5000" cmd /k "set KATAGO_PORT=5000 && set KATAGO_SIMULATIONS=50 && cd /d %~dp0 && python katago_api.py"
    timeout /t 2 /nobreak >nul
) else (
    echo     KataGo已在运行
)

echo.
echo ========================================
echo     服务状态检查
echo ========================================
echo.
echo 端口状态:
netstat -an | findstr ":4999" | findstr LISTENING && echo   启动器  (4999) - OK || echo   启动器  (4999) - 未启动
netstat -an | findstr ":5002" | findstr LISTENING && echo   初级AI  (5002) - OK || echo   初级AI  (5002) - 未启动
netstat -an | findstr ":5001" | findstr LISTENING && echo   中级AI  (5001) - OK || echo   中级AI  (5001) - 未启动
netstat -an | findstr ":5000" | findstr LISTENING && echo   KataGo  (5000) - OK || echo   KataGo  (5000) - 未启动

echo.
echo ========================================
echo     启动完成!
echo ========================================
echo.
echo 如果KataGo显示"正在初始化"，请等待1-5分钟
echo 直到看到"KataGo 引擎名称"或"初始化完成"消息
echo.
echo 然后刷新网页即可使用
echo.
pause
