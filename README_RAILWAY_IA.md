# Terras Raras — v19.6.11.15 Railway Assets + IA Worker

## Correção online/Railway

Esta versão corrige o carregamento de imagens/assets em produção usando caminho absoluto no `main.py`:

```python
BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
```

Isso evita que o Railway suba o app em outro diretório e não encontre `/assets`.

## IA online com Ollama local

O Ollama roda no seu computador, não dentro do Railway.

Então, para a IA funcionar online, o servidor Railway cria pedidos de IA e o `local_worker.py`, rodando no seu computador, busca esses pedidos no Railway, processa no Ollama local e devolve a resposta.

No Windows PowerShell:

```powershell
setx TERRAS_RARAS_URL "https://web-production-0ce81.up.railway.app"
setx LOCAL_AI_WORKER_TOKEN "COLOQUE_AQUI_O_MESMO_TOKEN_DO_RAILWAY"
setx OLLAMA_URL "http://127.0.0.1:11434"
setx OLLAMA_MODEL "llama3.1:8b"
```

Depois feche e abra o PowerShell novamente e rode:

```powershell
python local_worker.py
```

Ou edite e use o arquivo:

```txt
RUN_WORKER_RAILWAY.bat
```

## Importante

A variável `LOCAL_AI_WORKER_TOKEN` precisa ser a mesma no Railway e no seu computador.
