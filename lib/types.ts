export type User={id:string;dni:string;name:string;department:string;email?:string|null;phone?:string|null;role:'admin'|'resident';status:'active'|'suspended';must_change_password:boolean;created_at?:string};
export type Booking={id:string;date:string;slot:number;status:'confirmed'|'waitlisted'|'blocked'|'cancelled';note:string;attended?:boolean|null;penalty_note?:string;user_id?:string;name?:string;department?:string;dni?:string;email?:string;phone?:string;created_at?:string};
export type Settings={rules:string;advance_days:number;cancellation_hours:number;updated_at:string};
export type PenaltyMessage={id:string;description:string;created_at:string;booking_id?:string;booking_date?:string;booking_slot?:number};
export type NotificationItem={id:string;type:'penalty'|'waitlist';title:string;body:string;url:string;created_at:string};
export type PortalData={user:User|null;settings:Settings;slots:Pick<Booking,'date'|'slot'|'status'>[];mine:Booking[];messages:PenaltyMessage[];notifications:NotificationItem[];today:string;hour:number};
export type AdminData={users:User[];bookings:Booking[];audit:{id:string;action:string;target_id:string;created_at:string;name:string}[]};
export const dateLabel=(date:string,options:Intl.DateTimeFormatOptions={day:'numeric',month:'long',year:'numeric'})=>new Date(date+'T12:00:00').toLocaleDateString('es-AR',options);
export async function api<T=Record<string,unknown>>(path:string,data?:unknown):Promise<T>{const response=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,cache:'no-store'});const result=await response.json() as T & {error?:string};if(!response.ok)throw new Error(result.error||'No se pudo completar la solicitud.');return result;}
