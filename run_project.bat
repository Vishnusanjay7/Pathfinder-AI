@echo off
title AI Career Coach Runner
echo ========================================================
echo Starting AI Career Coach (Backend and Frontend)
echo ========================================================

echo Starting Backend Server on http://localhost:8000 ...
start "AI Career Coach - Backend (FastAPI)" cmd /k "cd /d C:\AI-Career-Coach\AI-Career-Coach-Backend && python -m uvicorn main:app --reload --port 8000"

echo Starting Frontend Server on http://localhost:3000 ...
start "AI Career Coach - Frontend (Vite React)" cmd /k "cd /d C:\AI-Career-Coach\AI-Career-Coach-frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Open your browser to: http://localhost:3000
echo.
pause
