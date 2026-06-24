# RELATÓRIO V18.0.1 — Hotfix Assets StaticFiles

## Objetivo
Corrigir o bloqueio crítico identificado no remaster funcional da Floresta Negra: imagens em `/assets/*` retornando 404 no Railway.

## Correção aplicada
- Adicionado `from fastapi.staticfiles import StaticFiles` ao `main.py`.
- Montada a pasta `assets` em `/assets` quando existir no ambiente.
- Atualizado `APP_VERSION` para `v18.0.1-assets-staticfiles-hotfix`.
- Atualizado cache do frontend para `script.js?v=18.0.1`.

## Escopo preservado
- Nenhuma alteração nos IDs internos dos mapas.
- Nenhuma alteração nos hotspots.
- Nenhuma alteração na segurança infantil.
- Nenhuma alteração nos demais mapas.
- Nenhuma alteração na lógica de cartas, missões, inventário, diário ou Jornada.

## Resultado esperado
No Railway, os arquivos abaixo passam a ser servidos corretamente:

- `/assets/visual/floresta_negra_v18.png`
- `/assets/visual/tokens_sheet_v18.png`
- `/assets/visual/cartas_aventura_v18.png`

## Validação
- `python -m py_compile main.py local_worker.py`
- `node -c script.js`
