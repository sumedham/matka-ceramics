import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/*
  The catalogue as the server sees it. This is what /api/checkout reads to price
  an order, so it is the single source of truth for money. Keep it free of
  anything the browser could influence.
*/
export const GET: APIRoute = async () => {
  const products = await getCollection('products');

  const body = products
    .sort((a, b) => a.data.order - b.data.order)
    .map((p) => ({
      id: p.id,
      title: p.data.title,
      price: p.data.price,
      soldOut: p.data.soldOut,
    }));

  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
    },
  });
};
