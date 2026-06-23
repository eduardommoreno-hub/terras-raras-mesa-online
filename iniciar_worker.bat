@echo off
 title Terras Raras - Motor IA Local
 cd /d "%~dp0"
 set TERRAS_RARAS_URL=http://127.0.0.1:8000
 set LOCAL_AI_WORKER_TOKEN=terras-local-worker-eduardo-2026
 set OLLAMA_URL=http://127.0.0.1:11434
 set OLLAMA_MODEL=llama3.1:8b
 echo Ligando Motor da IA Local do Terras Raras...
 echo.
 echo Antes disso, o Ollama precisa estar aberto e o servidor do jogo precisa estar rodando.
 echo.
 python local_worker.py
 echo.
 pause
