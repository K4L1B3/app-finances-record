import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
const path=resolve(process.env.DATABASE_PATH||'data/financeiro.sqlite');
const directory=join(dirname(path),'backups');mkdirSync(directory,{recursive:true});
const destination=join(directory,`financeiro-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
const db=new DatabaseSync(path,{timeout:5000});
db.prepare('VACUUM INTO ?').run(destination);db.close();
console.log(destination);
