# RELATÓRIO v19.6 — Mesa dinâmica com cartas por perfil

## Objetivo
Reduzir a poluição visual da mesa, tirar o excesso de botões da lateral e transformar o painel direito em uma área dinâmica que muda conforme o botão principal escolhido abaixo do mapa.

## Principais mudanças

### 1. Barra inferior abaixo do mapa
A Floresta Negra agora usa uma barra principal de navegação abaixo do mapa, com botões de ferramentas:

- Mapa
- Chat
- Cartas
- Inventário
- Diário
- Missões
- Jogadoras
- Personagem
- Jornada
- Central
- Eventos
- Biblioteca
- Bastidores
- IA
- Configurações
- Narrar, apenas para Mestre

### 2. Painel lateral dinâmico
A lateral direita deixa de tentar mostrar tudo ao mesmo tempo. Agora ela abre uma seção por vez, conforme o botão escolhido na barra inferior.

### 3. Cartas por perfil
A aba Cartas muda conforme a função do usuário.

#### Mestre e Ajudante
Têm abas:
- Cartas de Personagem
- Cartas de Jogo
- Usadas: Personagem
- Usadas: Jogo

#### Jogadora
Tem abas:
- Personagem
- Jogo
- Usadas

### 4. Cartas de personagem
A Mestre/Ajudante escolhe uma jogadora/personagem e o sistema mostra somente as cartas daquele personagem. A carta é enviada diretamente ao jogador daquele personagem.

### 5. Cartas de jogo
A Mestre/Ajudante vê cartas do mapa atual, com filtros por tipo:
- Pista
- Susto
- Item
- Evento
- Perigo
- Missão
- Especial

Destinos possíveis:
- Todos
- Uma jogadora
- Jogo/Mesa
- Mestre/Ajudante

### 6. Visual das cartas
As cartas aparecem com imagem visual na lateral. A jogadora pode abrir, guardar e marcar como usada.

### 7. Histórico de usadas
Mestre e Ajudante têm controle das cartas de personagem e cartas de jogo já usadas no mapa.

### 8. Ajudante operacional
A Ajudante pode operar como a Mestre em ações técnicas, incluindo cartas, eventos, inventário, IA de apoio e bastidores.

### 9. Narração exclusiva da Mestre
A narração oficial foi bloqueada para Ajudante:
- Ajudante não pode gerar narração oficial.
- Ajudante não pode publicar resposta de IA no chat geral como narração.
- Ajudante não pode publicar descrição oficial de local.
- Ajudante pode usar IA nos bastidores, perguntar, resumir, preparar conteúdo e operar cartas.

## Backend
Foram adicionados metadados às cartas:
- target_scope
- used_at
- used_by_user_id

Foi criado endpoint:
- POST /rooms/{room_id}/cards/{card_id}/use

O envio de cartas passou a permitir Mestre e Ajudante.

## Validações
- python -m py_compile main.py local_worker.py
- node -c script.js

## Versão
v19.6-mesa-dinamica-cartas-por-perfil
