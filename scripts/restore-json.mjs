import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const input=process.argv[2];if(!input){console.error('Uso: node scripts/restore-json.mjs /app/data/backup.json');process.exit(1);}
const ids=['pets','restaurants','shopping','home','donations','education','leisure','taxes','investments','groceries','uncategorized','payments','services','income','health','digital','transfers','transport','travel'];
const isMonth=value=>typeof value==='string'&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(value);
const isCents=value=>Number.isSafeInteger(value)&&Math.abs(value)<=100000000000;
const isAmounts=value=>value&&typeof value==='object'&&ids.every(id=>value[id]===null||isCents(value[id]));
function validate(data){
 if(!data||data.format!=='meu-financeiro'||data.version!==1||typeof data.exportedAt!=='string'||!Number.isInteger(data.settingsVersion)||data.settingsVersion<1)throw Error('Formato de backup incompatível.');
 const s=data.settings;if(!s||!isCents(s.monthlyGoal)||s.monthlyGoal<0||!isMonth(s.startMonth)||!isCents(s.emergencyOpening)||s.emergencyOpening<0||!isCents(s.businessOpening)||s.businessOpening<0||![null,s.emergencyGoal].every(v=>v===null||(isCents(v)&&v>=0))||![null,s.businessGoal].every(v=>v===null||(isCents(v)&&v>=0))||!s.kinds||ids.some(id=>!['expense','income','saving','neutral'].includes(s.kinds[id])))throw Error('Configurações inválidas.');
 if(!Array.isArray(data.months)||data.months.length>1200)throw Error('Lista de meses inválida.');
 const seen=new Set();for(const m of data.months){if(!m||!isMonth(m.month)||seen.has(m.month)||m.month<s.startMonth||!isAmounts(m.planned)||!isAmounts(m.actual)||!['draft','closed'].includes(m.status)||!isCents(m.otherInvestments)||!Number.isInteger(m.version)||m.version<0)throw Error('Mês inválido ou duplicado.');seen.add(m.month);for(const id of ids){if((m.planned[id]??0)<0||(s.kinds[id]!=='saving'&&(m.actual[id]??0)<0))throw Error('Valor negativo inválido.');if(m.status==='closed'&&s.kinds[id]!=='neutral'&&m.actual[id]===null)throw Error('Mês fechado incompleto.');}}
}
try{
 const data=JSON.parse(readFileSync(input,'utf8'));validate(data);
 const path=resolve(process.env.DATABASE_PATH||'data/financeiro.sqlite');mkdirSync(dirname(path),{recursive:true});const db=new DatabaseSync(path,{timeout:5000});
 // Never overwrite a database that already has financial data.
 const table=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='months'").get();
 if(table&&Number(db.prepare('SELECT COUNT(*) AS n FROM months').get().n)>0)throw Error('O banco já tem meses. Faça backup e mova o banco atual antes de restaurar.');
 db.exec(`BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,version INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS months(month TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL);`);
 try{db.prepare('INSERT INTO settings(id,data,version) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version').run(JSON.stringify(data.settings),data.settingsVersion);
 for(const m of data.months)db.prepare('INSERT INTO months(month,data,version) VALUES(?,?,?)').run(m.month,JSON.stringify(m),m.version);
 db.exec('COMMIT');db.close();console.log(`Restaurados ${data.months.length} meses e suas configurações.`);}catch(error){db.exec('ROLLBACK');db.close();throw error;}
}catch(error){console.error('Não foi possível restaurar:',error.message);process.exit(1);}
