# RELATÓRIO v20.1.2 — OAuth aviso único

## Problema

Na v20.1.1 o modal funcionou, mas apareciam dois avisos repetidos:

1. aviso antigo da v20.0.9;
2. diagnóstico novo da v20.1.0.

Ambos diziam que o Google ainda não estava configurado.

## Correção

A v20.1.2:

- oculta o aviso antigo `trProviderMsgV209`;
- mantém apenas o diagnóstico novo `trOauthDiagV210`;
- deixa o texto mais limpo;
- mantém o redirect visível para configurar Google Cloud;
- não altera login normal;
- não altera banco;
- não altera OAuth;
- não altera Asaas.

## Resultado esperado

O modal passa a mostrar apenas um aviso:

Google ainda não configurado.
Redirect necessário:
http://127.0.0.1:8000/auth/google/callback

Enquanto isso, entrar por usuário e senha.
