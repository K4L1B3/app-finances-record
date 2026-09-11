'use client';
import {useState} from 'react';
import {brl, compact, inputAmount, monthLabel, parseAmount, shiftMonth, type Month, type Settings, type Store} from '@/lib/finance';
import {budgetComparison, cashFlow, categorySpending, projectionBaseline} from '@/lib/dashboard';

const COLORS = ['#7759df','#299d88','#df9940','#de688a','#518bc9','#977449','#9980c9','#718b46','#c26349','#4a9eae','#bd6bad','#8885a4','#779f9b','#a19b51','#8278b7','#bb8876','#758597'];
const pct = (value: number) => new Intl.NumberFormat('pt-BR', {style:'percent', maximumFractionDigits:1}).format(value);

export function CategoryPie({month, settings}: {month: Month; settings: Settings}) {
  const data = categorySpending(month, settings), sum = data.reduce((n, c) => n + c.value, 0);
  const [selected, setSelected] = useState<string | null>(null);
  const active = data.find(c => c.id === selected);
  let offset = 0;
  return <section className="panel category-pie"><div className="panel-heading"><div><h2>Para onde foi o dinheiro</h2><span className="muted">Despesas por categoria · {monthLabel(month.month, true)}</span></div></div>
    {!sum ? <p className="chart-empty">Nenhuma despesa positiva informada neste mês.</p> : <div className="pie-layout"><div className="pie-visual"><svg viewBox="0 0 240 240" role="img" aria-label="Distribuição das despesas. Valores e percentuais na lista de categorias."><circle cx="120" cy="120" r="85" fill="none" stroke="var(--line)" strokeWidth="34"/>{data.map((c, i) => {
      const length = c.value / sum * 100, position = offset; offset += length;
      return <circle key={c.id} cx="120" cy="120" r="85" pathLength="100" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={selected === c.id ? 42 : 34} strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-position} transform="rotate(-90 120 120)" opacity={active && active.id !== c.id ? .3 : 1}><title>{c.name}: {brl(c.value)} ({pct(c.value/sum)})</title></circle>;
    })}</svg><div className="pie-center"><span>{active ? pct(active.value/sum) + ' do total' : 'Total de despesas'}</span><strong>{brl(active?.value ?? sum)}</strong></div></div><ul className="pie-legend">{data.map((c, i) => <li key={c.id}><button type="button" aria-pressed={selected === c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}><i style={{background:COLORS[i % COLORS.length]}}/><span>{c.name}<small>{pct(c.value/sum)}</small></span><strong>{brl(c.value)}</strong></button></li>)}</ul></div>}
    <p className="chart-note">Somente despesas informadas. Aportes e transferências ficam fora desta divisão.</p>
  </section>;
}

export function BudgetBars({month, settings}: {month: Month; settings: Settings}) {
  const rows = budgetComparison(month, settings), max = Math.max(1, ...rows.map(c => Math.max(c.actual, c.target)));
  const excess = rows.reduce((n, c) => n + c.excess, 0);
  return <section className="panel budget-panel"><div className="panel-heading"><div><h2>Gastos versus metas</h2><span className="muted">{rows.length ? `${brl(excess)} acima dos limites por categoria` : 'Defina limites na aba Planejamento'}</span></div></div>
    <div className="chart-legend dashboard-legend"><span><i style={{background:'var(--purple)'}}/>Dentro da meta</span><span><i style={{background:'var(--red)'}}/>Excesso</span><span><i style={{background:'var(--line)'}}/>Disponível</span></div>
    {!rows.length ? <p className="chart-empty">Preencha a meta e o gasto de uma categoria para comparar. Zero também vale como meta.</p> : <ul className="budget-list">{rows.map(c => <li key={c.id}><div className="budget-label"><span>{c.name}</span><strong>{brl(c.actual)} <small>/ {brl(c.target)}</small></strong></div><div className="budget-track" role="img" aria-label={`${c.name}: gasto ${brl(c.actual)}, meta ${brl(c.target)}, excesso ${brl(c.excess)}, disponível ${brl(c.remaining)}`}><span className="budget-within" style={{width:`${c.within/max*100}%`}}/><span className="budget-excess" style={{width:`${c.excess/max*100}%`}}/><span className="budget-remaining" style={{width:`${c.remaining/max*100}%`}}/><i className="budget-limit" style={{left:`${c.target/max*100}%`}}/></div><small className={c.excess ? 'negative' : 'muted'}>{c.excess ? `${brl(c.excess)} acima${c.target > 0 ? ` · +${Math.round(c.excess/c.target*100)}%` : ' · meta zero'}` : `${brl(c.remaining)} disponíveis`}</small></li>)}</ul>}
    <p className="chart-note">A marca indica a meta. Categorias sem gasto ou limite preenchido e pares zerados não entram. Economias em outras categorias não escondem os excessos.</p>
  </section>;
}

