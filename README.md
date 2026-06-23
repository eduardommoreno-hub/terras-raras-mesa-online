
## v9.7.2 — polimento de segurança

Ajustes sobre a v9.7.1:

- O diário manual da Mestre (`/rooms/{room_id}/notes`) agora passa pelo filtro infantil.
- Usuária silenciada também não consegue salvar diário manual enquanto o silêncio estiver ativo.
- O filtro passou a bloquear evasões simples com espaços em telefones e e-mails.
- O mascaramento dos logs evita gravar contatos digitados com espaços para burlar o filtro.

# Terras Raras — Mesa Online

Versão: **v8.9-master-ai-actions**

RPG online de sobrevivência com FastAPI, PostgreSQL/Railway, frontend integrado e IA local via Ollama.

## Estado desta versão

A v8.9 mantém a base validada:

- login e cadastro;
- salas de jogo;
- papéis da mesa: Mestre, Ajudante da Mestre e Jogadora;
- bastidores privados entre Mestre e Ajudante;
- mapa interativo com caminhos e locais;
- worker local com Ollama;
- status do worker na aba IA.

## Novidades da v8.9

A aba IA agora virou ferramenta prática da Mestre/Ajudante:

- **Enviar ao Chat**: publica a resposta aprovada no chat geral.
- **Salvar no Diário**: salva a resposta no Diário da Mestre.
- **Usar como descrição do local**: aplica a resposta da IA ao ponto selecionado no mapa.
- **Limpar concluídos**: limpa respostas concluídas/canceladas/erro da aba IA sem apagar chat, diário ou descrições já aplicadas.
- Respostas separadas em: pendentes/processando, concluídas e erros/canceladas.

## Como rodar localmente

1. Instale dependências:

```bash
pip install -r requirements.txt
```

2. Garanta que o Ollama esteja instalado e com o modelo:

```bash
ollama pull llama3.1:8b
```

3. No Windows, clique em:

```bat
iniciar_tudo.bat
```

Ele abre:

- servidor do jogo em `http://127.0.0.1:8000`;
- worker local da IA;
- navegador.

## Login local padrão

```text
usuário: eduardo
senha: admin123
```

No Railway, use as variáveis configuradas no painel.

## Arquivos principais

- `main.py` — backend FastAPI;
- `index.html` — frontend integrado;
- `local_worker.py` — worker local que consulta o jogo e chama o Ollama;
- `iniciar_tudo.bat` — liga servidor + worker + navegador;
- `iniciar_jogo.bat` — liga somente servidor local;
- `iniciar_worker.bat` — liga somente worker local;
- `requirements.txt` — dependências;
- `Procfile`, `railway.json` — deploy Railway.

## Teste recomendado

1. Rodar `iniciar_tudo.bat`.
2. Fazer login.
3. Criar/entrar em sala como Mestre.
4. Selecionar um ponto do mapa.
5. Abrir aba IA.
6. Clicar em Narrar local.
7. Após resposta pronta, testar:
   - Enviar ao Chat;
   - Salvar no Diário;
   - Usar como descrição do local;
   - Limpar concluídos.

## Próximo passo sugerido

v9.0 — Mapas reais das 8 zonas, com locais próprios, eventos e caminhos mais naturais.


## v8.10 — IA Copilota: botão Perguntar
- Novo botão **Perguntar** na aba IA.
- Visível apenas para **Mestre** e **Ajudante**.
- Permite fazer perguntas livres à IA em bastidor, sem publicar automaticamente no chat.


## v8.11 — Publicar IA no chat geral ou nos bastidores
- Respostas da IA agora têm botão **Enviar ao chat geral**.
- Novo botão **Enviar aos bastidores**, visível para uso da Mestre/Ajudante.
- Publicação nos bastidores entra no chat privado de Mestre e Ajudante; jogadoras não veem.
- Mantidos: Salvar no Diário e Usar como descrição do local.


## v8.12 — Editar antes de publicar
- Respostas concluídas da IA aparecem em uma caixa editável.
- Mestre/Ajudante podem ajustar o texto antes de enviar ao chat geral, aos bastidores, salvar no diário ou usar como descrição do local.
- O backend recebe o texto editado e publica exatamente a versão revisada.


## v8.13 — Modo rápido da IA
- Seletor de tamanho: Rápida/curta, Normal e Detalhada.
- Comandos prontos: Abertura, Pista, Susto leve, Consequência, Fala de NPC e Recapitular.
- Prompt mais curto para Perguntar em modo rápido.
- Worker limita `num_predict` no Ollama para acelerar em PCs modestos.


