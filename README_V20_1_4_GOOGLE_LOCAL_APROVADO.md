# v20.1.4 — Google OAuth local aprovado

## Marco aprovado

O login Google funcionou localmente com:

```text
http://127.0.0.1:8000
```

Redirect aprovado no Google Cloud:

```text
http://127.0.0.1:8000/auth/google/callback
```

## O que esta versão faz

1. Mantém a landing e o modal aprovados.
2. Quando Google está configurado, o modal mostra `Google OAuth ativo`.
3. Quando Google não está configurado, continua mostrando orientação limpa.
4. Adiciona suporte nativo a `.env`.
5. Evita precisar digitar `set GOOGLE_CLIENT_ID...` toda vez.

## Como usar .env

1. Copie `.env.example`.
2. Renomeie a cópia para `.env`.
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
4. Rode:

```cmd
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Teste

Abra:

```text
http://127.0.0.1:8000/auth/diagnostics
```

Procure:

```json
"configured": true
```

Depois teste:

```text
http://127.0.0.1:8000
```

Clique em:

```text
ATRAVESSAR O PORTAL
Continuar com Google
```

## Segurança importante

Como a chave secreta apareceu em prints durante o teste, o recomendado é:

1. confirmar que tudo funciona;
2. voltar no Google Cloud;
3. gerar uma nova chave secreta ou recriar o cliente OAuth;
4. atualizar o `.env`.

## Próximo passo

Preparar o Google OAuth para o Railway:

```text
https://SEU-DOMINIO.up.railway.app/auth/google/callback
```
