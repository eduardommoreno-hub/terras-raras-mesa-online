# v21.1.8 — Fix corte do mapa, Cartas/Personagens e assets 404

## Objetivo
Corrigir os problemas observados após o rollback funcional v21.1.7 sem voltar a aplicar layout global por cima do jogo.

## Problemas corrigidos
- Mapa visual da Cidade/Floresta aparecendo cortado pela barra inferior.
- Tela Cartas da Cidade espremida junto com o painel lateral antigo.
- Tela Personagens/Cartas agora ocupa a área inteira da sessão quando aberta.
- Painel lateral volta quando o usuário clica em Jogar/Mapa.
- Assets antigos de cartas da Floresta que davam 404 foram espelhados em `assets/cards/maps/floresta_negra`.

## Estratégia segura
Não foi criado novo layout global. A interface funcional original foi preservada.
As correções foram feitas por CSS/JS pequeno:
- classe temporária só para Personagens/Cartas da Cidade;
- ajuste de padding/altura do mapa normal;
- aliases físicos para imagens de cartas antigas.

## Não alterado
- Google OAuth
- landing
- IA
- regras Mestre/Ajudante
- Mapa 04
- cânone