## v8.14 — Funções da Mestre
- A área de IA agora possui subtabs: Perguntar, Funções da Mestre, Respostas e Configuração.
- A aba Funções da Mestre permite escolher funções narrativas em lista, sem encher a tela com botões soltos.
- Funções incluídas: início da sessão, cena de tensão, descoberta, pista, susto leve, consequência, fala de NPC, recapitular, encerramento com gancho, improvisar fuga do plano, enigma e recompensa.
- Mantido modo rápido da IA e publicação editável para chat geral, bastidores, diário e descrição de local.


## v8.15 — Layout responsivo tablet/mobile
- Mantém o layout desktop com mapa à esquerda e painel à direita.
- Em tablet, painel vira gaveta lateral recolhível.
- Em celular, mapa fica em cima e painel/abas ficam abaixo, com botões maiores para toque.
- Abas do painel e da IA foram ajustadas para rolagem/toque em telas pequenas.
- /health retorna v8.15-layout-responsivo.


## v9.0 — Floresta Negra completa
- Floresta Negra expandida para 13 locais.
- Novos tipos de ponto: ruína, reflexo e atalho secreto.
- Cada local tem descrição pública, evento pronto, pista, segredo da Mestre e escolhas possíveis.
- Novo botão **Gerar evento** no painel do local.
- Novo tipo de job da IA: `location_event`.
- Mantidos: modo rápido, edição antes de publicar, chat geral, bastidores, diário, descrição do local e layout responsivo.


## v9.1.1 — Correção do Portal
- Corrige leitura/salvamento do checklist do portal.
- O Portal agora reconhece progresso salvo com chave antiga ou nova.
- Adicionado botão direto **Liberar portal agora** quando o Portal estiver selecionado e ainda fechado.


## v9.1.2 — Hotfix Perguntar
- Corrige regressão visual do botão **Perguntar**.
- Ao clicar em Perguntar ou Narrar cena, a aba **Respostas** abre imediatamente e mostra o status do pedido.
- Mantém a correção do Portal da v9.1.1.


## v9.3 — Encerrar mapa e abrir próxima zona
- Mestre/admin ganhou botão **Encerrar mapa e abrir próxima zona**.
- O backend cria rota `POST /rooms/{room_id}/map/end`.
- Ao encerrar, o mapa atual é marcado como concluído, o portal é liberado e a sala muda para o próximo mapa por `zone_number`.
- Se não houver próxima zona, o sistema avisa que este é o último mapa disponível.


## v9.3.1 — Correção dos botões da resposta da IA
- Corrige botões **Chat geral**, **Bastidores**, **Diário** e **Descrição do local**.
- Troca publicação por listener global com `data-job-id` e `data-target`, reduzindo risco de regressão com `onclick` inline.
- Expõe funções principais no `window` para compatibilidade com HTML/handlers.
- Mostra mensagem de erro clara se a publicação falhar.


## v9.5 — Limite de totens e personagens únicos
- A sala não aceita mais pessoas do que a quantidade de personagens/totens cadastrados.
- Ao entrar, a jogadora recebe automaticamente o primeiro personagem livre.
- Um personagem/totem não pode ser usado por duas pessoas na mesma sala.
- O seletor de personagem mostra personagens já usados como desabilitados.
- Cards de sala pública mostram quantidade de totens em uso.
- `room_state` expõe `token_capacity`, `tokens_used` e `tokens_available`.


## v9.5.1 — Capacidade de totens por sala
- Ajusta `room_token_capacity` para receber `room_id`.
- Cria `eligible_room_characters(db, room_id)` como fonte única de personagens/totens elegíveis para a sala.
- Hoje o comportamento continua igual: todos os personagens globais são elegíveis.
- A estrutura fica preparada para futura filtragem por campanha, mapa, zona ativa ou pacote de personagens da sala.


## v9.7.1 — Ações manuais de segurança do admin
- Adiciona `muted_until` em `RoomPlayer`.
- Painel **Alertas de segurança** ganhou botões:
  - Advertir;
  - Silenciar 10 min;
  - Remover da sala;
  - Bloquear conta.
- Rotas admin:
  - `POST /admin/security/{log_id}/warn`
  - `POST /admin/security/{log_id}/mute`
  - `POST /admin/security/{log_id}/remove`
  - `POST /admin/security/{log_id}/block-user`
- Usuária silenciada continua na sala, mas não consegue enviar chat/bastidores/publicar IA durante o período.
- Remover da sala exclui o vínculo `RoomPlayer`, mas mantém a conta.
- Bloquear conta define `approved=False` e remove a usuária das salas.
- Ações fortes exigem confirmação no frontend.
