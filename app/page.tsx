import {authenticated} from '@/lib/auth';
import FinanceApp from '@/components/finance-app';
import Login from '@/components/login';
export const dynamic='force-dynamic';export const runtime='nodejs';
export default async function Page(){return await authenticated()?<FinanceApp/>:<Login/>;}
