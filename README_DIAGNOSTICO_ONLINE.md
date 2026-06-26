# Diagnóstico online — Terras Raras v19.6.11.16

Depois de subir no Railway, abra no navegador:

1. `/health`
2. `/debug/assets`
3. `/debug/worker`

## Se a tela aparecer preta com texto ALT da imagem

Abra:

`/debug/assets`

Se aparecer arquivos faltando, o Railway não está servindo a pasta `assets` ou a pasta não foi incluída no deploy.

## Se a IA não responder online

Abra:

`/debug/worker`

A IA online só funciona se o `local_worker.py` estiver rodando no seu computador com:

```txt
TERRAS_RARAS_URL=https://web-production-0ce81.up.railway.app
LOCAL_AI_WORKER_TOKEN=igual ao Railway
OLLAMA_URL=http://127.0.0.1:11434
```

Rode:

```bat
RUN_WORKER_RAILWAY.bat
```

Se o worker estiver com `TERRAS_RARAS_URL=http://127.0.0.1:8000`, ele só atende o servidor local, não o Railway.
