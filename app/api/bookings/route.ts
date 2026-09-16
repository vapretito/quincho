import {db,body,requireUser,json,errorResponse,fail,validDate,validId,textField} from '@/lib/server';
export async function POST(r:Request){try{
 const b=await body(r),u=await requireUser(r),sql=db();if(u.must_change_password)fail(403,'Cambiá tu contraseña temporal antes de continuar.');
 if(b.action==='cancel'){
  const id=validId(b.id);
  const changed=await sql`WITH changed AS(UPDATE riviera.bookings SET status='cancelled',cancelled_at=now(),cancelled_by=${u.id} WHERE id=${id} AND status IN('confirmed','blocked') AND (${u.role==='admin'} OR (user_id=${u.id} AND (date+make_time(slot,0,0)) AT TIME ZONE 'America/Argentina/Buenos_Aires'>now()+(SELECT cancellation_hours FROM riviera.settings WHERE id=1)*interval '1 hour')) RETURNING id) INSERT INTO riviera.audit(actor_id,action,target_id) SELECT ${u.id},'Cancelación de turno',id::text FROM changed RETURNING target_id`;
  if(!changed.length)fail(409,'No se puede cancelar esta reserva. Revisá el plazo de cancelación o contactá a la administración.');return json({ok:true});
 }
 if(!['reserve','block'].includes(b.action))fail(400,'Acción inválida.');
 if(b.action==='block'&&u.role!=='admin')fail(403,'Solo la administración puede bloquear turnos.');
 if(b.action==='reserve'&&b.acceptRules!==true)fail(400,'Debés aceptar el reglamento.');
 const date=validDate(b.date),slot=Number(b.slot);if(![12,20].includes(slot))fail(400,'Turno inválido.');
 const target=u.role==='admin'&&b.userId?validId(b.userId):u.id;
 const note=b.note?textField(b.note,'Observación',0,500):'';
 const status=b.action==='block'?'blocked':'confirmed';
 const changed=await sql`WITH created AS(INSERT INTO riviera.bookings(date,slot,user_id,status,note,created_by)
 SELECT ${date}::date,${slot},CASE WHEN ${status}='blocked' THEN NULL ELSE ${target}::uuid END,${status},${note},${u.id}::uuid
 FROM riviera.settings s WHERE s.id=1
 AND (${date}::date+make_time(${slot},0,0)) AT TIME ZONE 'America/Argentina/Buenos_Aires'>now()
 AND ${date}::date<=(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date+s.advance_days
 AND EXISTS(SELECT 1 FROM riviera.users WHERE id=${u.id} AND status='active')
 AND (${status}='blocked' OR EXISTS(SELECT 1 FROM riviera.users WHERE id=${target} AND status='active'))
 RETURNING id) INSERT INTO riviera.audit(actor_id,action,target_id) SELECT ${u.id},${status==='blocked'?'Bloqueo de turno':'Reserva de turno'},id::text FROM created RETURNING target_id`;
 if(!changed.length)fail(409,'La fecha está fuera del plazo permitido, el turno ya comenzó o el residente está suspendido.');
 return json({ok:true,id:changed[0].target_id},201);
 }catch(e){return errorResponse(e);}}
