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
  if uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.companies (name, slug, created_by)
    values (_name, _slug, uid)
    returning id into new_id;
  insert into public.company_members (company_id, user_id, role)
    values (new_id, uid, 'owner');
  return new_id;
end;
$$;