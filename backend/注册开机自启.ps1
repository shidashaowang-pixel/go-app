# 围棋AI服务开机自启注册脚本
$scriptPath = "$PSScriptRoot\后台启动.bat"
$taskName = "GoAppAIService"

# 删除旧任务（如果存在）
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# 创建新任务
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "围棋AI服务后台运行"

Write-Host "已注册开机自启：$taskName"
Write-Host "AI服务将在系统启动时自动在后台启动"
