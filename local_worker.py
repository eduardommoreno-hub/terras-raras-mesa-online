"""
Terras Raras — Worker Local de IA zero custo por chamada.

Roda no seu computador, busca pedidos pendentes no Railway e usa Ollama local.

Uso:
  1) Instale Ollama e rode: ollama pull llama3.1:8b
  2) Defina as variáveis abaixo ou edite os valores padrão.
  3) Execute: python local_worker.py
"""
import json
import os
import time
import urllib.parse
import urllib.request

RAILWAY_URL = os.getenv("TERRAS_RARAS_URL", "https://web-production-0ce81.up.railway.app").rstrip("/")
WORKER_TOKEN = os.getenv("LOCAL_AI_WORKER_TOKEN", "terras-local-worker-eduardo-2026")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "5"))


def request_json(method: str, url: str, payload=None, timeout=60):
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def ollama_generate(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.75,
            "num_ctx": 8192,
        },
    }
    data = request_json("POST", f"{OLLAMA_URL}/api/generate", payload, timeout=180)
    return (data.get("response") or "").strip()


def main():
    print("Terras Raras — Worker Local IA")
    print(f"Railway: {RAILWAY_URL}")
    print(f"Ollama:  {OLLAMA_URL}")
    print(f"Modelo:  {OLLAMA_MODEL}")
    print("Aguardando pedidos... Ctrl+C para encerrar.\n")
    if not WORKER_TOKEN:
        print("ATENÇÃO: LOCAL_AI_WORKER_TOKEN não configurado.")

    token_q = urllib.parse.urlencode({"token": WORKER_TOKEN})
    while True:
        try:
            nxt = request_json("GET", f"{RAILWAY_URL}/ai/jobs/next?{token_q}", timeout=30)
            job = nxt.get("job")
            if not job:
                time.sleep(POLL_SECONDS)
                continue

            print(f"Processando job #{job['id']} ({job['job_type']})...")
            try:
                result = ollama_generate(job["prompt"])
                if not result:
                    raise RuntimeError("Ollama retornou resposta vazia")
                request_json(
                    "POST",
                    f"{RAILWAY_URL}/ai/jobs/{job['id']}/complete?{token_q}",
                    {"status": "done", "result": result},
                    timeout=60,
                )
                print(f"Job #{job['id']} concluído.\n")
            except Exception as e:
                request_json(
                    "POST",
                    f"{RAILWAY_URL}/ai/jobs/{job['id']}/complete?{token_q}",
                    {"status": "error", "error": str(e)},
                    timeout=60,
                )
                print(f"Erro no job #{job['id']}: {e}\n")
        except KeyboardInterrupt:
            print("Encerrado pelo usuário.")
            break
        except Exception as e:
            print(f"Aguardando... erro temporário: {e}")
            if "401" in str(e):
                print("DICA: token inválido. Confira LOCAL_AI_WORKER_TOKEN no Railway e no PowerShell.")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
