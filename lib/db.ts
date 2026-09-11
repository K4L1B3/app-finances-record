import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS, type Month, type Settings, type Store } from './finance';

export class ConflictError extends Error {}

export async function getStore(supabase: SupabaseClient, userId: string): Promise<Store> {
  let { data: settingsRow, error: settingsError } = await supabase
    .from('settings')
    .select('data, version')
    .eq('user_id', userId)
    .maybeSingle();
  if (settingsError) throw settingsError;

  if (!settingsRow) {
    const { error: insertError } = await supabase
      .from('settings')
      .upsert({ user_id: userId, data: DEFAULT_SETTINGS, version: 1 }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data: initialized, error: readError } = await supabase
      .from('settings').select('data, version').eq('user_id', userId).single();
    if (readError) throw readError;
    settingsRow = initialized;
  }

  const { data: monthRows, error: monthsError } = await supabase
    .from('months')
    .select('data, version')
    .eq('user_id', userId)
    .order('month');
  if (monthsError) throw monthsError;

  return {
    settings: settingsRow.data as Settings,
    settingsVersion: settingsRow.version as number,
    months: (monthRows ?? []).map(
      (row) => ({ ...(row.data as Month), version: row.version as number }) as Month,
    ),
  };
}

export async function writeMonth(supabase: SupabaseClient, userId: string, month: Month) {
  if (month.version === 0) {
    const created = { ...month, version: 1 };
    const { data, error } = await supabase
      .from('months')
      .insert({ user_id: userId, month: month.month, data: created, version: 1 })
      .select('data, version')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictError(
          'Este mês foi criado em outra aba. Recarregue os dados antes de salvar novamente.',
        );
      }
      throw error;
    }
    return { ...(data.data as Month), version: data.version as number };
  }

  const next = { ...month, version: month.version + 1 };
  const { data, error } = await supabase
    .from('months')
    .update({ data: next, version: next.version })
    .eq('user_id', userId)
    .eq('month', month.month)
    .eq('version', month.version)
    .select('data, version')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ConflictError(
      'Este mês foi alterado em outra aba. Recarregue os dados antes de salvar novamente.',
    );
  }
  return { ...(data.data as Month), version: data.version as number };
}

export async function writeSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings,
  version: number,
) {
  const nextVersion = version + 1;
  const { data, error } = await supabase
    .from('settings')
    .update({ data: settings, version: nextVersion, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('version', version)
    .select('version')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new ConflictError('As configurações foram alteradas em outra aba. Recarregue antes de salvar.');
  }
  return data.version as number;
}
