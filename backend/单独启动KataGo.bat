@echo off
chcp 65001 >nul
title KataGo测试

cd /d "C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64"

echo ========================================
echo    KataGo 单独测试
echo ========================================
echo.

echo 测试KataGo是否可用...
echo.

"C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64\katago.exe" gtp -model "C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64\kata1-zhizi-b28c512nbt-muonfd2.bin.gz" -config "C:\Users\24816\Desktop\katago\katago-v1.16.4-opencl-windows-x64\fast_gtp.cfg"

echo.
echo KataGo 已退出，按任意键关闭...
pause
