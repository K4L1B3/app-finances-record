import {randomBytes,scryptSync} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
if(existsSync('.env')){console.error('O arquivo .env já existe. Preserve-o. Para reconfigurar, renomeie-o antes de executar este comando.');process.exit(1);}
const rl=createInterface({input:process.stdin,output:process.stdout});
try{
 const raw=(await rl.question('Endereço do app (ex.: https://financas.seudominio.com) [http://localhost:3000]: ')).trim()||'http://localhost:3000';
 const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Use apenas a origem, como https://financas.seudominio.com.');
 if(url.protocol==='http:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Para acesso público, use um domínio com HTTPS. Para acesso privado por túnel, use http://localhost:3000.');
 const username=(await rl.question('Usuário [luiz]: ')).trim()||'luiz';if(!/^[A-Za-z0-9._-]{2,60}$/.test(username))throw Error('Use de 2 a 60 letras, números, ponto, hífen ou sublinhado.');
 const password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
 const text=`APP_URL=${url.origin}\nAPP_DOMAIN=${url.hostname}\nAPP_PORT=3000\nAUTH_USERNAME=${username}\nAUTH_PASSWORD_HASH=scrypt:${salt}:${hash}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nDATABASE_PATH=./data/financeiro.sqlite\n`;
 writeFileSync('.env',text,{mode:0o600,flag:'wx'});
 console.log(`\nConfiguração criada. Guarde estas credenciais em um gerenciador de senhas.\n\nUsuário: ${username}\nSenha: ${password}\n\nA senha é exibida apenas agora; o arquivo .env contém somente seu hash.\n`);
}catch(error){console.error(error.message);process.exitCode=1;}finally{rl.close();}
