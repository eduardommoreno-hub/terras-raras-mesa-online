# RELATÓRIO v19.5 — Biblioteca de Cartas Inicial

## Objetivo
Criar a primeira biblioteca estruturada de cartas do Terras Raras antes de avançar mapa por mapa.

## Conteúdo implementado

- Catálogo técnico em `/assets/cards/catalog.json`.
- 66 cartas iniciais cadastradas:
  - 48 cartas de personagens: 12 personagens × identidade + 3 poderes.
  - 18 cartas da Floresta Negra: pistas, itens, eventos, perigos, missões e especial.
- Assets separados de personagens em `/assets/characters/`.
- Assets separados de cartas em `/assets/cards/characters/` e `/assets/cards/maps/floresta_negra/`.
- Campos novos em cartas enviadas:
  - `catalog_id`
  - `rarity`
  - `image_path`
- Migração leve para bancos existentes.
- Biblioteca da Mestre integrada ao catálogo.
- Modelos rápidos da Floresta Negra passam a usar o catálogo quando disponível.
- Cartas enviadas podem carregar imagem própria no modal e na lista.

## Regras preservadas

- Cartas privadas continuam filtradas por `/cards/my`.
- Cartas globais continuam usando `recipient_user_id = None`.
- Carta privada não é duplicada para outras jogadoras.
- Lógica aprovada da v19.2/v19.3/v19.4 foi preservada.

## Validações

- `python -m py_compile main.py local_worker.py`
- `node -c script.js`

## Versão

`v19.5-biblioteca-cartas-inicial`
