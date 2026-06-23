@echo off
 title Terras Raras - Servidor do Jogo
 cd /d "%~dp0"
 echo Ligando servidor do Terras Raras...
 echo.
 echo Se for a primeira vez, as dependencias serao instaladas.
 python -m pip install -r requirements.txt
 echo.
 echo Abrindo o jogo no navegador...
 start "" http://127.0.0.1:8000
 echo.
 echo NAO FECHE ESTA JANELA enquanto estiver jogando.
 python -m uvicorn main:app --host 127.0.0.1 --port 8000
 echo.
 pause
