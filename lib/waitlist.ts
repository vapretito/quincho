import {db} from './server';
import {notifyUser} from './notifications';

type PromotedBooking={user_id:string;date:string;slot:number};
type AuditRow={target_id:string};

/** Confirma la primera solicitud de cada turno libre cuando faltan cinco horas o menos. */
export async function promoteEligibleWaitlist(){
 const sql=db();
 const promoted=await sql<AuditRow[]>`WITH ranked AS (
   SELECT b.id,b.user_id,b.date,b.slot,
    row_number() OVER (PARTITION BY b.date,b.slot ORDER BY b.created_at,b.id) AS position
   FROM riviera.bookings b
   WHERE b.status='waitlisted'
    AND (b.date+make_time(b.slot,0,0)) AT TIME ZONE 'America/Argentina/Buenos_Aires' > now()
    AND (b.date+make_time(b.slot,0,0)) AT TIME ZONE 'America/Argentina/Buenos_Aires' <= now()+interval '5 hours'
 ), promoted AS (
   UPDATE riviera.bookings b SET status='confirmed'
   FROM ranked r
   WHERE b.id=r.id AND r.position=1
    AND NOT EXISTS(SELECT 1 FROM riviera.bookings occupied WHERE occupied.date=b.date AND occupied.slot=b.slot AND occupied.status IN('confirmed','blocked'))
   RETURNING b.id,b.user_id,b.date::text,b.slot
 )
 INSERT INTO riviera.audit(actor_id,action,target_id)
 SELECT NULL,'Promoción automática desde lista de espera',id::text FROM promoted
 RETURNING target_id`;
 if(!promoted.length)return [];
 const details=await sql<PromotedBooking[]>`SELECT b.user_id,b.date::text,b.slot FROM riviera.bookings b WHERE b.id=ANY(${promoted.map(row=>row.target_id)}::uuid[])`;
 await Promise.all(details.map(booking=>notifyUser(booking.user_id,'booking',{title:'Reserva confirmada automáticamente',body:`Tu solicitud en lista de espera para el ${booking.date} a las ${booking.slot}:00 fue confirmada.`,url:'/#mine'})));
 return details;
}
