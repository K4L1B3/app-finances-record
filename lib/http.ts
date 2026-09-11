import { createClient } from './supabase/server';

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function validOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type GuardOk = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };
type GuardFail = { error: Response };

export async function guard(request: Request, mutate = false): Promise<GuardOk | GuardFail> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { error: json({ error: 'Sua sessão expirou. Entre novamente.' }, 401) };
    }
    if (mutate && !validOrigin(request)) {
      return { error: json({ error: 'Origem da solicitação não permitida.' }, 403) };
    }
    return { supabase, userId: data.user.id };
  } catch {
    return { error: json({ error: 'Não foi possível verificar a sessão. Confira a configuração do servidor.' }, 503) };
  }
}

export async function readJson(request: Request, max = 50000) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new Error('Formato de solicitação inválido.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Corpo vazio.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('Solicitação muito grande.');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
