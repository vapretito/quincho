export const bookingSlots=[11,20] as const;

export function scheduleFor(date:string,slot:number){
 const day=new Date(`${date}T12:00:00`).getDay();
 if(slot===11)return {name:'Mediodía',start:11,end:[0,6].includes(day)?16:15};
 return {name:'Noche',start:20,end:[5,6].includes(day)?3:0};
}

export function slotLabel(date:string,slot:number){
 const schedule=scheduleFor(date,slot);
 return `${schedule.name} · ${String(schedule.start).padStart(2,'0')}:00 a ${String(schedule.end).padStart(2,'0')}:00 h`;
}

export function slotTime(date:string,slot:number){
 const schedule=scheduleFor(date,slot);
 return `${String(schedule.start).padStart(2,'0')}:00 a ${String(schedule.end).padStart(2,'0')}:00 h`;
}
