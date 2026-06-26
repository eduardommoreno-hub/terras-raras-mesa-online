# RELATÓRIO v19.6.11.33 — Mestre/Ajudante sem personagem

## Regra canônica reforçada

Mestre e Ajudante não têm:

- personagem;
- ficha própria;
- token próprio;
- jornada de personagem;
- cartas privadas de personagem.

Somente jogadoras possuem personagens e tokens.

## Correções aplicadas no frontend

1. Para Mestre/Ajudante, a barra inferior não mostra:
   - Personagem
   - Jornada

2. Se Mestre/Ajudante tentarem abrir:
   - Personagem → redireciona para Jogadoras
   - Jornada → redireciona para Missões

3. O cartão visual lateral da Mestre/Ajudante não mostra mais ficha/personagem.
   Agora mostra:
   - função na mesa;
   - aviso “sem personagem, sem ficha e sem token próprio”;
   - atalhos de condução da mesa.

4. A seção de escolha de personagem fica sempre oculta para Mestre/Ajudante.

5. A função `chooseChar()` reforça o bloqueio visual antes mesmo de chegar ao backend.

## Backend

O backend já estava correto:
- `player_dict()` não exibe personagem de Mestre/Ajudante;
- `/choose-character` bloqueia papel diferente de participante;
- `/assign-character` bloqueia personagem para Mestre/Ajudante;
- `/move-token` só move tokens de participantes com personagem.

## Segurança

- sem alteração no banco;
- sem alteração no worker;
- sem alteração em Railway/Ollama;
- sem alteração de IDs;
- correção visual e de regra de interface.
