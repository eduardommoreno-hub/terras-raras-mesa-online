# Terras Raras v19.6.9 — Cartas de personagem cinematográficas

## Entrega

Foram criadas **48 cartas de personagem** para os 12 personagens canônicos.

Cada carta agora tem:

- arte cinematográfica própria;
- retrato pequeno da personagem no canto superior;
- moldura premium dark fantasy;
- título da carta;
- tipo da carta;
- texto de efeito;
- zona/personagem no rodapé.

## Estrutura criada

As novas imagens foram salvas em:

`assets/cards/characters_cinematic_v1969/<personagem>/<carta>.webp`

O `catalog.json` foi atualizado para apontar para essas novas imagens.

## Interface

A Central de Cartas agora exibe as cartas de personagem como carta completa/full art, e mantém os botões de envio para Mestre/Ajudante.

## Testes

- `python -m py_compile main.py local_worker.py`
- `node -c script.js`
- `python -c "import main; print(main.APP_VERSION)"`
- validação do `catalog.json`

