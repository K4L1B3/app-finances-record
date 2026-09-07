import {getStore} from '@/lib/db';import {guard} from '@/lib/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const error=await guard(request);if(error)return error;return new Response(JSON.stringify({format:'meu-financeiro',version:1,exportedAt:new Date().toISOString(),...getStore()},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="meu-financeiro-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store'}});}
