# Terras Raras v18.0.5 — Floresta Negra: Interface Cinematográfica Funcional

## Objetivo
Consolidar o primeiro mapa remasterizado, Floresta Negra, como piloto profissional do novo layout visual, sem transformar arte conceitual em conteúdo estático.

## Correções aplicadas

- Mantido `or_` no import do SQLAlchemy, corrigindo a rota `/cards/my`.
- Painel superior direito da Floresta agora é dinâmico:
  - nome do personagem vem do jogador logado;
  - retrato usa `tokens_sheet_v18.png` por sprite do personagem;
  - HP, energia, quantidade de cartas e itens vêm do estado real;
  - nível é calculado pelo progresso/cartas;
  - clique no retrato abre modal com ficha resumida.
- Bloco inferior do painel mostra a carta mais recente do usuário logado via `/cards/my`.
- Mestre não vê cartas privadas de jogadoras; vê placeholder seguro.
- Botão "Diário de Jornada" abre Diário Visual.
- Botão da carta abre modal da carta real.
- Botão "Ver todas" abre aba Cartas.
- Barra inferior mantém 5 atalhos funcionais: Inventário, Cartas, Mapa, Missões e Diário.
- Token da Floresta continua pequeno e renderizado pelo código.
- Participante vê apenas o próprio token no mapa; Mestre/Ajudante veem os tokens da mesa.
- Asset `floresta_negra_v18_map_only.png` foi limpo para remover resíduo visual de token estático.

## Regra consolidada

A arte conceitual define estilo. O conteúdo exibido vem dos dados reais do usuário logado. Nenhum retrato, carta, status, missão ou token deve vir fixo dentro da imagem.

## Validações

- `python -m py_compile main.py local_worker.py`
- `node -c script.js`

## Versão

`v18.0.5-floresta-interface-funcional`
