import { guard, json } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const g = await guard(request, true);
  if ('error' in g) return g.error;
  await g.supabase.auth.signOut();
  return json({ ok: true });
}
