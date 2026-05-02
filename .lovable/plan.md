## Objetivo

1. Adicionar máscara de moeda (USD) nos campos `Price (USD)` e `Funding target` do formulário "Create tokenized product".
2. Corrigir o visual do foco — o ring azul está sendo cortado pelo `overflow-y-auto` do container do form.

## Mudanças

### 1. Novo componente `src/components/ui/currency-input.tsx`
Input controlado que:
- Aceita `value` numérico (ou `defaultValue`) e dispara `onValueChange(number | null)`.
- Mostra valor formatado em USD (`$1,234.56`) durante digitação, mantendo cursor estável.
- Aceita apenas dígitos e um separador decimal; até 2 casas.
- Renderiza um `<input type="hidden" name="...">` com o valor numérico cru (em string) para integrar com o `FormData` do form atual sem refatorar o submit.
- Reaproveita as classes do `Input` shadcn (mesma altura/borda/focus).

### 2. `src/pages/app/Products.tsx`
- Substituir os dois `Input type="number"` de `token_price_usd` e `funding_target_usd` por `CurrencyInput` (com `name` para o hidden).
- Manter `total_supply` como `Input type="number"` (é quantidade, não moeda).
- Corrigir o clipping do focus ring:
  - Remover `overflow-y-auto` agressivo + adicionar padding lateral/vertical no scroll container, ou
  - Trocar `pr-2` por `p-1 -m-1` no wrapper interno para dar respiro ao ring (`focus-visible:ring-offset-2` precisa de espaço fora do input).
  - Garantir que o `DialogContent` tenha padding suficiente; o scroll fica em um `<div>` interno com `px-1 py-1`.

### 3. Estilo consistente
- Não alterar tokens globais. Apenas ajustes locais de padding/overflow.
- Símbolo `$` como prefixo visual dentro do `CurrencyInput` (cinza, não interativo) para ficar claro que é moeda.

## Fora de escopo
- Outros formulários do app (pode ser feito depois se quiser).
- Suporte a múltiplas moedas — fixo em USD por enquanto.
