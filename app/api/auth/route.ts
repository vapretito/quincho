import { db,body,currentUser,requireUser,json,errorResponse,fail,textField,validDni,validPassword,rateLimit } from '@/lib/server';
import {hashPassword,verifyPassword,randomToken,tokenHash} from '@/lib/password.mjs';
const cookie=(r:Request,token:string,age=604800)=>`riviera_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${new URL(r.url).protocol==='https:'?'; Secure':''}`;
export async function GET(r:Request){try{return json({user:await currentUser(r)});}catch(e){return errorResponse(e);}}
export async function POST(r:Request){try{
 const b=await body(r),sql=db();
 if(b.action==='logout'){const token=r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('riviera_session='))?.split('=')[1];if(token)await sql`DELETE FROM riviera.sessions WHERE token_hash=${await tokenHash(token)}`;return json({ok:true},200,{'Set-Cookie':cookie(r,'',0)});}
 if(b.action==='password'){const u=await requireUser(r);const current=textField(b.currentPassword,'Contraseña actual',1,128);const next=validPassword(b.password);const rows=await sql`SELECT password_hash FROM riviera.users WHERE id=${u.id}`;if(!await verifyPassword(current,rows[0].password_hash))fail(400,'La contraseña actual no es correcta.');const hash=await hashPassword(next);await sql.transaction([sql`UPDATE riviera.users SET password_hash=${hash},must_change_password=false WHERE id=${u.id}`,sql`DELETE FROM riviera.sessions WHERE user_id=${u.id}`,sql`INSERT INTO riviera.audit(actor_id,action,target_id) VALUES(${u.id},'Cambio de contraseña',${u.id})`]);return json({ok:true},200,{'Set-Cookie':cookie(r,'',0)});}
 if(!['login','register'].includes(b.action))fail(400,'Acción inválida.');
 const login=b.action==='register'?validDni(b.dni):textField(b.dni,'DNI o usuario',1,30).replace(/[.\s]/g,'').toLowerCase();
 const ip=r.headers.get('cf-connecting-ip')||'local';
 await rateLimit(`auth-ip:${ip}`,50);await rateLimit(`auth:${await tokenHash(login)}`,10);
 let user;
 if(b.action==='register'){
  const name=textField(b.name,'Nombre y apellido',3,100),department=textField(b.department,'Departamento',1,30).toUpperCase(),password=validPassword(b.password);
  if(b.acceptRules!==true)fail(400,'Debés aceptar el reglamento para registrarte.');
  const hash=await hashPassword(password);
  const rows=await sql`INSERT INTO riviera.users(dni,name,department,password_hash) VALUES(${login},${name},${department},${hash}) RETURNING id,dni,name,department,role,status,must_change_password`;
  user=rows[0];
 }else{
  const password=textField(b.password,'Contraseña',1,128);
  const rows=await sql`SELECT * FROM riviera.users WHERE dni=${login}`;
  const matched=rows[0];
  const fallback='pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
  if(!await verifyPassword(password,matched?.password_hash??fallback)||!matched||matched.status!=='active')fail(401,'Datos de acceso incorrectos o cuenta suspendida.');
  const {password_hash,...safe}=matched;void password_hash;user=safe;
 }
 const token=randomToken();
 await sql`INSERT INTO riviera.sessions(token_hash,user_id,expires_at) VALUES(${await tokenHash(token)},${user.id},now()+interval '7 days')`;
 return json({user},200,{'Set-Cookie':cookie(r,token)});
 }catch(e){return errorResponse(e);}}
