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
