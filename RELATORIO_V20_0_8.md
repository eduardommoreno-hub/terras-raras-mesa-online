# RELATÓRIO v20.0.8 — Fix definitivo landing + clique + modal

## Problema visto no vídeo

A imagem aprovada aparecia e depois sumia para tela preta.

Causa:
- scripts antigos da v20.0.6 ainda escondiam imagens dentro da landing;
- a v20.0.7 inseria a imagem, mas uma rotina antiga voltava a escondê-la;
- o botão clicável dependia de uma área invisível muito específica e não funcionou bem.

## Correção

A v20.0.8 cria uma camada nova e única para a tela inicial:

1. Insere a arte aprovada como imagem real.
2. Usa fallback embutido em base64 para evitar falha de `/assets`.
3. Esconde todos os elementos antigos da landing, exceto a arte aprovada e a camada clicável.
4. Cria uma camada clicável sobre toda a tela inicial.
5. Qualquer clique na landing abre o modal.
6. Cria um modal próprio v20.0.8, independente dos modais antigos.

## Modal v20.0.8

Inclui:

- Google
- iOS / Apple
- Android
- Discord
- usuário e senha

## Segurança

- login normal continua funcionando via `/auth/login`;
- Google continua usando `/auth/google/start`;
- Android usa `/auth/android/start`;
- Discord usa `/auth/discord/start`;
- Apple usa `/auth/apple/start`;
- sem mexer no banco;
- sem mexer no Asaas;
- sem remover login legado.

## Observação

Após instalar, usar Ctrl+F5.
