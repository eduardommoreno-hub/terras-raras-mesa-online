@echo off
title Terras Raras - Worker Local IA
cd /d C:\terras_raras_local
set TERRAS_RARAS_URL=https://web-production-0ce81.up.railway.app
set LOCAL_AI_WORKER_TOKEN=terras-local-worker-eduardo-2026
set OLLAMA_MODEL=llama3.1:8b
echo Ligando Worker Local IA do Terras Raras...
echo.
python local_worker.py
echo.
echo Worker encerrado. Pressione qualquer tecla para fechar.
pause >nul
