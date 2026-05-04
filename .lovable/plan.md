## Diagnóstico

O app não está em loading infinito. Ele redireciona para `/onboarding` porque a consulta de empresas do usuário logado está retornando lista vazia (`[]`). No backend, existe uma empresa (`Mineradora`), mas ela está vinculada a outro usuário. O usuário logado atual é `email@email.com`, com id diferente do usuário dono dessa empresa.

## Plano de correção

1. **Corrigir a guarda de rota para evitar falso onboarding**
   - Adicionar no `AuthContext` um estado separado para saber quando as empresas/memberships já terminaram de carregar.
   - Fazer `RequireCompany` esperar esse carregamento antes de decidir redirecionar.
   - Fazer a tela de onboarding também esperar esse carregamento antes de mostrar o formulário.

2. **Melhorar a experiência quando o usuário realmente não tem empresa**
   - Manter o redirecionamento para `/onboarding` apenas quando a busca terminou e realmente não há empresa vinculada ao usuário atual.
   - Isso evita redirecionamento prematuro por corrida entre autenticação e consulta.

3. **Validar o dado real do usuário atual**
   - Como o usuário logado atual não está vinculado à empresa existente, depois da correção a tela ainda pode continuar em onboarding se esse usuário realmente não tiver empresa.
   - Se a intenção for que `email@email.com` seja dono da empresa `Mineradora`, será necessário vincular esse usuário à empresa existente como `owner` em uma etapa separada de dados.

## Arquivos que serão alterados

- `src/contexts/AuthContext.tsx`
- `src/components/RequireAuth.tsx`
- `src/pages/Onboarding.tsx`

## Resultado esperado

- Usuários com empresa não serão mandados para onboarding por atraso de carregamento.
- Usuários sem empresa continuarão vendo onboarding corretamente.
- O comportamento fica mais claro e previsível após login, refresh e troca de rota.