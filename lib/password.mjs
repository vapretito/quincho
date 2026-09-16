const encoder = new TextEncoder();
export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
 const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);
 return `pbkdf2$100000$${Buffer.from(salt).toString('hex')}$${Buffer.from(bits).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
 const parts=stored.split('$');
 if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='100000')return false;
 const actual=await hashPassword(password,Buffer.from(parts[2],'hex'));
 let diff=actual.length ^ stored.length;
 for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^stored.charCodeAt(i);
 return diff===0;
}
export async function tokenHash(token) {return Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(token))).toString('hex');}
export function randomToken(){return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');}
