# Terras Raras v19.4 — Hub premium com personagens reais

## Objetivo
Aplicar a primeira etapa visual após a aprovação da v19.3.1: transformar o Hub em uma tela mais vendável, usando os 6 personagens reais como cards visuais separados.

## Alterações
- Adicionados assets individuais em `/assets/characters/`:
  - `katrina_card.webp`
  - `lina_card.webp`
  - `mira_card.webp`
  - `theo_card.webp`
  - `naya_card.webp`
  - `cael_card.webp`
- Incluídos Theo e Cael como personagens oficiais do jogo.
- Atualizada a seed para personagens canônicos:
  - Katrina
  - Lina
  - Mira
  - Theo
  - Naya
  - Cael
- `/characters` agora retorna os personagens canônicos na ordem visual correta.
- `char_dict()` agora inclui `card_url` para o frontend carregar imagem separada.
- Hub renderiza cards premium com arte real, nome, classe, zona e descrição.
- Mantida a lógica aprovada da v19.3.1/v19.2.

## Não alterado
- Lógica de tokens livres.
- Ajudante técnica.
- Permissões.
- WebSocket.
- Mapas e campanha.

## Validações
- `python -m py_compile main.py local_worker.py`
- `node -c script.js`

## Versão
`v19.4-hub-premium-personagens-reais`
