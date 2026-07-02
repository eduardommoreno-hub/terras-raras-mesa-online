# RELATÓRIO v20.0.2 — Login cinematográfico com Google

## Decisão visual

A primeira tela não mostra mais formulário de usuário/senha.

Agora ela tem apenas:

- botão cinematográfico “Entrar na Jornada”;
- ao clicar, abre uma aba/modal cinematográfica;
- dentro do modal há o botão “Continuar com Google” em estilo escuro/dourado;
- foi removida a faixa branca do botão Google.

## Acesso legado

O login antigo foi preservado, mas escondido em:

- “Acesso técnico / legado”

Isso evita perder acesso enquanto o Google OAuth ainda estiver sendo configurado.

## Arquivos alterados

- `index.html`
- `script.js`
- `assets/ui/login_google_cinematico_v20_0_2.png`
- `assets/ui/login_google_cinematico_v20_0_2.webp`

## Segurança

- não remove login antigo;
- não altera banco;
- não altera Asaas;
- não altera OAuth;
- apenas reorganiza a tela inicial.
