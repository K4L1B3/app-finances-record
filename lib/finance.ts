export const CATEGORIES = [
  {id:'pets',name:'Animais de Estimação',kind:'expense',icon:'paw'},
  {id:'restaurants',name:'Bares e restaurantes',kind:'expense',icon:'utensils'},
  {id:'shopping',name:'Compras',kind:'expense',icon:'bag'},
  {id:'home',name:'Contas da casa',kind:'expense',icon:'home'},
  {id:'donations',name:'Doações',kind:'expense',icon:'heart'},
  {id:'education',name:'Educação',kind:'expense',icon:'book'},
  {id:'leisure',name:'Entretenimento e Lazer',kind:'expense',icon:'game'},
  {id:'taxes',name:'Impostos, Tarifas e Juros',kind:'expense',icon:'receipt'},
  {id:'investments',name:'Investimentos e Caixinhas',kind:'saving',icon:'piggy'},
  {id:'groceries',name:'Mercado',kind:'expense',icon:'cart'},
  {id:'uncategorized',name:'Não categorizado',kind:'expense',icon:'circle'},
  {id:'payments',name:'Pagamentos',kind:'neutral',icon:'card'},
  {id:'services',name:'Prestadores de serviço',kind:'expense',icon:'tool'},
  {id:'income',name:'Recebimentos',kind:'income',icon:'wallet'},
  {id:'health',name:'Saúde e Cuidados Pessoais',kind:'expense',icon:'cross'},
  {id:'digital',name:'Serviços digitais',kind:'expense',icon:'monitor'},
  {id:'transfers',name:'Transferência',kind:'neutral',icon:'transfer'},
  {id:'transport',name:'Veículo e Transporte',kind:'expense',icon:'car'},
  {id:'travel',name:'Viagens',kind:'expense',icon:'plane'},
] as const;
export type CategoryId = typeof CATEGORIES[number]['id'];
export type Kind = 'expense'|'income'|'saving'|'neutral';
export type Amounts = Record<CategoryId,number|null>;
export interface Settings {
  monthlyGoal:number; emergencyGoal:number|null; businessGoal:number|null;
  emergencyOpening:number; businessOpening:number;
  startMonth:string; kinds:Record<CategoryId,Kind>;
}
export interface Month {month:string; planned:Amounts; actual:Amounts; status:'draft'|'closed'; otherInvestments:number; version:number;}
export interface Store {settings:Settings; settingsVersion:number; months:Month[];}
export const KIND_NAMES:Record<Kind,string>={expense:'Despesa',income:'Receita',saving:'Aporte',neutral:'Neutro'};
export const DEFAULT_SETTINGS:Settings={monthlyGoal:300000,emergencyGoal:null,businessGoal:null,emergencyOpening:0,businessOpening:0,startMonth:'2026-10',kinds:Object.fromEntries(CATEGORIES.map(c=>[c.id,c.kind])) as Record<CategoryId,Kind>};
export function emptyAmounts():Amounts {return Object.fromEntries(CATEGORIES.map(c=>[c.id,null])) as Amounts;}
export function blankMonth(month:string,settings:Settings):Month {const planned=emptyAmounts();planned.investments=settings.monthlyGoal;return {month,planned,actual:emptyAmounts(),status:'draft',otherInvestments:0,version:0};}
export function total(values:Amounts,kind:Kind,settings:Settings) {return CATEGORIES.filter(c=>settings.kinds[c.id]===kind).reduce((n,c)=>n+(values[c.id]??0),0);}
export function hasValues(values:Amounts,settings:Settings,kind?:Kind) {return CATEGORIES.some(c=>values[c.id]!==null&&(kind?settings.kinds[c.id]===kind:settings.kinds[c.id]!=='neutral'));}
export function missing(month:Month,settings:Settings) {return CATEGORIES.filter(c=>settings.kinds[c.id]!=='neutral'&&month.actual[c.id]===null);}
export function summary(month:Month,settings:Settings) {
 const income=total(month.actual,'income',settings),expenses=total(month.actual,'expense',settings),invested=total(month.actual,'saving',settings);
 const reserved=invested-month.otherInvestments;
 return {income,expenses,invested,reserved,balance:income-expenses-invested,remaining:Math.max(0,settings.monthlyGoal-reserved),rate:income>0?reserved/income:null,hasData:hasValues(month.actual,settings),hasIncome:hasValues(month.actual,settings,'income'),hasSaving:hasValues(month.actual,settings,'saving')};
}
export function excesses(month:Month,settings:Settings) {return CATEGORIES.filter(c=>settings.kinds[c.id]==='expense'&&month.actual[c.id]!==null&&month.planned[c.id]!==null).map(c=>({...c,excess:Math.max(0,month.actual[c.id]!-month.planned[c.id]!)})).filter(c=>c.excess>0).sort((a,b)=>b.excess-a.excess);}
export function reserveSnapshot(store:Store,throughMonth:string) {
 const relevant=store.months.filter(m=>m.month>=store.settings.startMonth&&m.month<=throughMonth);
 const contributions=relevant.reduce((n,m)=>n+summary(m,store.settings).reserved,0);
 const accumulated=store.settings.emergencyOpening+store.settings.businessOpening+contributions;
 const emergency=store.settings.emergencyGoal===null?null:Math.min(Math.max(0,accumulated),store.settings.emergencyGoal);
 const business=emergency===null?null:Math.max(0,accumulated-emergency);
 const needed=store.settings.emergencyGoal===null?null:Math.max(0,store.settings.emergencyGoal-(emergency??0));
 const bothNeeded=needed===null||store.settings.businessGoal===null?null:needed+Math.max(0,store.settings.businessGoal-(business??0));
 return {contributions,accumulated,emergency,business,needed,bothNeeded,monthsToEmergency:needed===null||store.settings.monthlyGoal<=0?null:Math.ceil(needed/store.settings.monthlyGoal),monthsToBoth:bothNeeded===null||store.settings.monthlyGoal<=0?null:Math.ceil(bothNeeded/store.settings.monthlyGoal)};
}
export const brl=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const compact=(cents:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(cents/100);
export function monthLabel(month:string,short=false){return new Intl.DateTimeFormat('pt-BR',{month:short?'short':'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-15T12:00:00Z'));}
export function shiftMonth(month:string,amount:number){const [y,m]=month.split('-').map(Number);const date=new Date(Date.UTC(y,m-1+amount,1));return date.toISOString().slice(0,7);}
export function inputAmount(cents:number|null){return cents===null?'':(cents/100).toFixed(2).replace('.',',');}
export function parseAmount(value:string):number|null {
 const s=value.trim().replace(/^R\$\s*/,'').replace(/\s/g,'');if(!s)return null;
 let normalized=s;
 if(s.includes(',')){if(!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(s))throw new Error('Use um valor como 1.250,50.');normalized=s.replaceAll('.','').replace(',','.');}
 else {if(!/^-?\d+(?:\.\d{1,2})?$/.test(s))throw new Error('Use vírgula para os centavos, como 1.250,50.');}
 const cents=Math.round(Number(normalized)*100);if(!Number.isSafeInteger(cents)||Math.abs(cents)>100000000000)throw new Error('Valor fora do limite permitido.');return cents;
}
