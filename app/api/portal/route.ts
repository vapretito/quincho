import {db,currentUser,json,errorResponse,fail} from '@/lib/server';
import {promoteEligibleWaitlist} from '@/lib/waitlist';
export async function GET(r:Request){try{
 const month=new URL(r.url).searchParams.get('month');if(!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))fail(400,'Mes inválido.');
 await promoteEligibleWaitlist();
 const sql=db(),user=await currentUser(r);
 const [settings,slots,mine,messages,notifications,clock]=await Promise.all([
  sql`SELECT rules,advance_days,cancellation_hours,updated_at FROM riviera.settings WHERE id=1`,
  sql`SELECT date::text,slot,status FROM riviera.bookings WHERE date>=${month+'-01'}::date AND date<${month+'-01'}::date+interval '1 month' AND status IN('confirmed','blocked') ORDER BY date,slot`,
  user?sql`SELECT b.id,b.date::text,b.slot,b.status,b.note,b.attended,b.created_at FROM riviera.bookings b WHERE b.user_id=${user.id} ORDER BY b.date DESC,b.slot DESC LIMIT 500`:Promise.resolve([]),
  user?sql`SELECT p.id,p.booking_id,p.description,p.created_at,b.date::text AS booking_date,b.slot AS booking_slot FROM riviera.penalty_messages p LEFT JOIN riviera.bookings b ON b.id=p.booking_id WHERE p.user_id=${user.id} ORDER BY p.created_at DESC LIMIT 100`:Promise.resolve([]),
  user?sql`SELECT id,type,title,body,url,created_at FROM riviera.notifications WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 50`:Promise.resolve([]),
  sql`SELECT to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires','YYYY-MM-DD') AS today,extract(hour FROM now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::int AS hour`
 ]);
 return json({user,settings:settings[0],slots,mine,messages,notifications,today:clock[0].today,hour:clock[0].hour});
 }catch(e){return errorResponse(e);}}
