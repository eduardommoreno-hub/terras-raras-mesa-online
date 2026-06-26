# RELATÓRIO v19.6.2 — Cartas/Eventos em Overlay Visual

## Objetivo
Corrigir os bugs observados no vídeo da v19.6.1 e melhorar a experiência de escolha de cartas/eventos.

## Correções
- Adicionado `user_id` no `player_dict`, corrigindo envio de carta para jogadora específica.
- Cartas/Eventos/Biblioteca agora abrem em painel amplo sobre o mapa.
- Após enviar uma carta, o overlay fecha e o mapa volta a ser principal.
- Imagens de cartas com acentos no nome do arquivo passam a usar `encodeURI`, evitando imagens quebradas.
- Cartas aparecem com imagem grande, tipo, raridade, origem e efeito/texto.
- Mestre/Ajudante veem cartas de personagem e cartas de jogo em visão ampla.
- Jogadora vê suas cartas em visão ampla.
- Eventos/Biblioteca passam a usar visão visual ampla, evitando botões pequenos presos na lateral.

## Mantido
- Backend de cartas v19.6.
- Permissões Mestre/Ajudante.
- Narração exclusiva da Mestre.
- Token livre.
- Painel lateral dinâmico para ferramentas menores.

## Validação
- `python -m py_compile main.py local_worker.py`
- `node -c script.js`
