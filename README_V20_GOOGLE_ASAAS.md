# v20.0.0 — Google OAuth + Asaas + Planos

## Variáveis de ambiente

### Google OAuth
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `APP_BASE_URL`

Redirect recomendado:
- local: `http://127.0.0.1:8000/auth/google/callback`
- Railway: `https://SEU-DOMINIO.up.railway.app/auth/google/callback`

### Admin por e-mail
- `ADMIN_EMAILS=seuemail@gmail.com,outro@gmail.com`

### Asaas
- `ASAAS_ENV=sandbox`
- `ASAAS_API_KEY=...`
- `ASAAS_WEBHOOK_TOKEN=um_token_forte`
- `PLAN_MESTRE_FAMILIA_VALUE=19.90`

Webhook no Asaas:
- `https://SEU-DOMINIO.up.railway.app/billing/asaas/webhook?token=SEU_TOKEN`

### Bloqueio comercial opcional
- `ENABLE_BILLING_GATES=false`

Se mudar para `true`, usuários sem plano ativo só poderão criar uma campanha gratuita antes de exigir plano.

## Rotas novas

### Auth
- `GET /auth/config`
- `GET /auth/google/start`
- `GET /auth/google/callback`

### Billing
- `GET /billing/plans`
- `GET /billing/me`
- `POST /billing/checkout`
- `POST /billing/asaas/webhook`

### Admin
- `POST /admin/billing/grant/{user_id}?plan=mestre_familia&days=31`

## Observação

O login antigo por usuário/senha continua funcionando. O Google OAuth é uma camada nova, não substituição forçada.
