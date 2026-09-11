import { guard, json } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const g = await guard(request, true);
  if ('error' in g) return g.error;
  const { error } = await g.supabase.auth.signOut();
  if (error) return json({ error: 'Não foi possível sair. Tente novamente.' }, 503);
  return json({ ok: true });
}
