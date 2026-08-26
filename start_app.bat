@echo off
title AI Career Coach Runner
echo ========================================================
echo   Starting AI Career Coach Servers...
echo ========================================================
echo.
echo Launching FastAPI Backend (http://127.0.0.1:8000)...
start "AI Career Coach Backend API" /d "c:\AI-Career-Coach\AI-Career-Coach-Backend" cmd /k "python -m uvicorn main:app --reload --port 8000"

echo Launching Vite React Frontend (http://localhost:3000)...
start "AI Career Coach React Web" /d "c:\AI-Career-Coach\AI-Career-Coach-frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo   Both servers launched successfully!
echo   Frontend URL: http://localhost:3000
echo   Backend URL:  http://127.0.0.1:8000/docs
echo ========================================================
