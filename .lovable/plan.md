## Problema

Ao criar a conta + empresa em duas etapas separadas, o insert em `companies` está falhando com "new row violates row-level security policy". Além disso, o usuário quer:
1. Criar usuário e empresa **juntos**, em um único fluxo.
2. Botão de mostrar/ocultar senha no formulário.

## Solução

### 1. RPC atômica `signup_with_company` (SECURITY DEFINER)

Criar uma função no banco que, executada pelo usuário recém-autenticado, cria em uma única transação:
- a `company` (com `created_by = auth.uid()`)
- o registro em `company_members` com role `owner`

Como `SECURITY DEFINER`, ela bypassa RLS de forma controlada, validando `auth.uid()` internamente. Isso elimina o problema de RLS em duas etapas e garante atomicidade (sem usuário "órfão" sem empresa).

```sql
create or replace function public.create_company_with_owner(_name text, _slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.companies (name, slug, created_by)
    values (_name, _slug, uid) returning id into new_id;
  insert into public.company_members (company_id, user_id, role)
    values (new_id, uid, 'owner');
  return new_id;
end;
$$;
```

### 2. Fluxo unificado de signup

Reescrever `src/pages/Auth.tsx` aba "Create account" para coletar em um único formulário:
- Nome completo
- Email
- Senha (com botão de visualização)
- Nome da empresa
- Slug da empresa (auto-gerado a partir do nome, editável)

Fluxo no submit:
1. `supabase.auth.signUp(...)` → como auto-confirm está ligado, já loga imediatamente.
2. Aguardar a sessão e chamar `supabase.rpc('create_company_with_owner', { _name, _slug })`.
3. `refreshMemberships()` + `setActiveCompanyId(novoId)` → redireciona para `/app`.

A página `/onboarding` continua existindo para usuários que quiserem criar empresas adicionais depois (botão "+ New company" no header já leva para lá). Atualizar `Onboarding.tsx` para também usar a RPC, eliminando o erro de RLS que está acontecendo agora.

### 3. Botão de mostrar/ocultar senha

Criar componente reutilizável `PasswordInput` em `src/components/ui/password-input.tsx` baseado no `Input` existente, com ícone `Eye`/`EyeOff` (lucide-react) à direita que alterna `type` entre `password` e `text`. Usar nas abas de signin e signup.

## Arquivos afetados

- **Migração nova**: função `public.create_company_with_owner`.
- **Novo**: `src/components/ui/password-input.tsx`.
- **Editar**: `src/pages/Auth.tsx` (form unificado + PasswordInput).
- **Editar**: `src/pages/Onboarding.tsx` (usar a RPC ao invés de dois inserts).

## Fora do escopo

- Não vou alterar o esquema das tabelas nem as policies existentes (a RPC contorna o problema de forma segura).
- Não vou mexer em outros formulários ou no design system.