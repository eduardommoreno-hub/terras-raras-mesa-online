# Terras Raras v19.6.7 — Correção de fluxo real de mesa

Correções implementadas a partir dos 10 problemas observados em teste real:

1. Hotspots da Floresta Negra reposicionados sobre as casas/locais do mapa e stage do mapa fixado em proporção 16:9 para coordenadas não deslocarem.
2. Central de Cartas da Mestre/Ajudante com seleção robusta de jogadora/personagem, incluindo jogadoras sem personagem.
3. Cartas de Jogo, Eventos e Biblioteca agora têm overlay fixo, corpo rolável, botão Fechar no topo e rodapé Voltar para o jogo.
4. Inventário mostra todos os jogadores/personagens para Mestre/Ajudante e detalhes do selecionado.
5. Aba Jogadoras inclui escolha/atribuição de personagem e ações rápidas.
6. Central da Mestre redireciona botões para overlays/painéis funcionais.
7. Eventos e Biblioteca foram reabertos como painéis amplos fecháveis e roláveis.
8. Configurações abre painel próprio com status de versão, papel, mapa e catálogo.
9. Botão Narrar agora ativa modo de narração: primeiro abre a IA, depois o usuário clica em um ponto do mapa, e então a IA prepara o prompt do local.
10. Backend recebeu endpoint de atribuição de personagem por Mestre/Ajudante e versão atualizada.

Testes obrigatórios executados:

```bash
python -m py_compile main.py local_worker.py
node -c script.js
python -c "import main; print(main.APP_VERSION)"
python -c "import json; json.load(open('assets/cards/catalog.json', encoding='utf-8'))"
```

Observação: validação visual completa com múltiplos perfis ainda deve ser feita no navegador.
