# Terras Raras — v8 Mapas Interativos

Versão v8 do projeto Terras Raras. Mantém tudo da v7 e adiciona a primeira camada de mapa jogável.

## O que há de novo

- Mapas com pontos clicáveis.
- Caminhos visíveis entre locais.
- Locais por zona: entrada, perigo, local oculto e portal.
- Mestre pode selecionar um ponto e mover um token para lá.
- Botão para gerar narração do ponto usando IA local/Ollama.
- Botão para gerar prompt de imagem do ponto.
- Botão para registrar o local no Diário da Mestre.
- Mantém IA Local Zero API, login, sala, sair da sala, PostgreSQL e worker local.

## Arquivos

- main.py — backend FastAPI/Railway.
- index.html — frontend com mapas interativos.
- local_worker.py — worker local para Ollama.
- requirements.txt — dependências.
- Procfile — comando de start no Railway.
- railway.json — configuração Railway.

## Teste de versão

Abra:

```
https://web-production-0ce81.up.railway.app/debug/admin-env
```

Deve retornar:

```
"version": "v8-mapas-interativos"
```

## Worker local

No computador do Eduardo:

```powershell
cd C:\terras_raras_local
$env:TERRAS_RARAS_URL="https://web-production-0ce81.up.railway.app"
$env:LOCAL_AI_WORKER_TOKEN="terras-local-worker-eduardo-2026"
$env:OLLAMA_MODEL="llama3.1:8b"
python local_worker.py
```
