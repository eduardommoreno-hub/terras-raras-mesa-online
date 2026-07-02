# RELATÓRIO v20.0.9 — OAuth sem tela branca

## Problema visto no vídeo

Ao clicar em “Continuar com Google”, o navegador saía do jogo e abria:

`/auth/google/start`

Como o Google OAuth ainda não estava configurado, aparecia uma tela branca com JSON:

`Google OAuth ainda não configurado no servidor`

## Correção

Agora o clique nos provedores é interceptado antes do redirecionamento:

- se Google não estiver configurado, mostra aviso dentro do modal;
- se Discord não estiver configurado, mostra aviso dentro do modal;
- se Apple ainda não estiver configurado, mostra aviso dentro do modal;
- Android só funciona quando Google estiver configurado;
- não sai mais para uma página branca de erro.

## Backend

As rotas também foram protegidas com página amigável:

- `/auth/google/start`
- `/auth/discord/start`
- `/auth/apple/start`

Se acessadas diretamente sem configuração, mostram página estilizada de Terras Raras em vez de JSON cru.

## Login normal

Permanece funcional dentro do modal.

## Variáveis necessárias para ativar Google

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Variáveis necessárias para ativar Discord

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
