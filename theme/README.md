# Matka Ceramics — Big Cartel theme

Design: chilli `#D1401F`, warm paper `#FCFAF7`, Archivo, left column menu,
four across, product photographs at their native 2:3.

## Install without risking the live shop

1. In the Big Cartel admin, go to **Design**.
2. **Duplicate your current theme first.** Work on the copy. Your live shop
   keeps running off the original until you deliberately switch.
3. Open **Advanced** (the theme code editor) on the duplicate.
4. Paste each file into the matching tab:

   | File here | Big Cartel tab |
   |---|---|
   | `styles.css` | CSS — **replace the whole file**, don't append |
   | `layout.html` | Layout |
   | `home.html` | Home |
   | `products.html` | Products |
   | `product.html` | Product |

5. **Preview.** Do not publish yet.

## Check these five things in preview, in this order

1. **Add something to the cart.** This is the only part not verified against a
   live store. If it fails, paste the `<form>` block from the original theme's
   Product tab over the one in `product.html`. Everything else is presentational.
2. **The Home page shows products.** If it's empty, change `products.current`
   to `products.all` in `home.html` — Big Cartel scopes those differently
   per page.
3. **The menu shows the right pages.** `layout.html` loops `pages.all`. If it
   pulls in pages you don't want in the menu, replace the loop with hardcoded
   links.
4. **The logo.** Currently the placeholder drawing. Not a proposal.
5. **Mobile.** Below 820px the left column becomes a top row; below 460px the
   grid goes single column.

## Layout note

The grid **bleeds to the top and right edges of the window** — there is no page
margin on that side. Only the menu column holds a margin, and anything that
isn't photographs (footer, product page, text pages) pulls back in via
`.mk-foot, .mk-product, .mk-page`. This is deliberate; it's what makes the
photographs read as the page rather than as contents inside a frame.

## Things you'll want to change

- **Three columns instead of four** — `--cols` in `styles.css`. With the bleed
  and 12px gutters, four across now gives 265px photographs, so this is less
  pressing than it was.
- **The red** — `--red` in `styles.css`, one place, used everywhere.
- **Text warmth** — `--ink` is a warm brown-grey (#6E6260), not black, at
  5.63:1 on the paper. Don't lighten it past about #757575 or 10.5px names
  drop below the 4.5:1 legibility floor.
- **The logo** — replace the whole `<svg>` in `layout.html` with your artwork.
  Upload it in the admin, then:
  `<img src="{{ 'logo.svg' | theme_image_url }}" alt="Matka Ceramics">`
  Keep it transparent. The current PNG has cream baked in and cannot sit on
  this paper colour.

## Still outstanding

- Two product photos are landscape (filter coffee matkas, half-glaze indent
  matkas). Every other shot is 2:3. They crop badly in the grid — reshoot
  vertical.
- Prices are inconsistent between similar pieces: two-tone khullads are listed
  at both $50 and $75, small red-clay khullads at $40 against half-glaze at $75.
