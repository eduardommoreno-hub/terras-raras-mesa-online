# Terras Raras — Mesa Online Profissional

Projeto limpo para Railway: FastAPI + PostgreSQL + WebSocket + frontend integrado.

## Login inicial

- Usuário: `eduardo`
- Senha: `admin123`

Troque no Railway usando variáveis:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `DATABASE_URL` gerado pelo PostgreSQL do Railway

## Railway

1. Crie um novo projeto no Railway.
2. Adicione um serviço PostgreSQL.
3. Crie um serviço a partir do GitHub com estes arquivos na raiz.
4. Defina as variáveis `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`.
5. Faça deploy.
6. Teste `/health`.

## Cadastro autorizado

As jogadoras fazem cadastro, mas ficam como `pendente`. O admin acessa o painel e aprova.

## Funcionalidades

- Login e cadastro com aprovação manual.
- Salas por código.
- Mestre e participantes.
- Personagens.
- Mapas por zonas.
- Tokens arrastáveis no mapa.
- Posição salva no banco.
- Chat.
- Diário da mesa.
- WebSocket para atualizar todas as telas em tempo real.

## Atualização: sair da sala

Esta versão adiciona a rota `POST /rooms/{room_id}/leave` e botões no frontend para a jogadora sair da sala. Ao sair, a sala deixa de aparecer em "Minhas mesas". Se a Mestre sair e houver outras jogadoras, a primeira participante remanescente é promovida a Mestre. Se a sala ficar vazia, ela é encerrada.
