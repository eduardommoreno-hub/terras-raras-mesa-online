# RELATÓRIO v20.1.1 — Fix Header Import

## Problema

Ao rodar:

```bash
python main.py
```

aparecia:

```text
NameError: name 'Header' is not defined
```

## Causa

A v20.1.0 adicionou a rota `/auth/diagnostics` usando:

```python
Header(None)
```

mas o `Header` não estava importado do FastAPI.

## Correção

Adicionado `Header` ao import:

```python
from fastapi import ..., Header
```

## Escopo

- sem alteração visual;
- sem alteração de banco;
- sem alteração de OAuth;
- sem alteração de Asaas;
- apenas correção de import para o servidor voltar a iniciar.
