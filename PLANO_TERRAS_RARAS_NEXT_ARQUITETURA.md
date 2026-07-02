# Terras Raras Next — Plano de arquitetura paralela

## Decisão
A base atual passa a ser tratada como protótipo funcional. Ela só receberá hotfixes críticos para testes com jogadoras.

O produto final será refeito em arquitetura limpa: `terras-raras-next`.

## Princípios
1. Nenhum arquivo monolítico gigante.
2. Frontend dividido por telas/componentes.
3. Backend dividido por módulos.
4. Cânone separado do código.
5. Assets catalogados por mapa/personagem/carta.
6. Testes mínimos antes de cada release.
7. Layout aprovado implementado desde o início, não enxertado depois.

## Estrutura sugerida

```txt
terras-raras-next/
  backend/
    app/
      main.py
      core/
        config.py
        security.py
        database.py
      auth/
        routes.py
        google_oauth.py
        models.py
      rooms/
        routes.py
        models.py
        service.py
      maps/
        routes.py
        service.py
      cards/
        routes.py
        service.py
      ai/
        routes.py
        worker_contract.py
        prompts.py
      canon/
        terras_raras/
          personagens.json
          mapas/
            cidade_relogios.json
          cartas/
            cidade_relogios.json
      tests/
        test_auth.py
        test_rooms.py
        test_ai_jobs.py

  frontend/
    src/
      app/
      components/
        ShellGame.tsx
        TopNav.tsx
        BottomNav.tsx
        SidePanel.tsx
        MapBoard.tsx
        CharacterGrid.tsx
        CardGallery.tsx
        AIPanel.tsx
      screens/
        Landing.tsx
        Hub.tsx
        GameSession.tsx
      styles/
        theme.css
        layout.css
        cards.css

  assets/
    maps/
    characters/
    cards/
```

## Ordem de construção

### Semana 1
- Auth local + Google OAuth.
- Hub.
- Criar sala.
- Entrar como Mestre/Ajudante/Jogadora.
- Papéis corretos: Mestre/Ajudante sem personagem.

### Semana 2
- Sessão básica.
- Mapa 03 Cidade dos Relógios Parados.
- Hotspots.
- Painel lateral funcional.
- Troca de mapa só depois de consolidar.

### Semana 3
- Personagens e cartas.
- Grade 6x2.
- Cartas do mapa e cartas dos jogadores.
- Inventário/diário básico.

### Semana 4
- IA local.
- Worker.
- Narrar cena.
- Respostas no painel.
- Publicar no chat/diário/local.
- Testes automatizados.

## Regra para a base antiga
A base antiga não receberá:
- novo layout global;
- novos mapas;
- refatoração grande;
- monetização;
- novas features estruturais.

Só hotfixes:
- IA;
- mapa não abrir;
- botão crítico quebrado;
- asset faltando.
