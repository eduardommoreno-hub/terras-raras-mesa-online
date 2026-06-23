# Terras Raras — v6 Local AI Zero API

Esta versão mantém o jogo no Railway e adiciona um início de **IA local sem custo por chamada**.

## O que foi adicionado

- Painel **IA Local · Zero API** dentro da sala, visível para Mestre/admin.
- Botões:
  - **Narrar**: gera narração da cena.
  - **Resumo**: gera resumo da sessão.
  - **Criar prompt de imagem**: gera prompt para Stable Diffusion/ComfyUI.
- Fila de trabalhos no banco `ai_jobs`.
- Worker local `local_worker.py`, que roda no seu computador e usa **Ollama**.

## Como funciona

1. A Mestre cria um pedido de narração no jogo.
2. O pedido fica salvo no PostgreSQL do Railway.
3. Seu computador, rodando `local_worker.py`, busca o pedido.
4. O worker chama o Ollama local.
5. O resultado volta para o jogo e aparece no chat/diário.

Assim, não há cobrança de OpenAI/Claude/Gemini por clique.

## Arquivos para subir no GitHub/Railway

Substitua no repositório:

```txt
main.py
index.html
requirements.txt
Procfile
railway.json
README.md
```

O arquivo `local_worker.py` é para rodar no seu computador, não no Railway.

## Variáveis no Railway

Além das variáveis já existentes:

```txt
ADMIN_USERNAME=eduardo
ADMIN_PASSWORD=sua_senha
JWT_SECRET=um_segredo_grande
DATABASE_URL=postgresql://...
```

Adicione:

```txt
LOCAL_AI_WORKER_TOKEN=uma_senha_para_o_worker_local
```

Exemplo:

```txt
LOCAL_AI_WORKER_TOKEN=terras-local-worker-eduardo-2026
```

Use o mesmo valor no seu computador.

## Rodar Ollama local

Instale o Ollama e baixe um modelo:

```bash
ollama pull llama3.1:8b
```

Depois deixe o Ollama aberto/rodando.

## Rodar o worker local

No seu computador, na pasta do projeto:

### Windows PowerShell

```powershell
$env:TERRAS_RARAS_URL="https://web-production-0ce81.up.railway.app"
$env:LOCAL_AI_WORKER_TOKEN="terras-local-worker-eduardo-2026"
$env:OLLAMA_MODEL="llama3.1:8b"
python local_worker.py
```

### Mac/Linux

```bash
export TERRAS_RARAS_URL="https://web-production-0ce81.up.railway.app"
export LOCAL_AI_WORKER_TOKEN="terras-local-worker-eduardo-2026"
export OLLAMA_MODEL="llama3.1:8b"
python local_worker.py
```

## Imagens

Nesta v6, o jogo gera **prompt de imagem** local via Ollama. A geração real da imagem com ComfyUI/Stable Diffusion fica para a próxima fase, para não complicar antes de estabilizar narrativa + fila local.
