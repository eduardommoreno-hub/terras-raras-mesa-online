# Terras Raras v19.2 — Mesa leve: tokens, ajudante e anotações

## Objetivo
Implementar as primeiras modificações vindas do teste real das jogadoras: token livre/estável, Ajudante técnica com ferramentas operacionais, Mestre principal única e área de anotações da mesa.

## Correções principais
- Token premium da Floresta agora pode ser arrastado livremente, sem snap obrigatório para nós.
- Posição livre salva em `token_x/token_y` via `/move-token`.
- WebSocket não redesenha a tela durante o arraste do token; estado pendente é aplicado após soltar.
- Ajudante da Mestre pode mover todos os tokens.
- Ajudante pode alterar HP, energia, força, habilidade, inventário, notas e fraquezas.
- Mestre principal continua única; funções críticas seguem protegidas para Mestre/admin.
- Área “Diário da Mestre” foi renomeada para “Anotações da Mesa”.
- Mapa da Floresta ganhou mais área útil; painel reduzido para 340px.
- Carta/retrato da personagem aumentado no painel da Floresta.

## Validação
- `python -m py_compile main.py local_worker.py`
- `node -c script.js`

## Versão
`v19.2-mesa-leve-tokens-ajudante-anotacoes`
