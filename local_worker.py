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
import re
import time
import urllib.parse
import urllib.request

RAILWAY_URL = os.getenv("TERRAS_RARAS_URL", "http://127.0.0.1:8000").rstrip("/")
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


def prompt_mode(prompt: str) -> tuple[str, str]:
    mode = "short"
    m = re.search(r"\[\[TR_RESPONSE_MODE=(short|normal|detailed)\]\]", prompt or "")
    if m:
        mode = m.group(1)
        prompt = re.sub(r"\[\[TR_RESPONSE_MODE=(short|normal|detailed)\]\]\s*", "", prompt, count=1)
    return mode, prompt

def generation_options(job_type: str, mode: str) -> dict:
    # Limites menores deixam o Ollama mais rápido em computadores modestos.
    limits = {
        "short": {"question": 160, "narrative": 220, "summary": 240, "image_prompt": 180},
        "normal": {"question": 260, "narrative": 360, "summary": 420, "image_prompt": 260},
        "detailed": {"question": 450, "narrative": 620, "summary": 700, "image_prompt": 360},
    }
    num_predict = limits.get(mode, limits["short"]).get(job_type, 260)
    return {
        "temperature": 0.72,
        "num_ctx": 4096 if mode == "short" else 8192,
        "num_predict": num_predict,
    }

def ollama_generate(prompt: str, job_type: str = "narrative") -> str:
    mode, clean_prompt = prompt_mode(prompt)
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": clean_prompt,
        "stream": False,
        "options": generation_options(job_type, mode),
    }
    timeout = 120 if mode == "short" else 220
    data = request_json("POST", f"{OLLAMA_URL}/api/generate", payload, timeout=timeout)
    return (data.get("response") or "").strip()


def ping_worker(token_q: str):
    try:
        request_json(
            "POST",
            f"{RAILWAY_URL}/ai/worker/ping?{token_q}",
            {"model": OLLAMA_MODEL, "ollama_url": OLLAMA_URL},
            timeout=10,
        )
    except Exception:
        pass


def preflight():
    print("\nDiagnóstico inicial:")
    if RAILWAY_URL.startswith("http://127.0.0.1") or RAILWAY_URL.startswith("http://localhost"):
        print("  MODO LOCAL: o worker vai atender somente o servidor local.")
        print("  Para atender o Railway, defina TERRAS_RARAS_URL=https://SEU-APP.up.railway.app")
    else:
        print("  MODO ONLINE: o worker vai buscar pedidos no Railway.")
    try:
        status = request_json("GET", f"{RAILWAY_URL}/health", timeout=10)
        print(f"  Servidor OK: {status.get('version')}")
    except Exception as e:
        print(f"  Servidor não respondeu em {RAILWAY_URL}: {e}")
    try:
        token_q = urllib.parse.urlencode({"token": WORKER_TOKEN})
        ping_worker(token_q)
        status = request_json("GET", f"{RAILWAY_URL}/ai/worker/status", timeout=10)
        print(f"  Worker reconhecido pelo servidor: online={status.get('online')} modelo={status.get('model')}")
    except Exception as e:
        print(f"  Ping do worker falhou. Verifique LOCAL_AI_WORKER_TOKEN: {e}")
    try:
        request_json("POST", f"{OLLAMA_URL}/api/generate", {
            "model": OLLAMA_MODEL,
            "prompt": "Responda apenas: ok",
            "stream": False,
            "options": {"num_predict": 4}
        }, timeout=30)
        print("  Ollama respondeu.")
    except Exception as e:
        print(f"  Ollama não respondeu em {OLLAMA_URL}. Abra o Ollama e confira o modelo {OLLAMA_MODEL}: {e}")
    print("")


def main():
    print("Terras Raras — Worker Local IA")
    print(f"Railway: {RAILWAY_URL}")
    print(f"Ollama:  {OLLAMA_URL}")
    print(f"Modelo:  {OLLAMA_MODEL}")
    print("Aguardando pedidos... Ctrl+C para encerrar.\n")
    preflight()
    if not WORKER_TOKEN:
        print("ATENÇÃO: LOCAL_AI_WORKER_TOKEN não configurado.")

    token_q = urllib.parse.urlencode({"token": WORKER_TOKEN})
    while True:
        try:
            ping_worker(token_q)
            nxt = request_json("GET", f"{RAILWAY_URL}/ai/jobs/next?{token_q}", timeout=30)
            job = nxt.get("job")
            if not job:
                time.sleep(POLL_SECONDS)
                continue

            print(f"Processando job #{job['id']} ({job['job_type']})...")
            preview = (job.get("prompt") or "").replace("\n", " ")[:700]
            print(f"Prompt enviado ao Ollama (prévia): {preview}...")
            try:
                result = ollama_generate(job["prompt"], job.get("job_type", "narrative"))
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
