## Problema

Os valores monetários (price, target, funding) estão sendo exibidos como inteiros ($8 em vez de $7.87) porque `fmtUsd` usa `maximumFractionDigits: 0`. O banco já armazena `numeric` com casas decimais — o problema é só de formatação e exibição.

## Mudanças

### 1. `src/lib/platform.ts` — formatadores
- `fmtUsd(n)`: padrão passa a mostrar 2 casas (`minimumFractionDigits: 2, maximumFractionDigits: 2`).
- Adicionar `fmtUsdCompact(n)` para casos onde queremos sem decimais (ex.: KPIs grandes), e usar nesses pontos específicos se necessário.
- `fmtNum(n, decimals?)`: aceitar opcionalmente número de casas decimais (default 0, mantém compat).

### 2. `src/components/ui/currency-input.tsx`
- Já aceita decimais (`.` com até 2 casas) — manter.
- Adicionar `onBlur` que normaliza (ex.: "7.8" → "7.80") para clareza visual, sem alterar o hidden value bruto.

### 3. Telas que exibem moeda
Revisar e usar `fmtUsd` (agora com 2 casas) em:
- `src/pages/app/Products.tsx` (Price, Target na tabela)
- `src/pages/app/ProductDetail.tsx`
- `src/pages/app/Dashboard.tsx` (KPIs — manter compacto sem decimais para "Total funding"; price unitário com decimais)
- `src/pages/app/Tokens.tsx`
- `src/pages/public/Catalog.tsx` e `CatalogProduct.tsx`

Onde for KPI agregado grande (ex.: Total funding $1,234,567), usar `fmtUsdCompact`. Onde for preço unitário, usar `fmtUsd` com 2 casas.

## Fora de escopo

- Mudar tipos do banco (já são `numeric`, suportam float).
- Suporte a múltiplas moedas.
- `total_supply` continua `bigint` (quantidade inteira de tokens).
