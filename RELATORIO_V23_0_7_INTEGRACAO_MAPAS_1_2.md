# RELATÓRIO v23.0.7 — Integração Mapas 1 e 2

Base utilizada: v21.1.9 HOTFIX IA Narradora / Painel Respostas.

## Integrado nesta entrega

- 18 cartas aprovadas da Floresta Negra em `assets/cards/floresta_negra_v22/`
- 18 cartas aprovadas da Fábrica dos Doces Pesadelos em `assets/cards/fabrica_doces_pesadelos_v23/`
- `assets/cards/catalog.json` atualizado para 60 cartas totais.
- `canon/mapa-01-floresta-negra-v22.json`
- `canon/mapa-02-fabrica-dos-doces-pesadelos-v23.json`
- `cards/mapa-01-cartas-floresta-negra.json`
- `cards/mapa-02-cartas-fabrica-doces-pesadelos.json`
- `events/mapa-01-eventos-floresta-negra.json`
- `events/mapa-02-eventos-fabrica-doces-pesadelos.json`
- Prompts de IA Narradora e Guardião para os Mapas 1 e 2.
- Manifests dos assets nas pastas das cartas.

## Compatibilidade

Para não quebrar o protótipo atual, mantive:
- `map_id` da Floresta como `floresta_negra`
- `map_id` da Fábrica como `fabrica_doces`, que é o ID usado no frontend atual

O canon da Fábrica também registra:
- `canonical_map_id: fabrica_dos_doces_pesadelos`

## Observação

A integração principal desta entrega é de dados, catálogo, canon e assets. A Cidade dos Relógios foi preservada.
