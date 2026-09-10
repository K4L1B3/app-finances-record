import { createClient } from '@/lib/supabase/server';
import FinanceApp from '@/components/finance-app';
import Login from '@/components/login';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? <FinanceApp /> : <Login />;
}
