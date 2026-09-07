import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DEFAULT_SETTINGS,type Month,type Settings,type Store} from './finance';
let connection:DatabaseSync|undefined;
export function db(){
 if(connection)return connection;
 const path=resolve(process.env.DATABASE_PATH||'data/financeiro.sqlite');mkdirSync(dirname(path),{recursive:true});
 connection=new DatabaseSync(path,{timeout:5000});
 connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,version INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS months(month TEXT PRIMARY KEY,data TEXT NOT NULL,version INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY CHECK(id=1),count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
 `);
 connection.prepare('INSERT OR IGNORE INTO settings(id,data,version) VALUES(1,?,1)').run(JSON.stringify(DEFAULT_SETTINGS));
 return connection;
}
export function getStore():Store {
 const s=db().prepare('SELECT data,version FROM settings WHERE id=1').get()!;
 return {settings:JSON.parse(s.data as string) as Settings,settingsVersion:s.version as number,months:db().prepare('SELECT data,version FROM months ORDER BY month').all().map(row=>({...JSON.parse(row.data as string),version:row.version}) as Month)};
}
export class ConflictError extends Error{}
export function writeMonth(month:Month){
 const connection=db();connection.exec('BEGIN IMMEDIATE');
 try{const previous=connection.prepare('SELECT version FROM months WHERE month=?').get(month.month);if((previous?.version??0)!==month.version)throw new ConflictError('Este mês foi alterado em outra aba. Recarregue os dados antes de salvar novamente.');
 const next={...month,version:month.version+1};connection.prepare('INSERT INTO months(month,data,version) VALUES(?,?,?) ON CONFLICT(month) DO UPDATE SET data=excluded.data,version=excluded.version').run(month.month,JSON.stringify(next),next.version);connection.exec('COMMIT');return next;
 }catch(e){connection.exec('ROLLBACK');throw e;}
}
export function writeSettings(settings:Settings,version:number){const result=db().prepare('UPDATE settings SET data=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(settings),version);if(!result.changes)throw new ConflictError('As configurações foram alteradas em outra aba. Recarregue antes de salvar.');return version+1;}
