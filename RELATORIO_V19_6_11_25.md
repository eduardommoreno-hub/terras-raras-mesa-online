# RELATÓRIO v19.6.11.25 — Baralho da Fábrica dos Doces Pesadelos

## Status
Baralho completo da zona 2 criado e integrado de forma não destrutiva.

## Incluído
- `assets/cards/fabrica_doces/baralho_fabrica_doces.json`
- `assets/cards/fabrica_doces/BARALHO_FABRICA_DOCES.md`
- `assets/cards/fabrica_doces/manifest.json`
- 12 artes padronizadas `.webp` das cartas oficiais
- Constante de baralho no `main.py`
- Dados do baralho injetados no `index.html`
- Funções auxiliares no `script.js`:
  - `getFabricaCard(cardId)`
  - `getFabricaCardsByLocation(locationId)`

## 12 cartas oficiais
1. Porta do Confeiteiro — Portal — `porta_do_confeiteiro`
2. Brigadeiro Vigilante — Ameaça — `brigadeiro_vigilante`
3. Bolha da Risada Perdida — Pista — `bolha_da_risada_perdida`
4. Mentira Amarga — Pista — `mentira_amarga`
5. Calda da Ilusão — Evento — `calda_da_ilusao`
6. Mãos Mecânicas — Desafio — `maos_mecanicas`
7. Crianças Perdidas — Evento — `criancas_perdidas`
8. Vela sem Nome — Revelação — `vela_sem_nome`
9. Receita Esquecida — Revelação — `receita_esquecida`
10. Ponte de Caramelo — Desafio — `ponte_de_caramelo`
11. Diário da Confeiteira — Segredo — `diario_da_confeiteira`
12. Escolha do Sabor — Decisão — `escolha_do_sabor`

## Observação
As cartas agora existem como baralho final funcional e estruturado. As artes são padronizadas em estilo de carta cinematográfica. As ilustrações de local individuais continuam sendo a próxima etapa separada.

## Segurança
Sem alteração destrutiva no banco.
Sem alteração no worker local.
Sem troca de arquitetura.
Sem mudança em Railway/Ollama.
