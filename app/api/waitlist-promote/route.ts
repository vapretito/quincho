import {errorResponse,json} from '@/lib/server';
import {promoteEligibleWaitlist} from '@/lib/waitlist';

export async function GET(request:Request){try{
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return json({error:'No autorizado.'},401);
 const promoted=await promoteEligibleWaitlist();
 return json({ok:true,promoted:promoted.length});
 }catch(error){return errorResponse(error);}}
