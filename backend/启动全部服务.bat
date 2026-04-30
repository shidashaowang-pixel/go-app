@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo     围棋AI服务启动器
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请安装Python
    pause
    exit
)

echo [1/4] 启动初级AI (端口5002)...
start "初级AI" cmd /k "set GO_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth && python api_server_beginner.py"

timeout /t 2 /nobreak >nul

echo [2/4] 启动中级AI (端口5001)...
start "中级AI" cmd /k "set GO_MODEL_PATH=C:\Users\24816\Desktop\围棋AI训练\go_checkpoint.pth && python api_server_intermediate.py"

timeout /t 2 /nobreak >nul

echo [3/4] 启动高级AI KataGo (端口5000)...
start "KataGo" cmd /k "set KATAGO_PORT=5000 && python katago_api.py"

timeout /t 1 /nobreak >nul

echo [4/4] 启动Node启动器 (端口4999)...
start "启动器" cmd /k "node auto-start-server.js"

echo.
echo ========================================
echo     服务启动完成!
echo ========================================
echo.
echo 端口: 初级5002, 中级5001, 高级5000, 启动器4999
echo.
echo 检查服务状态: netstat -an | findstr "5000 5001 5002 4999"
echo.
echo 关闭窗口停止所有服务
echo ========================================
pause
