# RELATÓRIO v20.0.3 — Login limpo sem painel antigo

## Problema observado

Na v20.0.2, o novo botão cinematográfico apareceu, mas o card antigo da primeira tela continuou visível atrás:

- “Entrar na aventura”
- botão “Entrar”
- botão “Solicitar cadastro”

## Correção

A v20.0.3 esconde definitivamente o card/formulário antigo da primeira tela.

Agora a tela inicial deve mostrar apenas:

- arte cinematográfica;
- botão “Entrar na Jornada”.

Ao clicar no botão, abre o modal cinematográfico com:

- “Continuar com Google”;
- “Acesso técnico / legado” escondido.

## Segurança

- login antigo não foi removido;
- cadastro antigo não foi removido;
- apenas saiu da primeira tela;
- acesso legado continua dentro do modal.
