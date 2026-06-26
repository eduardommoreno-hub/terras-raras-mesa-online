# Terras Raras v19.6.5 — Estabilização de navegação e painéis

Base utilizada: v19.6.4 — Hotfix botões, IA e painéis.

## Objetivo
Estabilizar a mesa atual antes de avançar para novos mapas.

## Implementado

1. Correção da IA para evitar recursão ao abrir/reconstruir subseções.
2. IA mantida com abas: Perguntar, Funções, Respostas e Configuração.
3. Botão Cartas abre overlay amplo sobre o mapa.
4. Cartas da Mestre/Ajudante agora têm aba separada Retiradas/Canceladas.
5. Eventos da Mestre agora abrem em painel amplo próprio sobre o mapa.
6. Biblioteca da Mestre abre em painel amplo próprio, com acesso rápido a cartas e eventos.
7. Botões da barra inferior continuam com fallback: função sem painel cria painel provisório claro.
8. Painel Personagem mantém prévia com imagem real quando disponível.
9. Overlay amplo fecha retornando foco visual ao mapa.
10. CSS de estabilização para cartas grandes, eventos e biblioteca.

## Preservado

- Visual premium dark fantasy dourado.
- Token livre.
- Mestre com narração oficial exclusiva.
- Ajudante operacional sem narração oficial.
- Cartas por perfil.
- Confirmação antes de envio de carta.
- Retirada de cartas com histórico.
- Barra inferior sem rolagem horizontal.
- Painéis amplos para Cartas, Eventos e Biblioteca.

## Testes realizados

```bash
python -m py_compile main.py local_worker.py
node -c script.js
```

## Observação

A validação manual visual completa ainda depende de abrir a mesa no navegador com usuários Mestre/Ajudante/Jogadora.
