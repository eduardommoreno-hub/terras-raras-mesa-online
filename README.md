# Terras Raras — v7 IA organizada

Versão baseada na v6, mantendo:

- Railway + PostgreSQL
- login com admin por variáveis
- cadastro com aprovação
- sala com código
- sair da sala
- mapa com tokens arrastáveis
- IA local zero API via Ollama + `local_worker.py`

## O que mudou na v7

A resposta da IA local agora não entra automaticamente no chat.
Ela aparece em uma área própria: **Respostas da IA**.

A Mestre escolhe depois:

- **Salvar no Diário**
- **Enviar ao Chat**

Também foram aumentadas as fontes da área de narrativa/IA e o painel lateral ficou mais largo.

## Variáveis necessárias no Railway

```txt
ADMIN_USERNAME=eduardo
ADMIN_PASSWORD=sua_senha
JWT_SECRET=um_segredo_grande
DATABASE_URL=postgresql://...
LOCAL_AI_WORKER_TOKEN=terras-local-worker-eduardo-2026
```

## Worker local

No PowerShell, na pasta do projeto:

```powershell
$env:TERRAS_RARAS_URL="https://web-production-0ce81.up.railway.app"
$env:LOCAL_AI_WORKER_TOKEN="terras-local-worker-eduardo-2026"
$env:OLLAMA_MODEL="llama3.1:8b"
python local_worker.py
```

Deixe essa janela aberta.
