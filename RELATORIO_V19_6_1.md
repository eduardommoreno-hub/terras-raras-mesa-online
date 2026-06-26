# RELATÓRIO v19.6.1 — Hotfix urgente: barra em funil e painel lateral rolável

## Objetivo
Corrigir imediatamente os problemas de layout detectados na mesa dinâmica da v19.6.

## Correções aplicadas

1. Removida a rolagem horizontal da barra inferior do mapa.
2. A barra inferior agora usa quebra automática em linhas centralizadas, formando um funil visual.
3. Os botões principais ficam todos visíveis abaixo do mapa, sem necessidade de barra de rolagem.
4. O painel lateral voltou a rolar corretamente.
5. O card visual da personagem deixou de ficar fixo/sticky ocupando a lateral em todas as abas.
6. O card visual aparece apenas nas seções em que faz sentido: Mapa e Personagem.
7. Ao abrir Chat, Cartas, Diário, IA, Biblioteca, Eventos etc., a lateral abre limpa e rolável.
8. A área de escolha de função/personagem deixou de ficar esmagada por uma abertura mínima.
9. Mantida a lógica da v19.6: cartas por perfil, Ajudante operacional e narração exclusiva da Mestre.

## Escopo preservado

- Biblioteca de Cartas v19.5 mantida.
- Sistema de cartas por personagem/jogo mantido.
- Permissões de Mestre/Ajudante/Jogadora mantidas.
- Backend preservado.

## Validação

- python -m py_compile main.py local_worker.py
- node -c script.js

