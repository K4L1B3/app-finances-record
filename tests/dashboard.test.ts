import {test} from 'node:test';
import assert from 'node:assert/strict';
import {budgetComparison, cashFlow, categorySpending, projectionBaseline} from '../lib/dashboard';
import {blankMonth, CATEGORIES, DEFAULT_SETTINGS, type Month, type Store} from '../lib/finance';
const settings = {...DEFAULT_SETTINGS, startMonth:'2026-01'};
function complete(date: string, income=100000, expense=50000, saving=10000): Month {
 const month=blankMonth(date,settings);
 for(const c of CATEGORIES) month.actual[c.id]=0;
 Object.assign(month.actual,{income,groceries:expense,investments:saving,payments:900000,transfers:900000});
 month.status='closed';return month;
}
function store(months: Month[]): Store {return {months,settings,settingsVersion:1};}
test('pizza considera só despesas positivas com a classificação atual',()=>{
 const month=complete('2026-01');month.actual.restaurants=null;
 assert.deepEqual(categorySpending(month,settings).map(c=>[c.id,c.value]),[['groceries',50000]]);
 assert.equal(categorySpending(month,{...settings,kinds:{...settings.kinds,groceries:'neutral'}}).length,0);
});
test('barra respeita meta zero, ausência de metas e não compensa excessos',()=>{
 const month=complete('2026-01');month.planned.groceries=40000;month.actual.restaurants=20000;month.planned.restaurants=0;month.planned.home=30000;
 const rows=budgetComparison(month,settings);
 assert.equal(rows.length,3);assert.equal(rows.reduce((n,c)=>n+c.excess,0),30000);
 assert.equal(rows[0].id,'restaurants');assert.equal(rows[0].within,0);
 assert.equal(rows.find(c=>c.id==='home')?.remaining,30000);
});
test('fluxo exclui meses parciais, marca lacunas e trata resgates e saldo negativo',()=>{
 const a=complete('2026-01'),partial=blankMonth('2026-02',settings),c=complete('2026-03',0,100000,-20000);
 partial.actual.income=900000;
 const points=cashFlow(store([c,partial,a]),'2026-03');
 assert.equal(points[0].closing,40000);assert.equal(points[1].stats,null);
 assert.equal(points[2].opening,40000);assert.equal(points[2].closing,-40000);
});
test('janela de 12 meses preserva acumulado anterior e ignora registros futuros',()=>{
 const points=cashFlow(store([complete('2026-01'),complete('2027-01'),complete('2028-01')]),'2027-01');
 assert.equal(points.length,12);assert.equal(points[0].month,'2026-02');assert.equal(points[0].opening,40000);assert.equal(points.at(-1)?.closing,80000);
});
test('projeção usa apenas meses fechados anteriores e prefere plano completo',()=>{
 const a=complete('2026-01'),b=complete('2026-02',200000),future=complete('2026-04',900000),partial=blankMonth('2026-03',settings);
 let result=projectionBaseline(store([a,b,future,partial]),'2026-03');assert.equal(result.income,150000);
 for(const c of CATEGORIES)future.planned[c.id]=0;
 future.planned.income=250000;future.planned.groceries=120000;future.planned.investments=30000;
 result=projectionBaseline(store([a,b,future]),'2026-03');assert.equal(result.income,250000);assert.equal(result.expenses,120000);assert.equal(result.saving,30000);
 assert.equal(projectionBaseline(store([]),'2026-01').income,null);
});
