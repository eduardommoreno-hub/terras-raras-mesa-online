@echo off
 title Terras Raras - Iniciar Tudo
 cd /d "%~dp0"
 echo Ligando Terras Raras completo...
 echo.
 echo 1/3 Servidor do jogo
 start "Terras Raras - Servidor do Jogo" cmd /k "cd /d %~dp0 && iniciar_jogo.bat"
 echo Aguardando o servidor subir...
 timeout /t 6 /nobreak >nul
 echo.
 echo 2/3 Motor IA local
 start "Terras Raras - Motor IA Local" cmd /k "cd /d %~dp0 && iniciar_worker.bat"
 echo.
 echo 3/3 Abrindo navegador
 start "" http://127.0.0.1:8000
 echo.
 echo Pronto. Deixe as duas janelas abertas enquanto estiver jogando.
 echo.
 pause
