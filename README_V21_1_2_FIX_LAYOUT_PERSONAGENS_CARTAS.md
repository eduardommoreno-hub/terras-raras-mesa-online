# Terras Raras v21.1.2

Correção segura da v21.1.1 para garantir que o navegador carregue o layout novo de Personagens/Cartas da Cidade dos Relógios Parados.

A correção principal foi o cache do frontend: o HTML ainda apontava para `script.js?v=21.0.8`. Agora aponta para `script.js?v=21.1.2` e o backend envia HTML/JS com `Cache-Control: no-store`.

Não houve avanço para o Mapa 04.
