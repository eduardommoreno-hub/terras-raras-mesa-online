# RELATÓRIO v20.0.6 — Landing aprovada + modal multilogin

## Arte aplicada

A arte aprovada foi aplicada diretamente na primeira tela:

- `assets/ui/landing_terras_raras_v20_0_6_aprovada.png`
- `assets/ui/landing_terras_raras_v20_0_6_aprovada.webp`

O botão visível já faz parte da arte. O sistema coloca apenas uma área clicável invisível sobre ele.

## Modal de login

Ao clicar em “ATRAVESSAR O PORTAL”, abre modal com:

- Google
- iOS / Apple
- Android
- Discord
- usuário e senha

## Status técnico dos logins

### Google
Já usa o fluxo OAuth da v20.

### Android
Redireciona para Google, porque a identidade natural do Android é Conta Google.

### Discord
Backend preparado com:
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`

Rotas:
- `/auth/discord/start`
- `/auth/discord/callback`

### Apple / iOS
Botão e rota visual preparados:
- `/auth/apple/start`

Ainda exige configuração posterior do Apple Sign In.

### Usuário e senha
Preservado dentro do modal como login normal/legado.

## Segurança

- sem remover login antigo;
- sem quebrar Google OAuth;
- sem alterar Asaas;
- sem alterar banco além da estrutura já existente da v20;
- Discord reaproveita o campo de identidade externa com prefixo `discord:`.
