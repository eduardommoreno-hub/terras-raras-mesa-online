# RELATÓRIO v19.6.3 — Confirmação e Retirada de Cartas

## Objetivo
Corrigir o fluxo de envio de cartas para evitar erros da Mestre/Ajudante e permitir retirar cartas enviadas por engano.

## Alterações principais

- Mantido painel amplo sobre o mapa para Cartas/Eventos/Biblioteca.
- Ao enviar carta, o sistema agora pede confirmação explícita antes do envio.
- A confirmação mostra carta, destino, tipo e origem.
- Criada função de retirar/cancelar carta enviada.
- A retirada também exige confirmação.
- Cartas retiradas deixam de aparecer para jogadoras.
- Mestre/Ajudante continuam vendo cartas retiradas no histórico.
- Histórico de cartas usadas agora separa cartas ativas, usadas e retiradas/canceladas.
- Carta retirada recebe marcação visual própria.

## Backend

- AdventureCard agora possui:
  - revoked_at
  - revoked_by_user_id
  - revoked_reason
- Migração automática adiciona as colunas quando necessário.
- Novo endpoint:
  - POST /rooms/{room_id}/cards/{card_id}/revoke
- /cards/my não retorna cartas retiradas.
- use/save/seen bloqueiam cartas retiradas.

## Frontend

- trSendCatalogCard agora confirma antes do envio.
- trRevokeAdventureCard permite retirar carta com confirmação.
- Painel amplo mostra cartas retiradas em seção própria.
- Cartas retiradas aparecem com selo visual “CARTA RETIRADA”.

## Validação

- python -m py_compile main.py local_worker.py
- node -c script.js

## Versão

v19.6.3-confirmacao-retirada-cartas
