# Terras Raras v19.6.10.1 — Correção de cache das cartas cinematográficas

## Problema encontrado

As 48 imagens novas estavam dentro do ZIP e o `catalog.json` apontava para elas, mas dois pontos ainda prendiam o navegador na versão antiga:

1. `index.html` carregava `script.js?v=19.6.6`.
2. `loadCardCatalog()` ainda buscava `catalog.json?v=19.6.6&t=0`.

Isso podia fazer o navegador usar JavaScript/catálogo em cache, mantendo as cartas antigas na tela.

## Correção

- `index.html` agora carrega `script.js?v=19.6.10.1`.
- `loadCardCatalog()` agora busca `catalog.json?v=19.6.10.1&t=Date.now()`.
- imagens de cartas usam `?v=19.6.10.1`.
- backend atualizado para `v19.6.10.1-cache-cartas-cinematicas`.
- função interna `trReloadCardCatalogV196101()` adicionada para recarregar o catálogo em sessão.

## Validação

- 48 cartas de personagem no catálogo.
- 48 imagens encontradas.
- 0 imagens faltando.
- Sintaxe Python e JavaScript validada.
