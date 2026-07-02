# RELATÓRIO v21.1.2 — Correção do layout Personagens/Cartas da Cidade

## Base

v21.1.1 — Layout Personagens + Cartas da Cidade.

## Diagnóstico feito

A aplicação foi aberta tecnicamente pelo backend local e os pontos críticos foram verificados sem avançar para o Mapa 04.

Achados principais:

- `main.py` compila corretamente.
- `script.js` passa em verificação de sintaxe JavaScript.
- O servidor FastAPI sobe localmente.
- `/health` responde com a versão da aplicação.
- As imagens das cartas do mapa e dos personagens da Cidade existem e respondem em `/assets`.
- A API confirma que Mestre e Ajudante continuam sem personagem.
- A API confirma que jogador participante consegue escolher personagem.
- O problema provável da v21.1.1 era cache de frontend: o `index.html` ainda chamava `/script.js?v=21.0.8`, podendo fazer o navegador usar script antigo e não carregar os botões/telas novos.

## Correções aplicadas

1. `APP_VERSION` atualizado para `v21.1.2-fix-layout-personagens-cartas-cidade`.
2. `index.html` agora chama:

```html
<script src="/script.js?v=21.1.2"></script>
```

3. Cache do HTML e do `script.js` desativado no backend durante testes locais:

```text
Cache-Control: no-store, max-age=0
```

4. Cache do `catalog.json` atualizado para `v=21.1.2`.
5. Cache do fundo visual da Cidade no CSS atualizado para `v=21.1.2`.
6. Nenhuma alteração feita em Google OAuth.
7. Nenhuma alteração feita na landing.
8. Nenhuma alteração feita na Floresta Negra ou Fábrica dos Doces Pesadelos.
9. Nenhuma alteração feita na estrutura canônica do Mapa 03.

## Testes realizados

Comando usado:

```cmd
python -m uvicorn main:app --host 127.0.0.1 --port 8012
```

Resultados:

- `python -m py_compile main.py local_worker.py` OK.
- `node --check script.js` OK.
- `/health` OK.
- `/script.js?v=21.1.2` respondeu 200 com `Cache-Control: no-store`.
- `/assets/cards/players/cidade_relogios/01_katrina_cidade_relogios.webp` respondeu 200.
- Mestre tentando escolher personagem: bloqueado corretamente.
- Jogadora participante escolhendo Katrina: OK.
- Ajudante tentando escolher personagem: bloqueado corretamente.

## Como testar agora

1. Feche a aba antiga do jogo.
2. Rode:

```cmd
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

3. Abra:

```text
http://127.0.0.1:8000
```

4. Faça um hard refresh:

```text
Ctrl + F5
```

5. Entre/crie sala e coloque o mapa na Cidade dos Relógios Parados.
6. Verifique:

- botão Personagens aparece;
- botão Cartas aparece;
- Personagens abre grade 6x2;
- jogador participante consegue confirmar personagem;
- Mestre/Ajudante não conseguem escolher personagem;
- Cartas mostra baralho do mapa e cartas dos jogadores;
- Jogar volta ao mapa;
- hotspots da Cidade continuam funcionando.

## Commit sugerido

```text
v21.1.2 fix layout personagens cartas cidade
```
