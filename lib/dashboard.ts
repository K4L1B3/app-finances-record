import {CATEGORIES, hasValues, missing, shiftMonth, summary, total, type Month, type Settings, type Store} from './finance';

export function categorySpending(month: Month, settings: Settings) {
  return CATEGORIES.filter(c => settings.kinds[c.id] === 'expense')
    .map(c => ({...c, value: month.actual[c.id]}))
    .filter((c): c is typeof c & {value: number} => c.value !== null && c.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function budgetComparison(month: Month, settings: Settings) {
  return CATEGORIES.filter(c => settings.kinds[c.id] === 'expense')
    .filter(c => month.actual[c.id] !== null && month.planned[c.id] !== null)
    .map(c => {
      const actual = month.actual[c.id]!, target = month.planned[c.id]!;
      return {...c, actual, target, within: Math.min(actual, target), excess: Math.max(0, actual - target), remaining: Math.max(0, target - actual)};
    }).filter(c => c.actual > 0 || c.target > 0).sort((a, b) => b.excess - a.excess || b.actual - a.actual);
}

// Monthly totals cannot provide intramonth highs/lows. Bodies represent only
// opening/closing accumulated net flows, with no invented candle wicks.
export function cashFlow(store: Store, through: string) {
  let accumulated = 0;
  const start = [store.settings.startMonth, shiftMonth(through, -11)].sort().at(-1)!;
  const complete = store.months.filter(m => m.month >= store.settings.startMonth && m.month <= through && hasValues(m.actual, store.settings) && missing(m, store.settings).length === 0);
  for (const month of complete.filter(m => m.month < start)) accumulated += summary(month, store.settings).balance;
  const result = [];
  for (let date = start; date <= through; date = shiftMonth(date, 1)) {
    const month = complete.find(m => m.month === date);
    const stats = month ? summary(month, store.settings) : null;
    const opening = accumulated;
    if (stats) accumulated += stats.balance;
    result.push({month: date, opening, closing: accumulated, stats});
  }
  return result;
}

// Axis ticks on 1/2/2.5/5 × 10ⁿ steps so labels read as round money, never below zero unless data is.
export function niceScale(low: number, high: number, count = 4) {
  const raw = (high - low) / count || 1, magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(f => f * magnitude).find(s => s >= raw)!;
  const min = Math.floor(low / step) * step, max = Math.ceil(high / step) * step;
  return {min, max, ticks: Array.from({length: Math.round((max - min) / step) + 1}, (_, i) => min + i * step)};
}

export function projectionBaseline(store: Store, through: string) {
  const next = store.months.find(m => m.month === shiftMonth(through, 1));
  const planComplete = next && CATEGORIES.every(c => store.settings.kinds[c.id] === 'neutral' || next.planned[c.id] !== null);
  if (planComplete) return {income: total(next.planned, 'income', store.settings), expenses: total(next.planned, 'expense', store.settings), saving: total(next.planned, 'saving', store.settings), source: 'Planejamento salvo para o próximo mês'};
  const recent = store.months.filter(m => m.month >= store.settings.startMonth && m.month <= through && m.status === 'closed' && missing(m, store.settings).length === 0)
    .sort((a, b) => b.month.localeCompare(a.month)).slice(0, 3);
  if (!recent.length) return {income: null, expenses: null, saving: store.settings.monthlyGoal, source: 'Informe sua renda e seus gastos esperados'};
  const mean = (key: 'income' | 'expenses' | 'invested') => Math.round(recent.reduce((sum, m) => sum + summary(m, store.settings)[key], 0) / recent.length);
  return {income: mean('income'), expenses: mean('expenses'), saving: mean('invested'), source: `Média dos últimos ${recent.length} ${recent.length === 1 ? 'mês fechado' : 'meses fechados'} até ${through.split('-').reverse().join('/')}`};
}
