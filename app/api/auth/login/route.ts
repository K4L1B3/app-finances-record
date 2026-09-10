import { createClient } from '@/lib/supabase/server';
import { json, readJson, validOrigin } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    if (!validOrigin(request)) return json({ error: 'Origem da solicitação não permitida.' }, 403);
    const body = await readJson(request, 2000);
    if (
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.password.length > 200 ||
      body.email.length > 200
    ) {
      return json({ error: 'E-mail ou senha inválidos.' }, 400);
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return json({ error: 'Confirme seu e-mail antes de entrar.' }, 403);
      }
      if (error.status === 429) {
        return json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, 429);
      }
      return json({ error: 'E-mail ou senha inválidos.' }, 401);
    }
    return json({ ok: true });
  } catch {
    return json({ error: 'Não foi possível entrar. Confira a configuração do servidor.' }, 503);
  }
}