export function CashCandles({store, month, onMonth}: {store: Store; month: string; onMonth: (m: string) => void}) {
  const data = cashFlow(store, month), known = data.filter(d => d.stats), [selected, setSelected] = useState(month);
  const active = data.find(d => d.month === selected) ?? data.at(-1);
  const values = known.flatMap(d => [d.opening, d.closing]);
  const low = Math.min(0, ...values), high = Math.max(100, ...values), padding = (high-low)*.12;
  const min = low-padding, max = high+padding;
  const y = (value: number) => 245-(value-min)/(max-min)*205;
  const step = 660 / Math.max(1,data.length);
  return <section className="panel cash-panel"><div className="panel-heading"><div><h2>Seu fluxo de caixa, mês a mês</h2><span className="muted">Acumulado das sobras após despesas e aportes · até 12 meses</span></div></div>
    {!known.length ? <p className="chart-empty">Preencha todas as categorias do primeiro mês para visualizar a evolução. Use zero quando não houve movimento.</p> : <><div className="chart-legend dashboard-legend"><span><i style={{background:'var(--green)'}}/>Sobrou no mês</span><span><i style={{background:'var(--red)'}}/>Saiu mais do que entrou</span></div><div className="cash-scroll"><svg viewBox="0 0 780 295" role="group" aria-label="Variação mensal do saldo acumulado. Selecione um mês para consultar entradas e saídas.">{[0,.25,.5,.75,1].map(f => {const v=min+(max-min)*f;return <g key={f}><line x1="90" x2="755" y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="4 5"/><text x="80" y={y(v)+4} textAnchor="end" fill="var(--muted)" fontSize="12">{compact(v)}</text></g>;})}<line x1="90" x2="755" y1={y(0)} y2={y(0)} stroke="var(--muted)"/>{data.map((d, i) => {
      const x=95+(i+.5)*step, width=Math.min(28,step*.48), positive=(d.stats?.balance ?? 0)>=0;
      return <g key={d.month} role="button" tabIndex={0} aria-pressed={active?.month===d.month} aria-label={`${monthLabel(d.month)}: ${d.stats ? `entradas ${brl(d.stats.income)}, despesas ${brl(d.stats.expenses)}, aportes líquidos ${brl(d.stats.invested)}, sobra ${brl(d.stats.balance)}` : 'dados incompletos'}`} onClick={() => setSelected(d.month)} onKeyDown={e => {if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(d.month);}}} className="cash-candle"><rect x={x-step/2+2} y="18" width={step-4} height="255" rx="8" fill={active?.month===d.month?'var(--purple-light)':'transparent'}/>{d.stats ? <><rect x={x-width/2} y={Math.min(y(d.opening),y(d.closing))} width={width} height={Math.max(2,Math.abs(y(d.opening)-y(d.closing)))} rx="3" fill={positive?'var(--green)':'var(--red)'}/><line x1={x-width/2-5} x2={x} y1={y(d.opening)} y2={y(d.opening)} stroke="var(--ink)"/><line x1={x} x2={x+width/2+5} y1={y(d.closing)} y2={y(d.closing)} stroke="var(--ink)"/></> : <text x={x} y="150" textAnchor="middle" fill="var(--muted)">—</text>}<text x={x} y="285" textAnchor="middle" fill="var(--muted)" fontSize="11">{d.month.slice(5)}/{d.month.slice(2,4)}</text></g>;
    })}</svg></div></>}
    {active && <div className="cash-detail"><div><strong className="capitalize">{monthLabel(active.month,true)}</strong><button className="text-button" onClick={() => onMonth(active.month)}>Abrir mês →</button></div>{active.stats ? <dl>{[['Entradas',active.stats.income],['Despesas',active.stats.expenses],['Aportes líquidos',active.stats.invested],['Sobra do mês',active.stats.balance],['Acumulado anterior',active.opening],['Acumulado final',active.closing]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{brl(value as number)}</dd></div>)}</dl> : <p className="muted">Mês ausente ou incompleto; não entra no acumulado.</p>}</div>}
    <p className="chart-note">Cada corpo liga o acumulado anterior ao final do mês, sem máximas ou mínimas diárias. Base zero no início do acompanhamento; soma apenas meses completos e não representa o saldo bancário. Aportes negativos são resgates.</p>
  </section>;
}

