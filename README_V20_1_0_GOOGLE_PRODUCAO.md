# v20.1.0 — Preparação Google OAuth e Produção

## Objetivo

Esta versão não muda a estética aprovada. Ela prepara a landing e o login para produção.

## O que foi feito

1. Landing otimizada:
   - `assets/ui/landing_suw_terras_raras_v20_1_0.webp`
   - `assets/ui/landing_suw_terras_raras_v20_1_0_light.webp`
   - `assets/ui/landing_suw_terras_raras_v20_1_0.png`

2. Nova rota segura:
   - `/tr-assets/landing`

3. Diagnóstico OAuth:
   - `/auth/diagnostics`

4. `.env.example` criado.

5. Modal mostra o redirect URI necessário para configurar Google.

## Como configurar Google OAuth local

No Google Cloud Console:

1. Criar projeto.
2. APIs e Serviços → Tela de consentimento OAuth.
3. Criar credenciais → ID do cliente OAuth.
4. Tipo: Aplicativo da Web.
5. Em URIs de redirecionamento autorizados, adicionar:

```text
http://127.0.0.1:8000/auth/google/callback
```

6. Copiar:
   - Client ID
   - Client Secret

7. Criar ou atualizar `.env`:

```text
APP_BASE_URL=http://127.0.0.1:8000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
```

8. Reiniciar:

```bash
python main.py
```

9. Abrir:

```text
http://127.0.0.1:8000/auth/diagnostics
```

## Railway

Adicionar no Google Cloud:

```text
https://SEU-DOMINIO.up.railway.app/auth/google/callback
```

No Railway:

```text
APP_BASE_URL=https://SEU-DOMINIO.up.railway.app
GOOGLE_REDIRECT_URI=https://SEU-DOMINIO.up.railway.app/auth/google/callback
```

## Observação

O login por usuário/senha continua funcionando mesmo sem Google.
