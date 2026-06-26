# Terras Raras v19.6.8 — Hotfix de artes dos locais e cartas cinematográficas

## O que foi corrigido

1. Biblioteca e Eventos agora exibem miniaturas ilustradas de cada local do mapa.
2. As cartas amplas deixaram de mostrar os modelos genéricos e passaram a usar visual cinematográfico:
   - cartas de mapa usam artes recortadas dos locais da Floresta Negra;
   - cartas de personagem usam os cards reais das personagens.
3. Cartas enviadas/usadas/revogadas também passaram a reutilizar essa visualização cinematográfica.
4. Atualização visual da versão para v19.6.8 no frontend e backend.

## Testes

- `python -m py_compile main.py local_worker.py`
- `node -c script.js`
- `python -c "import main; print(main.APP_VERSION)"`

Todos passaram.
