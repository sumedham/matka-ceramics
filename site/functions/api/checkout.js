/*
  POST /api/checkout   { ids: string[] }  ->  { url }

  Cloudflare Pages Function. Runs on the same deployment as the static site.

  SECURITY: the browser sends ids and nothing else. Prices, titles and sold-out
  state are read from this deployment's own /products.json. Never trust a price
  that arrived in a request body — otherwise anyone can buy a $50 khullad for $1
  by editing the page.

  Environment variables, set in the Cloudflare Pages dashboard (never committed):
    STRIPE_SECRET_KEY   sk_test_... while testing, sk_live_... when you go live
    SHIPPING_CENTS      optional, flat shipping in cents. Omit or set 0 for free.
*/

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'Payments are not configured yet.' }, 500);
  }

  let ids;
  try {
    ({ ids } = await request.json());
  } catch {
    return json({ error: 'Could not read your cart.' }, 400);
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ error: 'Your cart is empty.' }, 400);
  }
  if (ids.length > 20) {
    return json({ error: 'That is more pieces than one order can hold.' }, 400);
  }

  const origin = new URL(request.url).origin;

  // The catalogue, straight from this deployment. Single source of truth.
  let catalogue;
  try {
    const res = await fetch(`${origin}/products.json`);
    if (!res.ok) throw new Error(String(res.status));
    catalogue = await res.json();
  } catch {
    return json({ error: 'Could not load the catalogue. Try again shortly.' }, 502);
  }

  const byId = new Map(catalogue.map((p) => [p.id, p]));

  // De-duplicate: every piece is one of a kind, so one line each at most.
  const wanted = [...new Set(ids)];

  const items = [];
  for (const id of wanted) {
    const p = byId.get(id);
    if (!p) return json({ error: 'A piece in your cart no longer exists.' }, 409);
    if (p.soldOut) {
      return json({ error: `${p.title} has just sold. Remove it to continue.` }, 409);
    }
    items.push(p);
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${origin}/cart`);
  form.set('billing_address_collection', 'required');
  form.set('shipping_address_collection[allowed_countries][0]', 'US');
  form.set('shipping_address_collection[allowed_countries][1]', 'CA');

  items.forEach((p, i) => {
    form.set(`line_items[${i}][quantity]`, '1');
    form.set(`line_items[${i}][price_data][currency]`, 'usd');
    form.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(p.price * 100)));
    form.set(`line_items[${i}][price_data][product_data][name]`, p.title);
  });

  // Flat rate, because Stripe shipping rates are fixed amounts — there are no
  // live carrier rates. Leave SHIPPING_CENTS unset to ship free.
  const shipping = Number(env.SHIPPING_CENTS || 0);
  form.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shipping));
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
  form.set(
    'shipping_options[0][shipping_rate_data][display_name]',
    shipping > 0 ? 'Standard shipping' : 'Shipping included',
  );
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '3');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '7');

  // So the pieces sold are visible on the payment in the Stripe dashboard.
  form.set('metadata[pieces]', wanted.join(','));

  let session;
  try {
    const res = await fetch(STRIPE_API, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    session = await res.json();
    if (!res.ok) {
      console.error('stripe error', session?.error);
      return json({ error: 'Stripe refused the order. Nothing has been charged.' }, 502);
    }
  } catch (err) {
    console.error('stripe unreachable', err);
    return json({ error: 'Could not reach Stripe. Nothing has been charged.' }, 502);
  }

  return json({ url: session.url });
}
