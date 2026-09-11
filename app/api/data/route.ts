import { getStore } from '@/lib/db';
import { guard, json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const g = await guard(request);
    if ('error' in g) return g.error;
    return json(await getStore(g.supabase, g.userId));
  } catch {
    return json({ error: 'Não foi possível carregar os dados. Confira a configuração do Supabase no servidor.' }, 503);
  }
}
