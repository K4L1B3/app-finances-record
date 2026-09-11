import { getStore } from '@/lib/db';
import { guard, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const g = await guard(request);
  if ('error' in g) return g.error;
  try {
  const store = await getStore(g.supabase, g.userId);
  return new Response(
    JSON.stringify({ format: 'meu-financeiro', version: 1, exportedAt: new Date().toISOString(), ...store }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="meu-financeiro-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    },
  );
  } catch {
    return json({ error: 'Não foi possível exportar os dados. Tente novamente.' }, 503);
  }
}
