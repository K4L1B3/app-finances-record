import {getStore,writeSettings,ConflictError} from '@/lib/db';import {guard,json,readJson} from '@/lib/http';import {settingsRequest} from '@/lib/validation';
export const runtime='nodejs';
export async function PUT(request:Request){const error=await guard(request,true);if(error)return error;try{
 const parsed=settingsRequest.safeParse(await readJson(request));if(!parsed.success)return json({error:'Confira as metas e os saldos informados.'},400);
 const {settings,version}=parsed.data,old=getStore();if(old.months.length&&settings.startMonth!==old.settings.startMonth)return json({error:'A data inicial não pode mudar depois de salvar meses. Os saldos iniciais pertencem a essa data.'},400);
 const settingsVersion=writeSettings(settings,version);return json({settings,settingsVersion});}catch(e){return json({error:e instanceof ConflictError?e.message:'Não foi possível salvar as configurações.'},e instanceof ConflictError?409:400);}}
