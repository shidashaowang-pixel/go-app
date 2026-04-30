@echo off
chcp 65001 >nul
echo ========================================
echo     围棋AI开机自启设置
echo ========================================
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"

REM 创建VBS脚本实现静默后台运行
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\RunGoAI.vbs"
echo WshShell.Run """%SCRIPT_DIR:&=^&%启动全部服务.bat""", 0, False >> "%TEMP%\RunGoAI.vbs"

REM 复制到启动文件夹
copy "%TEMP%\RunGoAI.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\围棋AI服务.vbs" /Y

del "%TEMP%\RunGoAI.vbs"

echo.
echo ========================================
echo     设置成功！
echo ========================================
echo.
echo AI服务将在电脑开机时自动后台启动。
echo.
echo 验证：打开任务管理器 -^> 启动项，应看到"围棋AI服务"
echo.
echo 取消自启：删除此文件
echo %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\围棋AI服务.vbs
echo.
pause
