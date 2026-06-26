# RELATÓRIO v19.6.11.28 — Floresta Negra: Cartas Cinematográficas Integradas

## Status
Integração segura das 18 cartas cinematográficas aprovadas da Floresta Negra.

## O que foi feito
- adicionadas 18 artes `.webp` em `assets/cards/floresta_negra/`
- criado `baralho_floresta_negra.json`
- criado `manifest.json`
- criado `BARALHO_FLORESTA_NEGRA.md`
- copiado `assets/lore/floresta_negra/registro_canonico.md`
- adicionada constante não destrutiva em `main.py`
- adicionados dados em `index.html`
- adicionadas funções auxiliares em `script.js`

## Segurança
- sem alteração no banco
- sem alteração no worker
- sem alteração em Railway/Ollama
- sem mudança de IDs existentes da Fábrica
- sem quebra da lógica do sistema

## Funções auxiliares adicionadas
- `get_floresta_negra_card(card_id=None)`
- `window.getFlorestaNegraCard(cardId)`
- `window.getFlorestaNegraCardsByLocation(locationN)`

## Quantidade integrada
18 cartas cinematográficas da Floresta Negra.
