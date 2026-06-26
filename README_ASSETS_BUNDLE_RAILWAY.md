# v19.6.11.18 — Assets Bundle Railway

Esta versão leva `assets_bundle.zip` na raiz. Se `/app/assets` não existir no Railway, o servidor extrai automaticamente o bundle para `/tmp/terras_raras_assets/assets` e monta `/assets` dali.

Depois do deploy, teste:

`/debug/assets`

Resultado esperado:

`assets_exists: true`
`assets_bundle_exists: true`
`missing: []`
