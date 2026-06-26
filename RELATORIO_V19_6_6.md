# Terras Raras v19.6.6 — Recuperação de jogabilidade, painéis e IA operacional

## Objetivo

Corrigir os erros relatados nos testes da v19.6.5, priorizando jogabilidade real da mesa: botões funcionais, painéis confortáveis, IA utilizável, Cartas/Eventos/Biblioteca/Configurações/Narrar com conteúdo e mapa novamente selecionável.

## Correções implementadas

### 1. Painel lateral e conforto de jogo

- Painel lateral aumentado para aproximadamente 520px no desktop.
- Textareas ampliadas para no mínimo 180px; campo principal da IA para 220px.
- Botões pequenos agora aceitam quebra de linha e não devem cortar texto.
- Chat, notas e respostas da IA ganharam áreas mais altas.
- Ajustes responsivos para telas menores.

### 2. IA operacional para todos os papéis

- IA agora tem área clara de conversa livre: “Converse com a IA”.
- Jogadoras podem perguntar/conversar com a IA usando `question`.
- Mestre/Ajudante continuam com funções avançadas.
- Narração oficial permanece exclusiva da Mestre.
- Removido o risco de recursão entre montagem da IA e troca de abas.
- Funções rápidas incluídas: abertura, narrar cena, narrar local, criar pista, criar evento, consequência, ajudar com carta, missão, diário e próximo passo.

### 3. Cartas

- Definida função `loadCardCatalog()` que estava sendo chamada, mas não existia de forma segura.
- Overlay amplo de Cartas fica exclusivo para Mestre/Ajudante.
- Jogadora continua vendo cartas no painel lateral.
- Overlay mostra carregamento e nunca deve abrir vazio sem mensagem.
- Mantida aba “Retiradas/Canceladas”.
- Mantida confirmação antes de enviar carta e retirada de carta enviada.

### 4. Mapa e locais selecionáveis

- Ajustado `pointer-events` e `z-index` de hotspots, nós, tokens e barra inferior.
- Barra inferior usa `pointer-events:none` no container e `pointer-events:auto` nos botões, evitando bloquear cliques do mapa.
- Seleção de local visual chama `renderLocationBox()`, permitindo ações narrativas mais completas.
- Botão Narrar usa o local selecionado, quando houver.

### 5. Inventário com card real

- Inventário agora usa `card_url` do personagem quando disponível.
- Mostra card real, nome, classe, zona, atributos, itens e cartas vinculadas.
- Mestre/Ajudante podem escolher qual jogadora/personagem visualizar.

### 6. Jogadoras como painel de controle

- A aba Jogadoras foi redesenhada em cards operacionais.
- Cada jogadora mostra imagem/card, personagem, papel, atributos, cartas e localização.
- Mestre/Ajudante têm ações rápidas: salvar ficha, ver inventário, enviar carta, criar evento, mover token e preparar mensagem.

### 7. Eventos

- Eventos ganhou overlay próprio amplo.
- Inclui modelos rápidos, criação manual, evento público, bastidores, transformar em carta e pedir ajuda da IA.
- Mostra histórico de eventos recentes.

### 8. Biblioteca

- Biblioteca ganhou overlay amplo com:
  - status do catálogo;
  - locais do mapa;
  - cartas de jogo/mapa;
  - cartas de personagem;
  - botões para criar evento, abrir cartas e recarregar catálogo.

### 9. Configurações

- Configurações deixou de ser fallback vazio.
- Agora mostra versão, papel atual, mapa, status do catálogo, permissões e estado visual.

### 10. Narrar

- Botão Narrar agora abre IA no modo correto, preenche contexto com mapa/local selecionado e dispara narração com delay de 80ms.
- Mantida restrição: apenas Mestre pode publicar narração oficial.

## Backend

- `APP_VERSION` atualizado para `v19.6.6-recuperacao-jogabilidade-paineis-ia`.
- Endpoint `/rooms/{room_id}/ai/request` permite que qualquer membro da sala crie pedidos do tipo `question`.
- Pedidos de narração/evento/resumo/imagem continuam restritos a Mestre/Ajudante, e narração oficial segue exclusiva da Mestre.

## Testes executados

```bash
python -m py_compile main.py local_worker.py
node -c script.js
python -c "import main; print(main.APP_VERSION)"
python -c "import json; json.load(open('assets/cards/catalog.json', encoding='utf-8'))"
```

Todos passaram.

## Observação honesta

Não foi feito teste visual completo no navegador com três usuários reais simultâneos. A versão foi validada por análise de código e testes de sintaxe/importação. O próximo teste recomendado é abrir a sala como Mestre, Ajudante e Jogadora e clicar todos os botões da barra inferior.
