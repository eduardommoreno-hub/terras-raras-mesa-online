# RELATÓRIO — v21.1.3

## Nome da versão

v21.1.3 — Layout azul aprovado para Personagens/Cartas da Cidade

## Motivo

O usuário enviou uma referência visual e confirmou que aquele é o layout desejado para o jogo, com cores, formato dos botões e composição mais elegante.

## Correção aplicada

Foi aplicado um bloco CSS isolado e seguro para a tela interna do Mapa 03 — Cidade dos Relógios Parados, mantendo a estrutura funcional da v21.1.2.

A correção altera apenas o visual do modo `trClockLayoutMode`, usado nas telas:

- Personagens;
- Cartas;
- Layout interno da Cidade dos Relógios Parados.

## O que foi preservado

- Google OAuth não foi alterado.
- Landing não foi alterada.
- Floresta Negra não foi alterada.
- Fábrica dos Doces Pesadelos não foi alterada.
- Hotspots do mapa da Cidade não foram alterados.
- Cânone da Cidade não foi alterado.
- Baralho textual não foi alterado.
- Eventos e prompts da IA não foram alterados.
- Mestre/Ajudante continuam bloqueados para escolha de personagem.

## Testes técnicos executados

```bash
python -m py_compile main.py local_worker.py
node --check script.js
curl http://127.0.0.1:8000/health
```

Resultado:

- compilação Python OK;
- validação JavaScript OK;
- servidor FastAPI subiu localmente;
- `/health` respondeu com `v21.1.3-layout-azul-aprovado-personagens-cartas-cidade`;
- `index.html` carrega `script.js?v=21.1.3`.

## Commit sugerido

```text
v21.1.3 layout azul aprovado personagens cartas cidade
```
