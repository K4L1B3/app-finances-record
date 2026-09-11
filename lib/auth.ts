import {cookies} from 'next/headers';
import {createHash,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {db} from './db';
const derive=promisify(scrypt);const COOKIE='finance_session';const LIFE=7*24*60*60;
export function authConfig(){const {AUTH_USERNAME,AUTH_PASSWORD_HASH,SESSION_SECRET,APP_URL}=process.env;if(!AUTH_USERNAME||!AUTH_PASSWORD_HASH||!SESSION_SECRET||SESSION_SECRET.length<32||!APP_URL)throw new Error('Execute a configuração inicial antes de iniciar o app.');return {username:AUTH_USERNAME,hash:AUTH_PASSWORD_HASH,secret:SESSION_SECRET,origin:new URL(APP_URL).origin};}
function tokenHash(token:string){const c=authConfig();return createHash('sha256').update(token+c.secret+c.hash).digest('hex');}
export async function authenticated(){try{const token=(await cookies()).get(COOKIE)?.value;if(!token||token.length!==64)return false;return !!db().prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires>?').get(tokenHash(token),Date.now());}catch{return false;}}
export async function login(username:string,password:string){
 const c=authConfig(),connection=db(),now=Date.now();
 connection.prepare('INSERT OR IGNORE INTO login_attempts(id,count,reset_at) VALUES(1,0,?)').run(now+15*60*1000);
 connection.prepare('UPDATE login_attempts SET count=0,reset_at=? WHERE id=1 AND reset_at<=?').run(now+15*60*1000,now);
 const rate=connection.prepare('SELECT count FROM login_attempts WHERE id=1').get()!;if(Number(rate.count)>=10)return 'limited' as const;
 connection.prepare('UPDATE login_attempts SET count=count+1 WHERE id=1').run();
 const [scheme,salt,hex]=c.hash.split(':');if(scheme!=='scrypt'||!salt||!hex||hex.length!==128)throw new Error('Credencial inválida. Execute a configuração novamente.');
 const actual=await derive(password,salt,64) as Buffer;const valid=timingSafeEqual(actual,Buffer.from(hex,'hex'))&&username===c.username;
 if(!valid)return 'invalid' as const;
 connection.prepare('DELETE FROM sessions WHERE expires<=?').run(now);connection.prepare('UPDATE login_attempts SET count=0 WHERE id=1').run();
 const token=randomBytes(32).toString('hex');connection.prepare('INSERT INTO sessions(token_hash,expires) VALUES(?,?)').run(tokenHash(token),now+LIFE*1000);
 (await cookies()).set(COOKIE,token,{httpOnly:true,secure:c.origin.startsWith('https:'),sameSite:'strict',path:'/',maxAge:LIFE});return 'ok' as const;
}
export async function logout(){const jar=await cookies(),token=jar.get(COOKIE)?.value;if(token)db().prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));jar.delete(COOKIE);}
// ponytail: aceita também o próprio host do request (127.0.0.1, IP da rede, túnel) além do APP_URL; quem barra CSRF de verdade é o cookie sameSite:'strict'.
export function validOrigin(request:Request){const origin=request.headers.get('origin');if(!origin)return false;if(origin===authConfig().origin)return true;try{return new URL(origin).host===request.headers.get('host');}catch{return false;}}
