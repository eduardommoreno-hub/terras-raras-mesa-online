# RELATÓRIO — v21.1.7

## Problema observado
Pelo vídeo enviado, a interface da v21.1.6 ainda estava usando o shell cinematográfico global da v21.1.5: mapa pequeno, painel lateral falso/estático, rodapé próprio e ausência das funcionalidades reais do jogo.

## Causa provável
As versões 21.1.4/21.1.5/21.1.6 passaram a substituir a renderização inteira da sessão por um layout visual novo. Isso interferiu na estrutura funcional original: abas, painel de IA, controle de mapa, troca de mapa, botões de jogabilidade e painéis reais.

## Correção
Rollback para a base v21.1.3, que preservava a funcionalidade original e só adicionava Personagens/Cartas da Cidade.

## Patch adicional
Foi adicionado um limpador de segurança para remover classes e mount residual do layout global quebrado:
- trClockFullMountV2114;
- trClockAppLocked;
- trGenericCompactModeV2116;
- trClockFullAppModeV2114.

## Resultado esperado
- funcionalidades do jogo restauradas;
- IA volta a aparecer no painel real;
- troca de mapa volta a aparecer;
- botões originais voltam;
- mapa volta ao comportamento funcional anterior;
- Personagens/Cartas da Cidade continuam disponíveis.
