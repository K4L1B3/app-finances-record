import {getStore,writeMonth,ConflictError} from '@/lib/db';import {guard,json,readJson} from '@/lib/http';import {monthSchema} from '@/lib/validation';import {CATEGORIES,missing} from '@/lib/finance';
export const runtime='nodejs';
export async function PUT(request:Request){const error=await guard(request,true);if(error)return error;try{
 const parsed=monthSchema.safeParse(await readJson(request));if(!parsed.success)return json({error:'Confira os valores informados.'},400);const month=parsed.data,settings=getStore().settings;
 for(const c of CATEGORIES){if((month.planned[c.id]??0)<0||(settings.kinds[c.id]!=='saving'&&(month.actual[c.id]??0)<0))return json({error:'Somente aportes líquidos podem ser negativos.'},400);}
 if(month.month<settings.startMonth)return json({error:'O mês precisa ser igual ou posterior ao início do acompanhamento.'},400);
 if(month.status==='closed'&&missing(month,settings).length)return json({error:'Preencha todas as categorias não neutras antes de fechar o mês. Use zero quando não houve movimento.'},400);
 return json(writeMonth(month));}catch(e){return json({error:e instanceof ConflictError?e.message:'Não foi possível salvar o mês.'},e instanceof ConflictError?409:400);}}
