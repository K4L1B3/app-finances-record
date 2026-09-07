// Optional production integration check: build first, then node tests/api-smoke.mjs.
import {spawn} from 'node:child_process';
import {randomBytes,scryptSync} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const temp=mkdtempSync(join(tmpdir(),'finance-api-')),port=Number(process.env.TEST_PORT||3187),origin=`http://localhost:${port}`;
const password=randomBytes(20).toString('hex'),salt=randomBytes(16).toString('hex');
const env={...process.env,PORT:String(port),HOSTNAME:'127.0.0.1',APP_URL:origin,AUTH_USERNAME:'teste',AUTH_PASSWORD_HASH:`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`,SESSION_SECRET:randomBytes(32).toString('hex'),DATABASE_PATH:join(temp,'test.sqlite'),NEXT_TELEMETRY_DISABLED:'1'};
let output='',server;
function start(){server=spawn(process.execPath,['.next/standalone/server.js'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);}
async function stop(){if(server.exitCode!==null)return;await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM');});}
async function ready(){for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error('Server exited: '+output);try{if((await fetch(origin+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw Error('Server did not become ready: '+output);}
let cookie='';
async function req(path,method='GET',body,auth=true,originHeader=origin){const headers={...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:originHeader}:{})};return fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});}
try{start();await ready();assert.equal((await req('/api/data','GET',undefined,false)).status,401);
assert.equal((await req('/api/auth/login','POST',{username:'teste',password:'errada'},false)).status,401);
let login=await req('/api/auth/login','POST',{username:'teste',password},false);assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/httponly/i);assert.match(login.headers.get('set-cookie'),/samesite=strict/i);
let data=await(await req('/api/data')).json();const ids=Object.keys(data.settings.kinds),amounts=Object.fromEntries(ids.map(id=>[id,null]));const month={month:'2027-12',planned:{...amounts,investments:300000,groceries:40000},actual:{...amounts,income:800000,groceries:50000,investments:300000},otherInvestments:0,status:'draft',version:0};
assert.equal((await req('/api/month','PUT',month,true,'https://wrong.example')).status,403);
let saved=await req('/api/month','PUT',month);assert.equal(saved.status,200);let current=await saved.json();assert.equal(current.version,1);
assert.equal((await req('/api/month','PUT',month)).status,409);
assert.equal((await req('/api/month','PUT',{...current,status:'closed'})).status,400);
current.actual=Object.fromEntries(ids.map(id=>[id,current.actual[id]??0]));current.status='closed';saved=await req('/api/month','PUT',current);assert.equal(saved.status,200);current=await saved.json();
const backup=await(await req('/api/backup')).json();assert.equal(backup.months[0].actual.groceries,50000);assert.equal(backup.format,'meu-financeiro');
await stop();start();await ready();data=await(await req('/api/data')).json();assert.equal(data.months[0].month,'2027-12');assert.equal(data.months[0].version,2);
assert.equal((await req('/api/auth/logout','POST')).status,200);assert.equal((await req('/api/data')).status,401);
console.log('PASS: autenticação, cookies, origem, validação, conflito, fechamento, backup e persistência após reinício.');
}finally{if(server)await stop();rmSync(temp,{recursive:true,force:true});}
