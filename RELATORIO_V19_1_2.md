# Terras Raras v19.1.2 — Polimento visual da Floresta Premium

Correções aplicadas:

- Caixa de ajuda do mapa virou aba recolhível, fechada por padrão, com botão `?`.
- Token reposicionado para âncoras próprias sobre a trilha, não sobre placas ou nomes dos locais.
- Nome fixo do token no mapa foi removido; fica apenas no `title`/hover.
- Movimento do token passa a gravar coordenadas de âncora visual da trilha.
- Hotspots ficaram discretos: só aparecem com brilho suave no hover/ativo.
- Grade de botões do painel foi reorganizada em grupos: Jogo, Mesa e Mestre.
- Escala geral da Floresta reduzida: painel menor, botões menores, mapa com `object-fit: contain` para reduzir sensação de zoom.
- Cache atualizado para `script.js?v=19.1.2` e asset do mapa `v=19.1.2`.

Validação:

- `node -c script.js`
- `python -m py_compile main.py local_worker.py`

Versão:

- `v19.1.2-polimento-floresta-premium`
