# Terras Raras v19.0 — Floresta Negra Cinematográfica Funcional

## Objetivo
Implementar a primeira etapa do remaster profissional: apenas a Floresta Negra, com mapa cinematográfico funcional real, painel direito dinâmico, cartas filtradas por usuária e token único renderizado por código.

## Backend
- APP_VERSION atualizado para `v19.0-floresta-cinematografica-funcional`.
- `or_` garantido no import do SQLAlchemy.
- `RoomPlayer` recebeu novos campos:
  - `strength`;
  - `skill`;
  - `current_node`.
- `ensure_schema_columns()` migra bancos existentes em SQLite e PostgreSQL.
- `player_dict()` agora expõe:
  - `strength`;
  - `skill`;
  - `current_node`.
- `/rooms/{room_id}/stats` agora aceita:
  - HP;
  - energia;
  - força;
  - habilidade;
  - current_node;
  - x/y.
- Jogadora pode mover o próprio totem por nó; Mestre/Ajudante pode conduzir a mesa.
- `/rooms/{room_id}/cards/send` foi corrigida para não duplicar cartas privadas:
  - carta para uma jogadora cria 1 registro privado;
  - carta para todas cria 1 registro global com `recipient_user_id=None`.
- `/rooms/{room_id}/cards/my` preserva privacidade:
  - cartas privadas da usuária logada;
  - cartas globais.
- `/rooms/{room_id}/diary/timeline` inclui cartas globais para não-staff.

## Frontend
- Floresta Negra não usa mais PNG como base principal do mapa.
- Criado `FOREST_V19_VISUAL` com 13 nós e trilhas em SVG real.
- Criado `renderVisualForestMap()` para montar:
  - fundo cinematográfico SVG;
  - caminhos dourados animados;
  - 13 nós clicáveis;
  - token único por visão.
- Participante vê apenas o próprio token.
- Mestre/Ajudante vê os tokens da mesa.
- Criado `selectVisualNode()` para abrir detalhes reais do local.
- Criado `moveMyToken()` para mover o totem para o nó escolhido.
- Criado `renderVisualRightPanel()` com:
  - carta do totem dinâmica;
  - retrato por personagem;
  - HP;
  - energia;
  - força;
  - habilidade;
  - nível;
  - cartas recebidas da jogadora logada.
- Barra inferior funcional:
  - Inventário;
  - Cartas;
  - Mapa;
  - Missões;
  - Diário.
- Nenhum botão novo é decorativo.

## CSS
- Visual cinematográfico aplicado à Floresta:
  - fundo escuro;
  - bordas douradas;
  - tipografia serif dourada;
  - botões cápsula;
  - carta do totem;
  - mini-cartas;
  - navegação inferior.

## Validação
Executado com sucesso:

```bash
python -m py_compile main.py local_worker.py
node -c script.js
```

Smoke test:

```bash
GET /health -> v19.0-floresta-cinematografica-funcional
```

## Regra consolidada
A arte conceitual define o estilo visual, mas o jogo renderiza conteúdo real por código. O mapa não traz token embutido, carta fixa, painel estático ou dados falsos.
