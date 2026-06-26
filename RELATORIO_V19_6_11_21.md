# v19.6.11.21 — Pedido de Entrada Cinematográfico

Implementado fluxo visual para cadastro:

- botão de cadastro passa a abrir modal cinematográfica;
- formulário de pedido de entrada com usuário, senha e confirmação;
- envio para /auth/register sem gerar sensação de erro;
- mensagem imersiva “A Coruja Mensageira partiu...”;
- polling em /auth/register-status/{username};
- quando o Mestre aprovar no painel admin, o jogador recebe “Você foi aceito!”.

Arquivos alterados:

- index.html
- script.js
- main.py

Observação: a tabela de usuários existente foi preservada. Não houve migração destrutiva.
