# v21.1.9 — Hotfix IA Narradora / Painel Respostas

## Objetivo
Recuperar a IA local no protótipo atual sem mexer no layout global, mapas, cartas ou cânone.

## Problema diagnosticado
O botão Narrar criava/acionava pedidos de IA, mas a interface nem sempre mostrava o job/resposta no painel IA. Havia três fragilidades:
- o front antigo ignorava mensagens WebSocket do tipo `ai_job`;
- ao criar um job, o backend só enviava `ai_job`, não enviava `state` completo;
- não havia polling ativo do painel IA para buscar a resposta quando o worker completava.

## Correções aplicadas
- O backend agora transmite `state` completo ao criar job de IA.
- O frontend passa a tratar `ai_job` no WebSocket.
- O frontend preserva `state.me` quando o broadcast vem sem o usuário local.
- O botão Narrar abre diretamente o painel IA > Respostas.
- O painel IA atualiza automaticamente a cada 1,8s enquanto houver pedido pendente/processando.
- O worker local teve limites de geração um pouco reduzidos para acelerar narrações em PC local.

## Não alterado
- Layout global
- Mapas
- Hotspots
- Cartas
- Personagens
- OAuth
- Landing
- Mapa 04
