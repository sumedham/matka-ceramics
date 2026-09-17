/*
  TEMPORARY DIAGNOSTIC — delete once the Stripe binding is confirmed.

  Reports the NAMES of bindings visible to Pages Functions, and whether the
  Stripe key looks present and well-formed. Never returns a secret value.
*/
export async function onRequestGet({ env }) {
  const key = env.STRIPE_SECRET;

  return new Response(
    JSON.stringify(
      {
        bindingNames: Object.keys(env ?? {}).sort(),
        stripeSecret: {
          present: typeof key === 'string' && key.length > 0,
          type: typeof key,
          length: typeof key === 'string' ? key.length : null,
          looksLikeTestKey: typeof key === 'string' ? key.startsWith('sk_test_') : null,
          looksLikeLiveKey: typeof key === 'string' ? key.startsWith('sk_live_') : null,
        },
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/json' } },
  );
}
