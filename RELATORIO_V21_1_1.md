# RELATÓRIO v21.1.1 — Layout Personagens + Cartas da Cidade

## Base

v21.0.8 — Cidade dos Relógios Parados funcional.

## O que faltava desde a última atualização

- As cartas visuais do baralho do Mapa 03 ainda não estavam recortadas e integradas.
- As cartas dos jogadores por mapa ainda não estavam no jogo.
- O layout cinematográfico de escolha de personagens ainda era apenas referência visual.
- O catalog.json ainda não apontava imagens reais para a Cidade dos Relógios Parados.
- Faltavam manifestos organizados para cartas do mapa e cartas dos jogadores.

## O que entrou agora

### Layout novo

- Tela especial **Personagens** para a Cidade dos Relógios Parados.
- Visual inspirado no mockup aprovado:
  - menu superior;
  - painel lateral do mapa;
  - grade 6x2 com 12 personagens;
  - botão Confirmar Escolha;
  - menu inferior com Início, Personagens, Cartas, Jogar, Loja, Configurações e Sair.
- Botão **Personagens** adicionado ao mapa cinematográfico.

### Cartas dos jogadores

Foram integradas 12 cartas de personagens específicas do Mapa 03:

1. Katrina
2. Lina
3. Mira
4. Theo
5. Naya
6. Cael
7. Selene
8. Lyra
9. Dorian
10. Silas
11. Orion
12. Riven

Pasta:

```text
assets/cards/players/cidade_relogios/
```

### Cartas do mapa

Foram recortadas e integradas as 12 cartas visuais do baralho da Cidade:

1. Relógio Sem Ponteiros
2. Praça Congelada
3. Ponteiro Torto
4. Minuto Quebrado
5. Gota Suspensa
6. Página Repetida
7. Máscara da Última Badalada
8. Instante Perdido
9. Sino Calado
10. Carta de Amélia
11. Chave do Relojoeiro
12. Relógio-Coração

Pasta:

```text
assets/cards/cidade_relogios/
```

### Arquivos técnicos

- `assets/cards/cidade_relogios/manifest.json`
- `assets/cards/cidade_relogios/baralho_cidade_relogios.json`
- `assets/cards/players/cidade_relogios/manifest.json`
- `assets/cards/players/cidade_relogios/personagens_cidade_relogios.json`
- `assets/cards/catalog.json` atualizado
- `cards/mapa-03-cartas-cidade-relogios.json` atualizado
- `assets_bundle.zip` atualizado

## Observação honesta

Lyra, Silas, Orion e Riven foram integrados a partir do layout aprovado para garantir que o sistema já tenha as 12 cartas funcionais. Depois podemos gerar artes individuais full premium desses 4 sem alterar a estrutura.

## Como testar

1. Rodar:

```cmd
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

2. Entrar no jogo.
3. Abrir ou criar sala.
4. Mudar para **Cidade dos Relógios Parados**.
5. Clicar em **Personagens**.
6. Selecionar uma carta.
7. Clicar em **Confirmar escolha**.
8. Clicar em **Cartas** para ver o baralho do mapa e as cartas dos jogadores.
9. Clicar em **Jogar** para voltar ao mapa.

## Commit sugerido

```text
v21.1.1 layout personagens e cartas cidade relogios
```
