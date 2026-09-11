// Optional production integration check: build first, then node tests/api-smoke.mjs.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const temp=mkdtempSync(join(tmpdir(),'finance-api-')),port=Number(process.env.TEST_PORT||3187),origin=`http://localhost:${port}`;
const password=randomBytes(20).toString('hex');
let settings=null,months=[],unavailable=false;
const user={id:'00000000-0000-4000-8000-000000000001',email:'teste@example.com',aud:'authenticated',role:'authenticated'};
const mock=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 const url=new URL(req.url,'http://localhost');
 if(unavailable&&url.pathname.startsWith('/rest/')){res.statusCode=503;return res.end(JSON.stringify({message:'Unavailable'}));}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
 function send(data,status=200){res.statusCode=status;res.end(JSON.stringify(data));}
 if(url.pathname==='/auth/v1/token')return body.password===password?send({access_token:'mock-token',refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer',user}):send({msg:'Invalid login credentials'},400);
 if(url.pathname==='/auth/v1/user')return send(user);
 if(url.pathname==='/auth/v1/logout')return send({});
 if(url.pathname==='/rest/v1/settings'){
  if(req.method==='POST'){settings??={...body};return send(null,201);}
  return send(settings);
 }
 if(url.pathname==='/rest/v1/months'){
  if(req.method==='GET')return send(months);
  if(req.method==='POST'){if(months.some(m=>m.month===body.month))return send({code:'23505'},409);months.push(body);return send(body,201);}
  const row=months.find(m=>'eq.'+m.month===url.searchParams.get('month')&&'eq.'+m.version===url.searchParams.get('version'));
  if(!row)return send(null);Object.assign(row,body);return send(row);
 }
 send({error:'Unexpected mock request'},500);
});
await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${mock.address().port}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-anon-key',PORT:String(port),HOSTNAME:'127.0.0.1',NEXT_TELEMETRY_DISABLED:'1'};
let output='',server;
function start(){server=spawn(process.execPath,['.next/standalone/server.js'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);}
async function stop(){if(server.exitCode!==null)return;await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM');});}
async function ready(){for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error('Server exited: '+output);try{if((await fetch(origin+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw Error('Server did not become ready: '+output);}
let cookie='';
async function req(path,method='GET',body,auth=true,originHeader=origin){const headers={...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:originHeader}:{})};return fetch(origin+path,{method,headers,body:body?JSON.stringify(body):undefined});}
try{start();await ready();assert.equal((await req('/api/data','GET',undefined,false)).status,401);
assert.equal((await req('/api/auth/login','POST',{email:'teste@example.com',password:'errada'},false)).status,401);
let login=await req('/api/auth/login','POST',{email:'teste@example.com',password},false);assert.equal(login.status,200);cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');assert.match(login.headers.get('set-cookie'),/secure/i);
const response=await req('/api/data');assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);assert.equal(response.headers.get('cache-control'),'no-store');let data=await response.json();const ids=Object.keys(data.settings.kinds),amounts=Object.fromEntries(ids.map(id=>[id,null]));const month={month:'2027-12',planned:{...amounts,investments:300000,groceries:40000},actual:{...amounts,income:800000,groceries:50000,investments:300000},otherInvestments:0,status:'draft',version:0};
assert.equal((await req('/api/month','PUT',month,true,'https://wrong.example')).status,403);
let saved=await req('/api/month','PUT',month);assert.equal(saved.status,200);let current=await saved.json();assert.equal(current.version,1);
assert.equal((await req('/api/month','PUT',month)).status,409);
assert.equal((await req('/api/month','PUT',{...current,status:'closed'})).status,400);
current.actual=Object.fromEntries(ids.map(id=>[id,current.actual[id]??0]));current.status='closed';saved=await req('/api/month','PUT',current);assert.equal(saved.status,200);current=await saved.json();
const backup=await(await req('/api/backup')).json();assert.equal(backup.months[0].actual.groceries,50000);assert.equal(backup.format,'meu-financeiro');
await stop();start();await ready();data=await(await req('/api/data')).json();assert.equal(data.months[0].month,'2027-12');assert.equal(data.months[0].version,2);
unavailable=true;const failure=await req('/api/data');assert.equal(failure.status,503);assert.equal(typeof (await failure.json()).error,'string');unavailable=false;
assert.equal((await req('/api/auth/logout','POST')).status,200);cookie='';assert.equal((await req('/api/data')).status,401);
console.log('PASS: API com Supabase simulado: autenticação, cookies, origem, validação, conflito, fechamento, backup, reinício e indisponibilidade do banco.');
}finally{if(server)await stop();await new Promise(resolve=>mock.close(resolve));rmSync(temp,{recursive:true,force:true});}
