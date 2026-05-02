## Objetivo

Permitir clicar num card de projeto na lista `/app/projects` e abrir uma página de detalhes com info do projeto + lista de produtos vinculados.

## Mudanças

### 1. Nova página `src/pages/app/ProjectDetail.tsx` em `/app/projects/:id`
Conteúdo:
- Header: nome, tipo, status (StatusBadge), descrição, data de criação.
- Ações (se `canWrite`): botão "Edit" (abre dialog reutilizando os mesmos campos do create — nome/tipo/descrição) e "+ New Product" (abre o mesmo fluxo de criação de produto, já com `project_id` pré-selecionado).
- Ação destrutiva (se `canDelete`): botão "Delete project" no canto.
- Seção "Products": tabela com mesmas colunas da página `/app/products` (Product, Token model, Supply, Price, Target, Status), linhas clicáveis levando a `/app/products/:id`.
- Empty state quando não houver produtos: CTA "Create first product" abre o dialog de novo produto.
- Filtra por `company_id = activeCompany.id AND project_id = :id` (RLS já garante isolamento).
- Title: `${project.name} · Aetheria`.
- Breadcrumb simples: `← Projects` no topo.

### 2. `src/App.tsx`
Adicionar rota:
```tsx
<Route path="projects/:id" element={<ProjectDetail />} />
```
dentro do bloco `/app`.

### 3. `src/pages/app/Projects.tsx`
- Envolver cada card em um `<Link to={\`/app/projects/${p.id}\`}>` (ou `useNavigate`) mantendo o card visualmente igual.
- Botão de delete continua dentro do card mas com `e.preventDefault(); e.stopPropagation();` para não navegar.
- Hover: cursor-pointer e leve elevação (já existe via `group`).

### 4. Reuso do form de produto
O dialog de criação de produto está hoje só em `Products.tsx`. Para reusar em `ProjectDetail.tsx` sem duplicar, extrair em um componente:
- **Novo**: `src/components/products/ProductForm.tsx` — dialog com props `{ open, onOpenChange, projects, defaultProjectId?, onCreated }`.
- Atualizar `Products.tsx` para usar esse componente.
- `ProjectDetail.tsx` usa o mesmo componente passando `defaultProjectId={id}` e `projects=[currentProject]` (lista travada num único item).

## Fora de escopo
- Edit inline de produtos.
- Métricas agregadas do projeto (funding raised etc.) — pode ser feito depois.
- Upload de capa/imagem do projeto.
