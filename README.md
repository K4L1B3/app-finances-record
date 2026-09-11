# Meu Financeiro

Aplicação Next.js com autenticação e persistência no Supabase. Use Node.js 24 e npm.

## Publicar na Vercel

1. No Supabase, execute `supabase/migrations/20260911000000_finance.sql` no SQL Editor. As tabelas usam RLS para limitar os dados ao usuário autenticado.
2. Crie seu usuário em Authentication → Users, com e-mail confirmado e senha. Desative cadastros públicos se o app for apenas pessoal.
3. Importe o repositório na Vercel, selecione Next.js e Node.js 24.x. Use `npm ci` para instalar e `npm run build` para compilar.
4. Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas variáveis do ambiente desejado antes do build. Use a chave pública anon, nunca a service role.
5. Faça o deploy e entre com o usuário do Supabase.

Referências: [variáveis na Vercel](https://vercel.com/docs/environment-variables), [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Desenvolvimento e validação

Copie `.env.example` para `.env.local`, preencha os valores e execute `npm ci` e `npm run dev`.

Execute `npm test`, `npm run build`, `npm run typecheck` e `node tests/api-smoke.mjs`.
O smoke test usa um servidor Supabase simulado; não altera contas ou dados reais.

Os scripts antigos de setup, senha, backup e restauração SQLite são legados e não configuram o Supabase. Dados existentes no SQLite não são migrados automaticamente. O backup atual é exportado pela interface autenticada.
