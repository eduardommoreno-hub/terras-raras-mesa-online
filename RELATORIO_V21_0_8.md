# RELATÓRIO v21.0.8 — Cidade dos Relógios Parados integrada

## Base

v20.1.4 — Google OAuth local aprovado

## Marco

Mapa 03 integrado ao jogo como mapa visual jogável.

## Entrou nesta versão

- imagem aprovada da Cidade dos Relógios Parados;
- rota `/tr-assets/cidade-relogios-map`;
- rota `/tr-assets/cidade-relogios-map.webp`;
- 12 locais canônicos + estação de saída;
- hotspots clicáveis no mapa;
- painel lateral com descrição, evento, pista e cartas vinculadas;
- baralho canônico do Mapa 03;
- eventos canônicos;
- Bíblia canônica consolidada;
- prompt da IA narradora;
- prompt da Guardiã do Cânone;
- arquivos técnicos em `canon/`, `cards/`, `events/` e `prompts/`;
- assets incluídos também no `assets_bundle.zip`.

## Sem alteração

- login Google local mantido;
- landing mantida;
- Floresta Negra mantida;
- Fábrica dos Doces Pesadelos mantida;
- pagamento/Asaas não alterado;
- deploy online não alterado.

## Como testar

1. Rodar localmente:

```cmd
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

2. Entrar no jogo.
3. Criar/entrar em uma sala como Mestre.
4. No painel do mapa, trocar para:

```text
Cidade dos Relógios Parados
```

5. Clicar nos pontos numerados do mapa.

## Commit sugerido

```text
v21.0.8 cidade dos relogios integrada
```
