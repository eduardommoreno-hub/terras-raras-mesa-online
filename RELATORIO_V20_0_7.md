# RELATÓRIO v20.0.7 — Fix landing aprovada visível

## Problema

Na v20.0.6, a arte aprovada foi aplicada como background CSS.
Em alguns testes, a página ficou preta porque:

- imagens antigas da landing foram escondidas;
- o botão novo era invisível;
- se o background da arte aprovada não carregasse, só sobrava o fundo preto.

## Correção

A arte aprovada agora é inserida como imagem real:

- `assets/ui/landing_terras_raras_v20_0_7_aprovada.png`
- `assets/ui/landing_terras_raras_v20_0_7_aprovada.webp`

Também foi adicionado fallback embutido em data URI para evitar tela preta caso `/assets` falhe.

## Resultado esperado

A primeira tela deve mostrar a arte aprovada normalmente.

O botão desenhado na própria imagem continua visualmente igual, mas agora existe uma área clicável invisível sobre ele.

Ao clicar, abre o modal com:

- Google
- iOS / Apple
- Android
- Discord
- usuário e senha

## Observação

Se o navegador ainda mostrar tela antiga ou preta, usar Ctrl+F5.
