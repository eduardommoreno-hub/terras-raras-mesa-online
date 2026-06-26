# RELATÓRIO v19.6.11.32 — Fábrica Widescreen + Correção de Painel

## Objetivo

Corrigir dois problemas observados no vídeo:

1. A Fábrica ainda precisava usar o novo mapa panorâmico aprovado.
2. Ao clicar em botões como Diário ou em locais do mapa, o painel lateral não mostrava o conteúdo esperado.

## Correções

### 1. Novo mapa panorâmico aprovado

Mapa integrado em:

- `assets/maps/fabrica_doces_widescreen.png`
- `assets/maps/fabrica_doces_widescreen.webp`
- `assets/visual/fabrica_doces_widescreen.png`
- `static/fabrica_doces_widescreen.png`

Rota segura:

- `/tr-assets/fabrica-map`
- `/tr-assets/fabrica-map.webp`

### 2. Hotspots recalibrados

Os 12 locais da Fábrica foram recalibrados para o novo mapa panorâmico.

### 3. Correção do painel lateral

Agora:

- clicar em local do mapa abre o painel de Mapa e mostra o local;
- clicar em Diário abre o Diário;
- clicar em Missões abre Missões;
- clicar em Chat abre Chat;
- clicar em IA abre IA;
- clicar em Mapa volta ao painel do mapa;
- o cartão visual não fica cobrindo painéis de ferramentas.

## Base usada

`v19.6.11.28.1`

## Fonte do mapa

`/mnt/data/fábrica_dos_doces_pesadelos.png`

## Segurança

- sem banco
- sem worker
- sem Railway/Ollama
- sem alterar IDs
- sem remover assets
