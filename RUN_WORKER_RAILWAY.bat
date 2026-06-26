@echo off
title Terras Raras - Worker IA Railway

echo Terras Raras - Worker IA para Railway
echo.
echo IMPORTANTE:
echo 1. O Railway precisa ter a variavel LOCAL_AI_WORKER_TOKEN.
echo 2. O token abaixo precisa ser IGUAL ao token do Railway.
echo 3. O Ollama precisa estar aberto no seu computador.
echo 4. Se quiser usar outro modelo, altere OLLAMA_MODEL.
echo.

set TERRAS_RARAS_URL=https://web-production-0ce81.up.railway.app
set LOCAL_AI_WORKER_TOKEN=terras-local-worker-eduardo-2026
set OLLAMA_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=llama3.1:8b
set POLL_SECONDS=5

python local_worker.py
pause
