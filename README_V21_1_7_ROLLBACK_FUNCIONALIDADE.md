# v21.1.7 — Rollback seguro de funcionalidade

## Decisão
A v21.1.5/v21.1.6 causou regressão grave: o layout global substituiu a interface funcional da sessão e ocultou controles essenciais do jogo.

## O que esta versão faz
- volta para a linha segura da v21.1.3;
- remove o overlay global que escondia funcionalidades;
- restaura a interface funcional original dos mapas;
- preserva Personagens e Cartas da Cidade dos Relógios Parados;
- mantém Mestre/Ajudante sem personagem;
- mantém Jogadoras escolhendo personagem;
- atualiza cache para script.js?v=21.1.7.

## O que NÃO foi mexido
- Google OAuth;
- landing;
- Floresta Negra/Fábrica/Cidade canônicas;
- hotspots;
- IA local;
- banco;
- Mapa 04.

## Regra para próximos passos
Não aplicar mais layout global substituindo DOM funcional. O layout visual deverá ser feito por CSS progressivo ou por tela isolada, uma parte por vez, sem remover painéis reais de IA, mapas, jogadores, cartas, inventário, diário, missões ou bastidores.
