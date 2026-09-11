import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse} from '../lib/api-response';
test('HTML de rota ausente produz mensagem legível',async()=>{
 await assert.rejects(readApiResponse(new Response('<!DOCTYPE html>',{status:404,headers:{'Content-Type':'text/html'}})),/HTTP 404/);
});
test('preserva erro JSON e trata JSON inválido',async()=>{
 await assert.rejects(readApiResponse(Response.json({error:'Sessão expirada'},{status:401})),/Sessão expirada/);
 await assert.rejects(readApiResponse(new Response('{',{headers:{'Content-Type':'application/json'}})),/HTTP 200/);
 assert.deepEqual(await readApiResponse(Response.json({months:[]})),{months:[]});
});
