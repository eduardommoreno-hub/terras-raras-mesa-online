# Terras Raras — v8.1 Polimento Visual

Atualização focada em conforto para sessões longas:

- Painel lateral reorganizado em abas: Mapa, Jogadoras, Personagem, Chat, Diário e IA.
- Área de leitura mais confortável, com fonte maior e melhor espaçamento.
- Mapa menos “vazio”, com trilhas curvas e textura visual mais natural.
- Marcadores com aparência mais profissional: local, perigo, oculto e portal.
- Floresta Negra ampliada com novos pontos: Poço das Vozes, Ninho de Espinhos e Cabana Vazia.
- Mantém login, salas, PostgreSQL, tokens, IA local via Ollama e worker local.

## Deploy
Substitua no GitHub:

- main.py
- index.html
- requirements.txt
- Procfile
- railway.json
- README.md
- local_worker.py

Depois aguarde o Railway redeployar e confira:

`/debug/admin-env` deve retornar `v8.1-polimento-visual`.
