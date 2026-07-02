# RELATÓRIO v20.0.1 — Hub com abas: Sessão, Planos, Cadastros e Segurança

## Problema

O Hub estava acumulando funções demais na lateral:

- criar sala;
- entrar com código;
- autorizar cadastros;
- alertas de segurança;
- plano da conta;
- cobrança/assinatura.

Isso deixava a tela poluída e confundia funções de jogo, conta e administração.

## Correção

A lateral do Hub agora é organizada em abas:

### Sessão
- Criar mesa
- Entrar com código

### Planos
- Plano da conta
- Status premium/gratuito
- Ativar plano Mestre/Família
- Atualizar plano

### Cadastros — apenas admin
- Autorizar cadastros pendentes
- Listar usuários
- Liberar plano manualmente por e-mail ou usuário
- Definir plano e quantidade de dias

### Segurança — apenas admin
- Alertas de segurança
- Ações administrativas

## Backend novo

### `GET /admin/users`
Lista usuários para o admin.

### `POST /admin/billing/grant-access`
Libera plano manualmente por:

- `user_id`
- `email`
- `username`

Exemplo de corpo:

```json
{
  "email": "usuario@gmail.com",
  "plan": "mestre_familia",
  "days": 31
}
```

## Segurança

- As abas Admin só aparecem para `me.is_admin`.
- A liberação manual exige `admin_user`.
- O fluxo antigo continua funcionando.
- O login Google e Asaas da v20.0.0 foram preservados.
