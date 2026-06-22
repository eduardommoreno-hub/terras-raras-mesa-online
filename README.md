# Terras Raras — Mesa Online v5

Correções incluídas:

- Login admin corrigido definitivamente.
- Se `ADMIN_USERNAME` e `ADMIN_PASSWORD` baterem, o admin é criado/atualizado no banco na hora do login.
- Frontend não fica preso na tela de login após sucesso: ele muda para o Hub e carrega as mesas.
- Mantém a função **Sair da sala**.
- Endpoint de debug: `/debug/admin-env`.

Variáveis Railway obrigatórias:

```txt
ADMIN_USERNAME=eduardo
ADMIN_PASSWORD=Mj140911
JWT_SECRET=terras-raras-chave-secreta-2026-eduardomoreno
DATABASE_URL=postgresql://...
```

Deploy:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```
