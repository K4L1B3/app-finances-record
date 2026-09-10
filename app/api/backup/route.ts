import { getStore } from '@/lib/db';
import { guard } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const g = await guard(request);
  if ('error' in g) return g.error;
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
}
