/*
  GET /api/sold  ->  { sold: string[] }

  Pieces that have sold since the last build. The static pages are only as
  fresh as the most recent deploy, so the grid and the piece pages fetch this
  and grey out anything that went while the page was cached.

  Purely cosmetic. Checkout enforces the same list server-side, so a stale or
  blocked fetch can never result in selling something twice.
*/
export async function onRequestGet({ env }) {
  if (!env.SOLD) {
    return new Response(JSON.stringify({ sold: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const keys = [];
  let cursor;

  // KV lists in pages; a shop this size will never need more than one, but
  // looping costs nothing and avoids a silent truncation later.
  do {
    const page = await env.SOLD.list({ cursor });
    keys.push(...page.keys.map((k) => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  // The same namespace also holds `sale:` history records. Those are not
  // pieces, and returning them here would have the grid trying to mark
  // non-existent products sold.
  const sold = keys.filter((name) => !name.startsWith('sale:'));

  return new Response(JSON.stringify({ sold }), {
    headers: {
      'content-type': 'application/json',
      // Short cache: fresh enough to matter, cheap enough to serve.
      'cache-control': 'public, max-age=30',
    },
  });
}
