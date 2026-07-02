# RELATÓRIO v20.1.3 — Remove aviso antigo duplicado

## Problema

Mesmo após a v20.1.2, em alguns testes o modal ainda mostrava dois avisos:

1. diagnóstico novo;
2. aviso antigo da v20.0.9.

## Correção

A v20.1.3 remove definitivamente o aviso antigo:

- por `id`;
- por classe;
- por conteúdo textual;
- com `MutationObserver` para impedir que o aviso antigo volte após clicar nos provedores.

## Resultado esperado

O modal deve mostrar apenas um aviso:

Google ainda não configurado.
Redirect necessário:
http://127.0.0.1:8000/auth/google/callback

Enquanto isso, entre por usuário e senha.

## Escopo

- sem alteração visual da landing;
- sem alteração de banco;
- sem alteração de OAuth;
- sem alteração de Asaas;
- apenas limpeza do aviso duplicado.
