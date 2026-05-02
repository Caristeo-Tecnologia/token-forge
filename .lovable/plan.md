## Objetivo

1. Workflow de **aprovação de projetos** (similar ao de produtos).
2. Reforçar o fluxo de **aprovação de produtos** já existente e expor melhor.
3. Aba **Documentos** dentro de cada projeto e produto, com upload (público/privado).
4. Mostrar documentos públicos na **página pública do catálogo** (`/catalog/:id`).
5. Manter/melhorar a **simulação de compra anônima** (já existente) gerando token + holding vinculado por bearer code.

## 1. Banco de dados (migração)

### Enum `project_status`
Hoje: `planning, active, completed, paused`. Adicionar:
- `under_review`
- `approved`
(mantém os existentes; novo padrão continua `planning`)

### Trigger de timestamp em `projects`
Adicionar colunas `approved_at`, `published_at` (nullable timestamps) — opcionalmente só `approved_at`. Padronizar com `products`.

### Storage bucket público `documents`
- Criar bucket `documents` com `public = true` (URLs públicas para arquivos marcados como `is_public`).
- Path convencional: `{company_id}/{project_id ou product_id}/{uuid}-{filename}`.
- Policies em `storage.objects`:
  - **SELECT público** quando `bucket_id = 'documents'` (qualquer um lê — controlamos visibilidade pelo registro em `public.documents.is_public`; arquivos privados nunca terão URL exposta no frontend).
  - **INSERT** quando autenticado e `has_company_role` no `company_id` derivado do primeiro segmento do path (`(storage.foldername(name))[1]::uuid`).
  - **DELETE** mesma regra (admins/owners da company).

> Tabela `public.documents` já existe com `is_public`, `category`, `file_url`, `project_id`, `product_id`, RLS configurada.

## 2. Aprovação de projetos

`src/pages/app/ProjectDetail.tsx`:
- Adicionar `StatusBadge` no header (já tem) e botão "Submit for review" / "Approve" / "Activate" baseado no status, igual ao padrão de `ProductDetail`.
- Mapa `NEXT`:
  - `planning` → `under_review` ("Submit for review")
  - `under_review` → `approved` ("Approve") — só `owner`/`admin`
  - `approved` → `active` ("Activate")
- Gravar `approved_at` quando entra em `approved`.
- `logAudit` em cada transição.
- Restrição: só permite criar produtos publicáveis se projeto estiver `approved` ou `active` (validação leve no client; no server bloqueamos via trigger separadamente — fora do escopo agora, manter validação client-side).

## 3. Aba Documentos em projeto e produto

### Componente reutilizável `src/components/documents/DocumentsTab.tsx`
Props: `{ companyId, scope: { projectId?, productId? }, canManage }`.

Funcionalidades:
- Lista documentos filtrados por `company_id` + (`project_id` ou `product_id`).
- Coluna: nome, categoria, versão, público/privado, data, ações (download, delete).
- Botão "Upload document" abre dialog:
  - Inputs: arquivo, nome (auto do filename), categoria (select: `legal`, `financial`, `technical`, `report`, `other`), `is_public` (switch).
  - Fluxo: upload no bucket `documents` → pegar `publicUrl` (se público) ou `path` (se privado, gerar signed URL on-demand) → insert em `public.documents`.
- Download: se público, usa `getPublicUrl`; se privado, `createSignedUrl(60)`.

### Integração nas páginas
- `ProjectDetail.tsx`: adicionar abas (`Tabs` shadcn) com "Products" e "Documents". Documents usa `DocumentsTab` com `scope={{ projectId: id }}`.
- `ProductDetail.tsx`: adicionar `Tabs` "Overview" / "Documents". Documents usa `scope={{ productId: id }}`.
- A página `/app/documents` (global) passa a listar todos os docs da company com filtros — atualização opcional, manter atual no início.

## 4. Documentos públicos no catálogo

`src/pages/public/CatalogProduct.tsx`:
- Buscar documentos públicos: `from('documents').select().eq('product_id', id).eq('is_public', true)` + os do projeto pai (`project_id` do produto, mesmo filtro).
- Nova seção "Public documents" com lista e botão "Open" (link `file_url`).
- RLS já permite leitura pública via policy `documents_public_view`.

## 5. Compra simulada (já existe — pequenas melhorias)

Hoje em `CatalogProduct.tsx`:
- Insere `token_transactions` (`tx_type: sale`) com `mock_tx_hash`.
- Insere `token_holdings` com `bearer_code`.
- Atualizar `smart_contracts.tokens_sold` (não está fazendo!) — adicionar `update` incrementando `tokens_sold` por `amount`. Como RLS atual só permite update por members, usar uma **RPC `record_token_sale(_product_id, _amount, _bearer_code, _tx_hash)`** `SECURITY DEFINER` que faz tx + holding + bumps `tokens_sold` atomicamente. Validações dentro:
  - Produto deve estar `published`.
  - `amount > 0` e `<= supply_issued - tokens_sold`.
  - Retorna `bearer_code` e `tx_hash`.
- Frontend chama `supabase.rpc('record_token_sale', …)` ao invés dos 2 inserts manuais.

## Arquivos afetados

- **Migração**:
  - `ALTER TYPE project_status ADD VALUE 'under_review' / 'approved'`.
  - `ALTER TABLE public.projects ADD COLUMN approved_at`.
  - Criar bucket `documents` + policies.
  - Função `record_token_sale` (SECURITY DEFINER).
- **Novo**: `src/components/documents/DocumentsTab.tsx`, `src/components/documents/UploadDialog.tsx`.
- **Editar**: `ProjectDetail.tsx` (status workflow + tabs + documents), `ProductDetail.tsx` (tabs + documents), `CatalogProduct.tsx` (docs públicos + RPC de compra).

## Fora de escopo
- Versionamento manual de documentos (campo `version` fica em 1).
- Convite/email para usuários.
- Pagamento real Solana (mantém simulado).
- Trigger DB para impedir publish de produto sem projeto approved (validação só no client).
