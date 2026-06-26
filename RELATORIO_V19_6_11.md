# Terras Raras — Mesa Online
## v19.6.11 — Papéis reais de RPG e códigos separados

Prioridade desta versão: corrigir a lógica de RPG indicada pela Maria Julia.

## Regra principal

- Mestre controla o mundo, não joga com personagem.
- Ajudante ajuda a Mestre, não joga com personagem.
- Jogadoras controlam personagens.
- Só jogadoras têm personagem/token.
- Só Mestre e Ajudante movem tokens.

## Backend

- `APP_VERSION` atualizado para `v19.6.11-rpg-papeis-codigos`.
- Sala nova agora gera dois códigos:
  - `helper_code`: código da Ajudante, formato `AJU-XXXX`.
  - `code` / `player_code`: código das Jogadoras, formato `JOG-XXXX`.
- Criadora da sala entra sempre como `mestre`.
- Mestre entra com `character_id = None`.
- Ajudante entra com `character_id = None`.
- Jogadora entra inicialmente com `character_id = None`, para escolher personagem depois.
- `/rooms/join` ignora o papel enviado pelo frontend e define o papel pelo código usado.
- `/rooms/{room_id}/choose-character` bloqueia Mestre/Ajudante.
- `/rooms/{room_id}/assign-character` bloqueia atribuição para Mestre/Ajudante.
- `player_dict` não exibe personagem para Mestre/Ajudante, mesmo se existir lixo legado no banco.
- `room_players_count` conta apenas participantes/jogadoras.
- `/rooms/{room_id}/move-token` permite movimento apenas para Mestre/Ajudante/admin.
- Jogadora não move nem o próprio token nesta versão.
- Movimento por `/stats` também respeita `staff_only`.
- Envio de carta para pessoa específica exige jogadora participante com personagem escolhido.
- Migração leve adicionada para `helper_code` em SQLite e Postgres/Railway.

## Frontend

- Tela de criação não pede mais papel.
- Tela de entrada não pede mais papel.
- Campo único de código: `JOG-XXXX` ou `AJU-XXXX`.
- Após criar sala, aparece alerta com Código da Ajudante e Código das Jogadoras.
- Hub mostra o código das Jogadoras; para Mestre/Ajudante também mostra o código da Ajudante.
- Painel de função informa:
  - Mestre sem personagem/token.
  - Ajudante sem personagem/token.
  - Jogadora escolhe personagem.
- Aba de escolher personagem é ocultada para Mestre/Ajudante.
- Mapa renderiza tokens apenas de jogadoras participantes com personagem.
- Arrastar tokens no mapa só funciona para Mestre/Ajudante.
- Ao clicar em local, Mestre/Ajudante escolhem qual token de jogadora mover.
- Lista de jogadoras separa Equipe de condução e Jogadoras.
- Central de Cartas lista apenas jogadoras com personagem como destinatárias.
- Cache atualizado para `v19.6.11`.

## Testes executados

```bash
python -m py_compile main.py local_worker.py
node -c script.js
python -c "import main; print(main.APP_VERSION)"
python -c "import json; json.load(open('assets/cards/catalog.json', encoding='utf-8')); print('catalog ok')"
```

Resultado: todos passaram.

Também foi executado teste com FastAPI/TestClient validando:

1. Criação da sala como Mestre, sem personagem, `tokens_used = 0`, com `AJU-XXXX` e `JOG-XXXX`.
2. Entrada com código da Ajudante como `ajudante`, sem personagem.
3. Bloqueio de escolha de personagem pela Ajudante.
4. Entrada com código das Jogadoras como `participante`, sem personagem inicial.
5. Jogadora escolhe personagem e token passa a existir.
6. Ajudante move token da jogadora.
7. Jogadora é bloqueada ao tentar mover o próprio token.
8. Jogadora é bloqueada ao tentar mover token de outra jogadora.

Resultado: `TESTCLIENT_FINAL_OK`.

## Observação

Não foram criadas novas cartas, mapas ou imagens. As cartas cinematográficas, overlays, biblioteca, eventos, inventário, IA local e cache-busting foram preservados.

Ainda falta validação visual manual no navegador para confirmar a experiência de clique/arraste na interface real.
