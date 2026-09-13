import { getStore, writeSettings, ConflictError } from '@/lib/db';
import { guard, json, readJson } from '@/lib/http';
import { settingsRequest } from '@/lib/validation';
export const runtime = 'nodejs';
export async function PUT(request: Request) {
  const g = await guard(request, true);
  if ('error' in g) return g.error;
  try {
    const parsed = settingsRequest.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: 'Confira as metas e os saldos informados.' }, 400);
    const { settings, version } = parsed.data;
    const old = await getStore(g.supabase, g.userId);
    // Moving the start earlier is allowed (retroactive months); later than the first saved month would orphan it.
    if (old.months.length && settings.startMonth > old.months[0].month) {
      return json(
        { error: 'O início do acompanhamento não pode ser posterior ao primeiro mês salvo.' },
        400,
      );
    }
    const settingsVersion = await writeSettings(g.supabase, g.userId, settings, version);
    return json({ settings, settingsVersion });
  } catch (e) {
    return json(
      { error: e instanceof ConflictError ? e.message : 'Não foi possível salvar as configurações.' },
      e instanceof ConflictError ? 409 : 400,
    );
  }
}
