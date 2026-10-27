import webpush from 'web-push';
import { db } from './server';

type Notice = { title: string; body: string; url?: string };

export async function notifyUser(userId: string, type: 'penalty' | 'waitlist', notice: Notice) {
  const sql = db();
  await sql`INSERT INTO riviera.notifications(user_id,type,title,body,url) VALUES(${userId}::uuid,${type},${notice.title},${notice.body},${notice.url ?? '/#mine'})`;
  const publicKey = process.env.VAPID_PUBLIC_KEY, privateKey = process.env.VAPID_PRIVATE_KEY, subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const subscriptions = await sql`SELECT endpoint,p256dh,auth FROM riviera.push_subscriptions WHERE user_id=${userId}::uuid`;
  await Promise.all(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(notice));
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await sql`DELETE FROM riviera.push_subscriptions WHERE endpoint=${subscription.endpoint}`;
      else console.error('Push delivery failed', statusCode ?? 'unknown');
    }
  }));
}
