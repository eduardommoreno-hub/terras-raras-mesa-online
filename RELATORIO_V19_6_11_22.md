# RELATÓRIO v19.6.11.22 — Mensagens Cinematográficas do Sistema

## Objetivo
Transformar avisos técnicos e estados do sistema em mensagens coerentes com a experiência de Terras Raras.

## Implementado

### 1. IA pensando
Quando a Mestre/Ajudante envia pedido para a IA, aparece aviso cinematográfico:

> O Narrador está ouvindo as sombras...

Também foi criado um indicador inferior persistente enquanto houver job pendente/processando.

### 2. Senha incorreta / login inválido
Mensagens de autenticação deixam de parecer erro técnico e passam para:

> A chave não abriu o portal.

### 3. Aguardando aprovação
Quando o usuário ainda depende da aprovação do Mestre/Admin:

> Sua coruja ainda não retornou.

### 4. Conexão perdida/reconexão
Queda de WebSocket agora mostra:

> O fio entre os mundos se rompeu.

Ao reconectar:

> O portal voltou a brilhar.

### 5. Carta recebida
Quando uma jogadora recebe nova carta:

> Uma carta surgiu entre suas mãos.

### 6. Carta enviada / guardada / usada
Foram adicionados avisos cinematográficos para:
- carta enviada;
- carta guardada no inventário;
- carta usada;
- missão/carta importante concluída.

## Arquivos alterados
- `index.html`
- `script.js`

## Observação técnica
Não houve alteração destrutiva no banco.
Não houve troca de arquitetura.
Não houve alteração no worker local.
O ajuste foi concentrado na camada de UX/frontend.

## Versão
v19.6.11.22
