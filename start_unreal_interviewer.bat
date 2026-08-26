@echo off
echo ======================================================================
echo Starting 3D Human AI Interviewer in Unreal Engine 5.8.1
echo ======================================================================
set UE_PATH="C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
set PROJECT_PATH="C:\Users\vishn\OneDrive\Documents\Unreal Projects\AIInterviewer\AIInterviewer.uproject"
set MAP_PATH="/Game/Interviewer/Maps/InterviewStudio"

echo Launching Unreal Engine 5.8 with InterviewStudio level...
start "" %UE_PATH% %PROJECT_PATH% %MAP_PATH%
echo Unreal Engine launched successfully.
pause
