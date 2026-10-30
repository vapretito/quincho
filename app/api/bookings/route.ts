import {db,body,requireUser,json,errorResponse,fail,validDate,validId,textField} from '@/lib/server';
import {notifyUser} from '@/lib/notifications';
import {bookingSlots} from '@/lib/schedule';
export async function POST(r:Request){try{
 const b=await body(r),u=await requireUser(r),sql=db();if(u.must_change_password)fail(403,'Cambiá tu contraseña temporal antes de continuar.');
 if(b.action==='cancel'){
  const id=validId(b.id);
  const changed=await sql`WITH changed AS(UPDATE riviera.bookings SET status='cancelled',cancelled_at=now(),cancelled_by=${u.id} WHERE id=${id} AND status IN('confirmed','waitlisted','blocked') AND (${u.role==='admin'} OR (user_id=${u.id} AND (date+make_time(slot,0,0)) AT TIME ZONE 'America/Argentina/Buenos_Aires'>now()+(SELECT cancellation_hours FROM riviera.settings WHERE id=1)*interval '1 hour')) RETURNING id) INSERT INTO riviera.audit(actor_id,action,target_id) SELECT ${u.id},'Cancelación de turno',id::text FROM changed RETURNING target_id`;
  if(!changed.length)fail(409,'No se puede cancelar esta reserva. Revisá el plazo de cancelación o contactá a la administración.');
  const released=await sql`SELECT date::text,slot FROM riviera.bookings WHERE id=${changed[0].target_id}`;
  const waitlist=await sql`SELECT user_id FROM riviera.bookings WHERE date=${released[0].date}::date AND slot=${released[0].slot} AND status='waitlisted'`;
  await Promise.all(waitlist.map(waiting=>notifyUser(waiting.user_id,'waitlist',{title:'Se liberó un turno',body:`Se liberó el turno del ${released[0].date} a las ${released[0].slot}:00, para el que estabas en lista de espera.`,url:'/#mine'})));
  return json({ok:true});
 }
 if(!['reserve','block'].includes(b.action))fail(400,'Acción inválida.');
 if(b.action==='block'&&u.role!=='admin')fail(403,'Solo la administración puede bloquear turnos.');
 if(b.action==='reserve'&&b.acceptRules!==true)fail(400,'Debés aceptar el reglamento.');
 const date=validDate(b.date),slot=Number(b.slot);if(!bookingSlots.includes(slot as 11|20))fail(400,'Turno inválido.');
 const target=u.role==='admin'&&b.userId?validId(b.userId):u.id;
 const existing=await sql`SELECT id FROM riviera.bookings WHERE date=${date}::date AND slot=${slot} AND user_id=${target}::uuid AND status IN('confirmed','waitlisted') LIMIT 1`;
 if(existing.length)fail(409,'Ya tenés una reserva o una solicitud en lista de espera para este turno.');
 const note=b.note?textField(b.note,'Observación',0,500):'';
 const status=b.action==='block'?'blocked':'confirmed';
 const changed=await sql`WITH created AS(INSERT INTO riviera.bookings(date,slot,user_id,status,note,created_by)
 SELECT ${date}::date,${slot},CASE WHEN ${status}='blocked' THEN NULL ELSE ${target}::uuid END,
 CASE WHEN ${status}='blocked' THEN 'blocked'
 WHEN EXISTS(SELECT 1 FROM riviera.bookings occupied WHERE occupied.date=${date}::date AND occupied.slot=${slot} AND occupied.status IN('confirmed','blocked')) THEN 'waitlisted'
 WHEN EXISTS(SELECT 1 FROM riviera.bookings prior WHERE prior.user_id=${target}::uuid AND prior.status='confirmed' AND date_trunc('month',prior.date)=date_trunc('month',${date}::date)) THEN 'waitlisted'
 ELSE 'confirmed' END,${note},${u.id}::uuid
 FROM riviera.settings s WHERE s.id=1
 AND (${date}::date+make_time(${slot},0,0)) AT TIME ZONE 'America/Argentina/Buenos_Aires'>now()
 AND ${date}::date<=(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+s.advance_days
 AND EXISTS(SELECT 1 FROM riviera.users WHERE id=${u.id} AND status='active')
 AND (${status}='blocked' OR EXISTS(SELECT 1 FROM riviera.users WHERE id=${target} AND status='active'))
 RETURNING id,status) INSERT INTO riviera.audit(actor_id,action,target_id) SELECT ${u.id},CASE WHEN status='waitlisted' THEN 'Reserva en lista de espera' WHEN status='blocked' THEN 'Bloqueo de turno' ELSE 'Reserva de turno' END,id::text FROM created RETURNING target_id`;
 if(!changed.length)fail(409,'La fecha está fuera del plazo permitido, el turno ya comenzó o el residente está suspendido.');
 const created=await sql`SELECT status FROM riviera.bookings WHERE id=${changed[0].target_id}`;
 const accepted=created[0]?.status==='confirmed';
 await notifyUser(target,'booking',{title:accepted?'Reserva confirmada':'Solicitud en lista de espera',body:accepted?`Tu reserva para el ${date} a las ${slot}:00 fue aceptada.`:`Tu solicitud para el ${date} a las ${slot}:00 quedó en lista de espera. Si el turno sigue libre cuando falten cinco horas, se confirmará automáticamente según el orden de solicitud.`,url:'/#mine'});
 return json({ok:true,id:changed[0].target_id,status:created[0]?.status},201);
 }catch(e){return errorResponse(e);}}
