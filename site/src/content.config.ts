import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      price: z.number().positive(),
      soldOut: z.boolean().default(false),
      image: image(),
      // extra shots for the piece's own page; the main image is always first
      gallery: z.array(image()).optional(),
      // lowest number shows first; new work goes to the top with order: 0
      order: z.number().default(99),
    }),
});

export const collections = { products };
