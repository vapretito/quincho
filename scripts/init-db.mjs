import { readFileSync, existsSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../lib/password.mjs';
const sql=neon(process.env.DATABASE_URL);
try {
 const statements=readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
 await sql.transaction(statements.map(s=>sql.query(s)));
 const admins=await sql`SELECT id FROM riviera.users WHERE role='admin'`;
 if(!admins.length){
  if(!process.env.ADMIN_INITIAL_PASSWORD)throw new Error('ADMIN_INITIAL_PASSWORD required for initial setup');
  const hash=await hashPassword(process.env.ADMIN_INITIAL_PASSWORD);
  await sql`INSERT INTO riviera.users(dni,name,department,password_hash,role,must_change_password) VALUES('administracion','Administración','ADMIN',${hash},'admin',true)`;
 }
 console.log('Schema ready. Administrator account configured.');
}catch(e){console.error('Database setup failed:',e.code??e.name,e.message?.replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]'));process.exitCode=1;}
