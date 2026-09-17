// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // The final home of the shop. Set now so canonical and absolute URLs are
  // correct from the moment DNS moves off Big Cartel — nothing is indexed
  // before then anyway, because public/robots.txt blocks it.
  site: 'https://matkaceramics.store',
});
