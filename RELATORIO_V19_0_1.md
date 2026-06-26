# Terras Raras v19.0.1 — Hotfix player_dict + privacidade de cartas

## Objetivo
Corrigir os pontos críticos identificados após a auditoria da v19.0, mantendo a Floresta Negra cinematográfica funcional sem alterar o mapa SVG nem o layout visual.

## Correções aplicadas

### 1. player_dict()
A função `player_dict()` agora expõe ao frontend os campos novos do totem:

- `strength`
- `skill`
- `current_node`

Com fallback seguro:

- `strength` padrão 5
- `skill` padrão 7
- `current_node` padrão `entrada`

### 2. /cards/my
A rota `/rooms/{room_id}/cards/my` foi reforçada para usar `current_user_id = int(user.id)` no filtro:

- cartas privadas com `recipient_user_id == current_user_id`
- cartas globais com `recipient_user_id IS NULL`

Também foi adicionado log opcional de diagnóstico, ativável por variável:

```env
DEBUG_CARDS_PRIVACY=true
```

Quando ativo, o backend imprime o `user_id` logado e os `recipient_user_id` das cartas retornadas pela rota.

### 3. Versão/cache
- `APP_VERSION = v19.0.1-hotfix-player-dict`
- `script.js?v=19.0.1`

## Validações

Executadas com sucesso:

```bash
python -m py_compile main.py local_worker.py
node -c script.js
```

## Regra preservada

A Floresta Negra permanece como mapa cinematográfico funcional em SVG real. Nenhum token, carta, retrato ou status é embutido em imagem estática.