export function NextMonthScenario({store, month, onPlan}: {store: Store; month: string; onPlan: () => void}) {
  const baseline = projectionBaseline(store,month);
  const [fields,setFields] = useState(() => ({income:inputAmount(baseline.income),expenses:inputAmount(baseline.expenses),saving:inputAmount(baseline.saving),opening:''}));
  const values = Object.fromEntries(Object.entries(fields).map(([k,v]) => {try{return [k,parseAmount(v)];}catch{return [k,NaN];}})) as Record<keyof typeof fields,number|null>;
  const invalid = Object.entries(values).some(([key,v]) => v !== null && (!Number.isFinite(v) || ((key==='income'||key==='expenses') && v<0)));
  const net = !invalid && values.income!==null && values.expenses!==null && values.saving!==null ? values.income-values.expenses-values.saving : null;
  const future = net!==null && values.opening!==null ? values.opening+net : null;
  return <section className="panel scenario-panel"><div className="panel-heading"><div><h2>Quanto posso gastar no próximo mês?</h2><span className="muted capitalize">Simulação para {monthLabel(shiftMonth(month,1))}</span></div><button className="button secondary" onClick={onPlan}>Definir metas por categoria →</button></div><p className="chart-note scenario-source">{baseline.source}. Ajuste os valores para testar seu próximo mês.</p><div className="scenario-fields">{([['income','Renda prevista'],['expenses','Quanto pretendo gastar'],['saving','Aportes líquidos previstos'],['opening','Saldo disponível hoje (opcional)']] as const).map(([key,label]) => <label key={key}>{label}<div className="amount-field"><span>R$</span><input inputMode="decimal" placeholder="0,00" value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})}/></div></label>)}</div>{invalid && <p className="chart-note negative" role="alert">Confira os valores. Renda e gastos não podem ser negativos.</p>}<div className="scenario-results"><div><span>Sobra prevista no próximo mês</span><strong className={net!==null&&net<0?'negative':'positive'}>{net===null?'—':brl(net)}</strong></div><div><span>Saldo previsto ao final</span><strong className={future!==null&&future<0?'negative':''}>{future===null?'—':brl(future)}</strong><small>{values.opening===null?'Informe o saldo disponível hoje.':'Saldo informado + sobra prevista.'}</small></div></div><p className="chart-note">Simulação não salva. Sem rendimentos; considera só os valores acima. Use saldo disponível fora das reservas. Para guardar as decisões, preencha o Planejamento.</p></section>;
}
