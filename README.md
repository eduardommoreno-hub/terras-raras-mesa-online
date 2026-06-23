# Terras Raras — v8.3 Estabilidade da IA Local

Versão de estabilização após a v8.1 visual.

## O que mudou

- Mantém o visual melhorado da v8.1.
- Impede criação de vários pedidos repetidos de IA quando já existe pedido pendente/processando.
- Adiciona botão **Limpar pendentes** na aba IA.
- Adiciona botão **Cancelar pedido** em cada pedido pendente/processando.
- Jobs travados em `processing` por mais de 8 minutos voltam para `pending`.
- Adiciona o arquivo `iniciar_worker.bat` para ligar o worker local com dois cliques no Windows.
- Atualiza `/health` e `/debug/admin-env` para `v8.3-estabilidade-ia`.

## Como aplicar no Railway

Envie estes arquivos para o GitHub:

- `main.py`
- `index.html`
- `requirements.txt`
- `Procfile`
- `railway.json`
- `README.md`
- `local_worker.py`
- `iniciar_worker.bat`

Depois aguarde o Railway redeployar. Teste:

```txt
https://web-production-0ce81.up.railway.app/debug/admin-env
```

Deve aparecer:

```txt
"version":"v8.3-estabilidade-ia"
```

## Como usar o worker local

Copie também para `C:\terras_raras_local`:

- `local_worker.py`
- `iniciar_worker.bat`

Depois basta dar dois cliques em:

```txt
iniciar_worker.bat
```

Ele já configura:

- `TERRAS_RARAS_URL`
- `LOCAL_AI_WORKER_TOKEN`
- `OLLAMA_MODEL`

e executa:

```txt
python local_worker.py
```

Se preferir pelo PowerShell:

```powershell
cd C:\terras_raras_local
$env:TERRAS_RARAS_URL="https://web-production-0ce81.up.railway.app"
$env:LOCAL_AI_WORKER_TOKEN="terras-local-worker-eduardo-2026"
$env:OLLAMA_MODEL="llama3.1:8b"
python local_worker.py
```
