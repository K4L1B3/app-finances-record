import {logout} from '@/lib/auth';import {guard,json} from '@/lib/http';
export const runtime='nodejs';
export async function POST(request:Request){const error=await guard(request,true);if(error)return error;await logout();return json({ok:true});}
