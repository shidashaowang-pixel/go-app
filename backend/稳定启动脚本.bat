@echo off
chcp 65001 >nul
title 围棋AI稳定启动器

echo ========================================
echo     围棋AI稳定启动器
echo ========================================
echo.

REM 设置工作目录
set BACKEND_DIR=%~dp0
cd /d "%BACKEND_DIR%"

REM 检查初级AI
echo [1/4] 初级AI (5002)...
netstat -an | findstr ":5002" | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo     启动中...
    start "初级AI" cmd /k "cd /d %BACKEND_DIR% && set GO_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth && python api_server_beginner.py"
) else (
    echo     已运行
)
timeout /t 1 /nobreak >nul

REM 检查中级AI
echo [2/4] 中级AI (5001)...
netstat -an | findstr ":5001" | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo     启动中...
    start "中级AI" cmd /k "cd /d %BACKEND_DIR% && set GO_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth && python api_server_intermediate.py"
) else (
    echo     已运行
)
timeout /t 1 /nobreak >nul

REM 检查Node启动器
echo [3/4] Node启动器 (4999)...
netstat -an | findstr ":4999" | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo     启动中...
    start "Node启动器" cmd /k "cd /d %BACKEND_DIR% && node auto-start-server.js"
) else (
    echo     已运行
)
timeout /t 1 /nobreak >nul

REM 单独启动KataGo（会打开新窗口）
echo [4/4] 高级AI KataGo (5000)...
netstat -an | findstr ":5000" | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo     启动中...（首次需等待1-5分钟）
    start "KataGo-5000" cmd /k "cd /d %BACKEND_DIR% && python katago_api.py"
) else (
    echo     已运行
)

echo.
echo ========================================
echo     启动完成
echo ========================================
echo.
echo 等待几秒后刷新浏览器...
echo.
echo 如果有问题，按任意键查看端口状态...
pause >nul

REM 显示端口状态
cls
echo ========================================
echo     端口状态检查
echo ========================================
echo.
netstat -an | findstr "LISTENING" | findstr "4999 5000 5001 5002"
echo.
echo 如果缺少某个端口，请检查对应的窗口
pause
