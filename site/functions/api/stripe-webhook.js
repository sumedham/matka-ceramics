/*
  POST /api/stripe-webhook  — Stripe calls this when a payment completes.

  Marks every piece in the order sold, immediately, so nobody can buy it twice
  while the site waits to rebuild.

  SECURITY: this endpoint is public, and anything it accepts can take stock off
  sale. So every request must carry a valid Stripe signature. An unsigned
  request is a stranger being able to mark the whole shop sold out.

  Environment variables (Cloudflare Pages dashboard, never committed):
    STRIPE_WEBHOOK_SECRET   whsec_... from the Stripe webhook endpoint page
  Bindings (wrangler.toml):
    SOLD                    KV namespace holding sold piece ids
*/

const TOLERANCE_SECONDS = 300; // reject replays older than five minutes

const enc = new TextEncoder();

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* Verify Stripe's `t=...,v1=...` signature header against the raw body. */
async function verify(rawBody, header, secret, nowSeconds) {
  if (!header) return { ok: false, why: 'missing signature header' };

  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return { ok: false, why: 'bad timestamp' };
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) {
    return { ok: false, why: 'timestamp outside tolerance' };
  }

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);

  // Stripe may send several v1 signatures during a secret rotation.
  const provided = header
    .split(',')
    .filter((kv) => kv.trim().startsWith('v1='))
    .map((kv) => kv.trim().slice(3));

  return provided.some((sig) => timingSafeEqual(sig, expected))
    ? { ok: true }
    : { ok: false, why: 'signature mismatch' };
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error('webhook called but STRIPE_WEBHOOK_SECRET is not set');
    return new Response('not configured', { status: 500 });
  }
  if (!env.SOLD) {
    console.error('webhook called but the SOLD KV binding is missing');
    return new Response('not configured', { status: 500 });
  }

  // The signature covers the exact bytes Stripe sent, so read the body as text
  // and parse it only after verifying.
  const raw = await request.text();
  const now = Math.floor(Date.now() / 1000);

  const check = await verify(
    raw,
    request.headers.get('stripe-signature'),
    env.STRIPE_WEBHOOK_SECRET,
    now,
  );
  if (!check.ok) {
    console.error('rejected webhook:', check.why);
    return new Response(`invalid signature: ${check.why}`, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('unparseable body', { status: 400 });
  }

  // Acknowledge anything else with a 200 so Stripe stops retrying it.
  if (event.type !== 'checkout.session.completed') {
    return new Response(`ignored ${event.type}`, { status: 200 });
  }

  const session = event.data?.object ?? {};

  // Only mark sold once the money is actually there. Async payment methods can
  // complete the session while the payment is still pending.
  if (session.payment_status !== 'paid') {
    return new Response(`session not paid (${session.payment_status})`, { status: 200 });
  }

  const pieces = String(session.metadata?.pieces ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (pieces.length === 0) {
    console.error('paid session carried no pieces metadata', session.id);
    return new Response('no pieces in metadata', { status: 200 });
  }

  const at = new Date(now * 1000).toISOString();

  await Promise.all(
    pieces.map((id) => env.SOLD.put(id, JSON.stringify({ soldAt: at, session: session.id }))),
  );

  /*
    A record of the sale itself, so there is a history to look back on rather
    than only a list of what is currently unavailable.

    Deliberately holds no customer details. Stripe already has the name, email
    and address, and duplicating them here would mean personal data sitting in
    a second place with no reason to be there. Money and pieces only.

    Keyed by timestamp so `wrangler kv key list` comes back in date order.
  */
  const sale = {
    at,
    session: session.id,
    pieces,
    total: (session.amount_total ?? 0) / 100,
    shipping: (session.shipping_cost?.amount_total ?? 0) / 100,
    currency: (session.currency ?? 'usd').toUpperCase(),
    live: session.livemode === true,
  };

  await env.SOLD.put(`sale:${at}:${session.id.slice(-8)}`, JSON.stringify(sale));

  console.log('sale recorded:', JSON.stringify(sale));
  return new Response(`marked sold: ${pieces.join(', ')}`, { status: 200 });
}
