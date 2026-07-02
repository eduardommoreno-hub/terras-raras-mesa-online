# RELATÓRIO — v21.1.9

## Escopo
Hotfix funcional exclusivo para IA Narradora.

## Diagnóstico
Pelo vídeo, o worker local estava ativo e recebia job de IA. O problema principal era a interface não refletir com segurança o estado do job/resposta no painel IA.

## Correção técnica
1. Backend:
   - `/rooms/{room_id}/ai/request` agora faz broadcast de `state` completo após criar o job.
2. Frontend:
   - adicionada camada v21.1.9 para:
     - abrir painel IA/Respostas ao narrar;
     - atualizar `state.ai_jobs` imediatamente;
     - fazer polling em `/rooms/{room_id}/ai/jobs`;
     - tratar evento WebSocket `ai_job`;
     - preservar `state.me`.
3. Worker:
   - reduzido tamanho de geração normal/detalhada para melhorar velocidade local.

## Resultado esperado
Ao clicar em Narrar:
- abre o painel IA > Respostas;
- aparece o pedido pendente/processando;
- quando o worker concluir, a narração aparece no painel;
- botões de publicar no Chat/Bastidores/Diário/Descrição continuam funcionando.
