## Diagnóstico

O erro `Invalid key` do Supabase Storage acontece porque o nome do arquivo (`Acesso Cidadão.pdf`) tem espaço e caractere acentuado (`ã`). As chaves do Storage só aceitam caracteres seguros (letras, números, `.`, `_`, `-`, `/`).

Hoje em `DocumentsTab.tsx` o caminho é montado direto com `file.name`, sem sanitização.

## Plano

1. Em `src/components/documents/DocumentsTab.tsx`, sanitizar o nome do arquivo antes de montar o `path` do upload:
   - Remover acentos (NFD + strip diacríticos).
   - Substituir espaços e caracteres não permitidos por `-`.
   - Preservar a extensão original.
2. Manter o `name` original (digitado pelo usuário) na coluna `name` da tabela `documents`, para exibição amigável.
3. Mostrar mensagem de erro clara caso o upload falhe.

Sem mudanças de banco e sem mudanças em outras telas.