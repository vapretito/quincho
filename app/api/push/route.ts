import { body, currentUser, errorResponse, json, requireUser, textField } from '@/lib/server';

export async function GET(request: Request) {
  const user = await currentUser(request);
  return json({ publicKey: user ? process.env.VAPID_PUBLIC_KEY ?? null : null });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request), payload = await body(request);
    const endpoint = textField(payload.endpoint, 'Suscripción', 10, 2000);
    const p256dh = textField(payload.keys?.p256dh, 'Clave de suscripción', 10, 500);
    const auth = textField(payload.keys?.auth, 'Clave de suscripción', 5, 500);
    const { db } = await import('@/lib/server');
    await db()`INSERT INTO riviera.push_subscriptions(user_id,endpoint,p256dh,auth) VALUES(${user.id}::uuid,${endpoint},${p256dh},${auth}) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,updated_at=now()`;
    return json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
