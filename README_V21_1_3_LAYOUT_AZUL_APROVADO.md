# Terras Raras — v21.1.3

## Layout azul cinematográfico aprovado

Esta versão aplica, de forma segura, a referência visual indicada pelo usuário para as telas internas da Cidade dos Relógios Parados:

- tema azul cinematográfico;
- botões superiores e inferiores arredondados/elegantes;
- painel lateral do mapa preservado;
- grade 6x2 dos 12 personagens preservada;
- tela de Cartas preservada;
- botão Confirmar escolha preservado;
- Mestre e Ajudante continuam sem personagem;
- Jogadoras continuam podendo escolher personagem.

## Escopo

Não mexe em:

- Google OAuth;
- landing page;
- Floresta Negra;
- Fábrica dos Doces Pesadelos;
- mapa funcional da Cidade dos Relógios Parados;
- hotspots da Cidade;
- cânone, baralho textual, eventos ou IA.

## Arquivos alterados

- `index.html`
  - cache do script atualizado para `script.js?v=21.1.3`;
  - novo bloco CSS `tr-v21-1-3-layout-azul-aprovado-css`.
- `script.js`
  - marcador de versão visual v21.1.3;
  - cache do catálogo atualizado para `catalog.json?v=21.1.3`.
- `main.py`
  - `APP_VERSION` atualizado.

## Como rodar

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Depois abrir:

```text
http://127.0.0.1:8000
```

E usar `Ctrl + F5` no navegador.
