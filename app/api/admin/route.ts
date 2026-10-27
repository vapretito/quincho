import {db,body,requireUser,json,errorResponse,fail,validId,validDni,validEmail,validPhone,textField,validPassword} from '@/lib/server';
import {hashPassword} from '@/lib/password.mjs';
import {notifyUser} from '@/lib/notifications';
export async function GET(r:Request){try{
 await requireUser(r,true);const sql=db();
 const [users,bookings,audit]=await Promise.all([
 sql`SELECT id,dni,name,department,email,phone,role,status,must_change_password,created_at FROM riviera.users ORDER BY created_at DESC`,
 sql`SELECT b.id,b.date::text,b.slot,b.user_id,b.status,b.note,b.attended,b.created_at,u.name,u.department,u.dni,u.email,u.phone,COALESCE((SELECT string_agg(p.description,' | ' ORDER BY p.created_at) FROM riviera.penalty_messages p WHERE p.booking_id=b.id),'') AS penalty_note FROM riviera.bookings b LEFT JOIN riviera.users u ON u.id=b.user_id ORDER BY b.date DESC,b.slot DESC`,
 sql`SELECT a.id,a.action,a.target_id,a.created_at,u.name FROM riviera.audit a LEFT JOIN riviera.users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100`
 ]);return json({users,bookings,audit});
 }catch(e){return errorResponse(e);}}
export async function POST(r:Request){try{
 const b=await body(r),u=await requireUser(r,true),sql=db();if(u.must_change_password)fail(403,'Cambiá la contraseña temporal antes de administrar.');
 if(b.action==='settings'){
  const rules=textField(b.rules,'Reglamento',20,15000),advance=Number(b.advanceDays),hours=Number(b.cancellationHours);
  if(!Number.isInteger(advance)||advance<1||advance>365||!Number.isInteger(hours)||hours<0||hours>168)fail(400,'Plazos inválidos.');
  await sql.transaction([sql`UPDATE riviera.settings SET rules=${rules},advance_days=${advance},cancellation_hours=${hours},updated_at=now() WHERE id=1`,sql`INSERT INTO riviera.audit(actor_id,action,target_id) VALUES(${u.id},'Actualización de reglamento y plazos','1')`]);return json({ok:true});
 }
 if(b.action==='user'){
  const id=validId(b.id);
  const name=textField(b.name,'Nombre',3,100),department=textField(b.department,'Departamento',1,30).toUpperCase(),email=validEmail(b.email),phone=validPhone(b.phone);
  if(!['active','suspended'].includes(b.status)||!['resident','admin'].includes(b.role))fail(400,'Estado o rol inválido.');
  if(id===u.id&&(b.status!=='active'||b.role!=='admin'))fail(400,'No podés quitar tu propio acceso de administración.');
  const existing=await sql`SELECT dni FROM riviera.users WHERE id=${id}`;if(!existing.length)fail(404,'Residente no encontrado.');
  const dni=existing[0].dni==='administracion'?'administracion':validDni(b.dni);
  await sql.transaction([sql`UPDATE riviera.users SET name=${name},department=${department},dni=${dni},email=${email},phone=${phone},status=${b.status},role=${b.role} WHERE id=${id}`,sql`DELETE FROM riviera.sessions WHERE user_id=${id} AND ${id!==u.id}`,sql`INSERT INTO riviera.audit(actor_id,action,target_id) VALUES(${u.id},'Actualización de residente',${id})`]);return json({ok:true});
 }
 if(b.action==='attendance'){
  const id=validId(b.id);if(typeof b.attended!=='boolean')fail(400,'Asistencia inválida.');
  const rows=await sql`UPDATE riviera.bookings SET attended=${b.attended} WHERE id=${id} AND status='confirmed' RETURNING id`;
  if(!rows.length)fail(404,'Reserva confirmada no encontrada.');await sql`INSERT INTO riviera.audit(actor_id,action,target_id) VALUES(${u.id},${b.attended?'Asistencia confirmada':'Asistencia desmarcada'},${id})`;return json({ok:true});
 }
 if(b.action==='penalty'){
  const bookingId=validId(b.bookingId),description=textField(b.description,'Descripción de la multa',5,1000);
  const rows=await sql`SELECT user_id,date::text,slot FROM riviera.bookings WHERE id=${bookingId} AND user_id IS NOT NULL`;
  if(!rows.length)fail(404,'Reserva no encontrada.');await sql.transaction([sql`INSERT INTO riviera.penalty_messages(user_id,booking_id,description,created_by) VALUES(${rows[0].user_id},${bookingId},${description},${u.id})`,sql`INSERT INTO riviera.audit(actor_id,action,target_id) VALUES(${u.id},'Multa informada al residente',${bookingId})`]);
  await notifyUser(rows[0].user_id,'penalty',{title:'Nueva multa informada',body:`La administración registró una multa por tu reserva del ${rows[0].date} a las ${rows[0].slot}:00.`,url:'/#mine'});return json({ok:true});
 }
 if(b.action==='resetPassword'){
  const id=validId(b.id);
  const password=validPassword(b.password),hash=await hashPassword(password);
  const rows=await sql`SELECT id FROM riviera.users WHERE id=${id}`;if(!rows.length)fail(404,'Residente no encontrado.');
  await sql.transaction([sql`UPDATE riviera.users SET password_hash=${hash},must_change_password=true WHERE id=${id}`,sql`DELETE FROM riviera.sessions WHERE user_id=${id}`,sql`INSERT INTO riviera.audit(actor_id,action,target_id) VALUES(${u.id},'Restablecimiento de contraseña',${id})`]);return json({ok:true});
 }
 fail(400,'Acción inválida.');
 }catch(e){return errorResponse(e);}}
