# Terras Raras v18.0.2 — Hotfix Visual: privacidade e painel dinâmico

Correções:

- Removido o painel direito estático da imagem de fundo da Floresta Negra.
- Criado asset `floresta_negra_v18_map_only.png` apenas com o mapa, sem carta aberta e sem retrato estático.
- Token duplicado corrigido: a imagem não traz mais token fixo visível e o render de tokens no remaster usa dados reais.
- Participantes veem apenas o próprio token no mapa remasterizado. Mestre/Ajudante continuam vendo os tokens da mesa.
- Painel visual do personagem passou a ser dinâmico, montado a partir de `state.me` / `state.players`, com nome, avatar, HP, energia e nível aproximado.
- Área de cartas privadas agora mostra placeholder seguro e botão “Ver minhas cartas”; não revela carta privada no painel compartilhado.
- Consulta `/cards/my` agora aceita cartas do usuário logado e cartas globais futuras com `recipient_user_id IS NULL`.
- Cache atualizado para `script.js?v=18.0.2`.

Regra preservada:

> A arte conceitual define o estilo visual. O conteúdo exibido vem dos dados reais do usuário logado.
