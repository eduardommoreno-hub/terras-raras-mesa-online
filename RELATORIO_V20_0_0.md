# RELATÓRIO v20.0.0 — Google OAuth + Asaas + Planos

## Decisão implementada

Fluxo comercial inicial do Terras Raras:

Entrar com Google → criar/entrar em sala → plano Mestre/Família → pagamento Asaas → webhook → liberação automática.

## O que foi adicionado

### Google OAuth
- botão “Entrar com Google” na tela inicial;
- rota `/auth/google/start`;
- rota `/auth/google/callback`;
- criação/atualização automática de usuário;
- login antigo preservado.

### Planos
- plano gratuito;
- plano Mestre/Família;
- painel “Plano da conta” no Hub.

### Asaas
- criação de cobrança em `/billing/checkout`;
- webhook em `/billing/asaas/webhook`;
- liberação automática de `plan` e `premium_until` quando webhook confirma pagamento.

### Banco
Novos campos em `users`:
- `google_id`
- `email`
- `display_name`
- `avatar_url`
- `auth_provider`
- `plan`
- `premium_until`
- `asaas_customer_id`

Novas tabelas:
- `payments`
- `subscriptions`

## Segurança

- login antigo mantido;
- Google OAuth só ativa se variáveis estiverem configuradas;
- Asaas só cria cobrança real se `ASAAS_API_KEY` estiver configurada;
- webhook pode ser protegido com `ASAAS_WEBHOOK_TOKEN`;
- bloqueio de recursos pagos fica desligado por padrão em `ENABLE_BILLING_GATES=false`.

## Próximo teste

1. Rodar local:
   `python main.py`

2. Testar configuração:
   `/auth/config`

3. Testar Google:
   `/auth/google/start`

4. Testar planos:
   `/billing/plans`

5. Testar conta:
   `/billing/me`

