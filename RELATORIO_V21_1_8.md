# RELATÓRIO — v21.1.8

## Diagnóstico
A v21.1.7 restaurou boa parte da funcionalidade, mas restaram dois problemas visuais:
1. Mapa cortado pela barra inferior de botões.
2. Personagens/Cartas da Cidade continuavam dentro da coluna esquerda, espremidos pelo painel lateral antigo.

Além disso, o terminal mostrou 404 para imagens antigas de cartas da Floresta em `/assets/cards/maps/floresta_negra/...`.

## Correção
- Personagens/Cartas da Cidade passam a ocultar temporariamente o painel direito antigo e usam largura total.
- Ao voltar para Mapa/Jogar, o painel funcional original retorna.
- Ajuste de `padding-bottom` e `max-height` para mapa visual não ficar sob a barra inferior.
- Criação de aliases de assets em `assets/cards/maps/floresta_negra`.

## Resultado esperado
- Mapa sem corte.
- Botões do mapa continuam visíveis.
- IA e painéis continuam funcionando.
- Cartas/Personagens da Cidade ficam mais proporcionais.
- 404 das cartas antigas da Floresta deixa de ocorrer.
