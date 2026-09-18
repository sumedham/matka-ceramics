// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [
    sitemap({
      // The cart and the confirmation page are useless in search results, and
      // /admin is Sumedha's, not Google's.
      filter: (page) => !/\/(cart|thank-you|admin)\/?$/.test(page),
    }),
  ],
  // The shop is served from www: the bare domain 301-redirects there via an
  // IONOS redirect, and it can't point at Pages directly without moving
  // nameservers to Cloudflare — which would put the domain's email at risk for
  // no real gain. So www is canonical, and this must match or every canonical
  // URL points somewhere that only redirects.
  site: 'https://www.matkaceramics.store',
});
