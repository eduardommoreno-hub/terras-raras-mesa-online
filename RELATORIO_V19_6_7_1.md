# Terras Raras v19.6.7.1 — Hotfix de rolagem dos overlays amplos

## Objetivo
Corrigir o problema relatado após a v19.6.7: os botões de fechar/voltar foram adicionados em Cartas, Eventos e Biblioteca, mas o conteúdo das abas não podia ser percorrido por falta de rolagem visível/funcional.

## Correções aplicadas

- Adicionada regra CSS final de alta prioridade para `.wideToolOverlay`, `.wideCardsOverlay`, `.wideEventsOverlay` e `.wideLibraryOverlay`.
- O overlay agora tem altura fixa baseada na viewport: `height: calc(100vh - 88px)` no desktop.
- O cabeçalho permanece fixo no topo com o botão **Fechar e voltar ao mapa**.
- O corpo `.wideToolBody` agora tem `overflow-y: scroll !important`, com barra de rolagem visível.
- Adicionado estilo explícito para scrollbar no Chrome/Edge e Firefox.
- Adicionado aviso discreto no rodapé do overlay: “role a aba para ver todo o conteúdo”.
- Mantida compatibilidade mobile com altura calculada e scrollbar menor.
- Atualizado `APP_VERSION` para `v19.6.7.1-hotfix-rolagem-overlays`.

## Arquivos alterados

- `index.html`
- `main.py`
- `RELATORIO_V19_6_7_1.md`

## Testes executados

```bash
python -m py_compile main.py local_worker.py
node -c script.js
python -c "import main; print(main.APP_VERSION)"
```

## Observação
Este hotfix não altera a lógica de Cartas/Eventos/Biblioteca. Ele corrige exclusivamente a usabilidade de rolagem das abas amplas.
