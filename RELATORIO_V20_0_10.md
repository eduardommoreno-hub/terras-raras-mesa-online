# RELATÓRIO v20.0.10 — Modal de login compacto

## Problema observado no vídeo

A v20.0.9 corrigiu o problema da tela branca, mas o modal ficou alto demais quando o usuário clicava em:

`Entrar com usuário e senha`

O formulário descia para baixo da tela e ficava parcialmente cortado.

## Correções

1. O modal agora tem altura máxima:
   `calc(100vh - 56px)`

2. O conteúdo interno do modal passa a rolar dentro do próprio card se necessário.

3. No desktop, os provedores de login ficam em grade 2x2:
   - Google
   - iOS / Apple
   - Android
   - Discord

4. O cabeçalho ficou mais compacto:
   - símbolo menor
   - título menor
   - marca menor

5. A caixa de login normal ficou mais compacta.

6. Ao abrir o login normal, o formulário rola suavemente para dentro da área visível.

## Resultado esperado

O modal continua bonito, mas agora cabe melhor na tela.

## Segurança

- sem alterar banco;
- sem alterar OAuth;
- sem alterar Asaas;
- sem remover login normal;
- apenas ajuste visual/responsivo do modal.
