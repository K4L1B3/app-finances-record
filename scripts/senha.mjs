import {randomBytes,scryptSync} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
const rl=createInterface({input:process.stdin,output:process.stdout});
try{
 const env=readFileSync('.env','utf8');
 const password=(await rl.question('Nova senha (mínimo 8 caracteres): ')).trim();
 if(password.length<8)throw Error('Use pelo menos 8 caracteres.');
 const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
 if(!/^AUTH_PASSWORD_HASH=.*$/m.test(env))throw Error('AUTH_PASSWORD_HASH não encontrado no .env.');
 writeFileSync('.env',env.replace(/^AUTH_PASSWORD_HASH=.*$/m,`AUTH_PASSWORD_HASH=scrypt:${salt}:${hash}`),{mode:0o600});
 console.log(`\nSenha atualizada. Usuário: ${/^AUTH_USERNAME=(.*)$/m.exec(env)?.[1]}\nReinicie o servidor para aplicar.\n`);
}catch(error){console.error(error.message);process.exitCode=1;}finally{rl.close();}
