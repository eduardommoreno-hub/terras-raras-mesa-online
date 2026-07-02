# RELATÓRIO v20.1.4 — Google OAuth local aprovado

## Base

v20.1.3

## Marco

O usuário confirmou que conseguiu entrar no jogo pelo Google.

## Alterações

### Backend

- Adicionado carregador nativo de `.env`:
  `_tr_load_local_env_v214()`

### Frontend

- Modal detecta quando o Google está configurado.
- Se Google está ativo, mostra:
  `Google OAuth ativo`
- Remove orientação de configuração quando não é necessária.
- Mantém login normal como alternativa.

### Arquivos

- `.env.example`
- `ENV_EXEMPLO_GOOGLE_LOCAL_v20_1_4.txt`
- `README_V20_1_4_GOOGLE_LOCAL_APROVADO.md`

## Sem alteração

- sem mudança na estética aprovada da landing;
- sem mudança de mapas;
- sem mudança de personagens;
- sem mudança no Asaas;
- sem mudança na estrutura do banco.

## Próximo passo

Railway + redirect online do Google OAuth.
