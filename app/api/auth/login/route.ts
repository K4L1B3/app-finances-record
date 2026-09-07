import {login,validOrigin} from '@/lib/auth';
import {json,readJson} from '@/lib/http';
export const runtime='nodejs';
export async function POST(request:Request){try{
 if(!validOrigin(request))return json({error:'Origem da solicitação não permitida.'},403);
 const body=await readJson(request,2000);if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length>200||body.username.length>100)return json({error:'Usuário ou senha inválidos.'},400);
 const result=await login(body.username,body.password);if(result==='limited')return json({error:'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'},429);if(result!=='ok')return json({error:'Usuário ou senha inválidos.'},401);return json({ok:true});
 }catch{return json({error:'Não foi possível entrar. Confira a configuração do servidor.'},503);}}
