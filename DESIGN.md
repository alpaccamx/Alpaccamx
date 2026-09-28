---
name: Alpacca
description: Catálogo de skincare coreano al mayoreo — cálido, rosa y hecho para sacar cuentas.
colors:
  peony-rose: "#ee6c92"
  deep-peony: "#c4466e"
  peony-ink: "#b33660"
  dusk-lilac: "#8b84ac"
  dusk-lilac-band: "#766f96"
  lilac-ink: "#696288"
  blush: "#f6cadb"
  petal-bar: "#fdd2de"
  cream-paper: "#fffcf4"
  plum-ink: "#3d3a42"
  ink-muted: "rgba(61, 58, 66, 0.75)"
  ink-placeholder: "rgba(61, 58, 66, 0.72)"
  hairline: "rgba(61, 58, 66, 0.1)"
  field-border: "rgba(61, 58, 66, 0.2)"
  card-surface: "rgba(255, 255, 255, 0.6)"
  field-surface: "rgba(255, 255, 255, 0.7)"
  in-stock-bg: "#dcfce7"
  in-stock-text: "#15803d"
  sold-out-bg: "#fee2e2"
  sold-out-text: "#b91c1c"
  whatsapp-green: "#25d366"
  mercadopago-blue: "#0074c2"
typography:
  display:
    fontFamily: "Ready to Party, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.1
  headline:
    fontFamily: "Ready to Party, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  price:
    fontFamily: "Josefin Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "'tnum'"
  meta:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  eyebrow:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.025em"
  label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.05em"
  chip:
    fontFamily: "Nunito, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.deep-peony}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.peony-ink}"
    textColor: "{colors.cream-paper}"
  button-card:
    backgroundColor: "{colors.deep-peony}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
    width: "100%"
  button-outline-rose:
    textColor: "{colors.peony-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  button-ghost:
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  icon-button:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    size: "44px"
  product-card:
    backgroundColor: "{colors.card-surface}"
    rounded: "{rounded.xl}"
    padding: "12px"
  info-tile:
    backgroundColor: "{colors.card-surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  feature-band:
    backgroundColor: "{colors.dusk-lilac-band}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.2xl}"
    padding: "48px 24px"
  input-field:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  search-field:
    backgroundColor: "{colors.field-surface}"
    rounded: "{rounded.pill}"
    padding: "8px 40px 8px 16px"
  chip-presentation:
    backgroundColor: "{colors.blush}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-box:
    textColor: "{colors.lilac-ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-in-stock:
    backgroundColor: "{colors.in-stock-bg}"
    textColor: "{colors.in-stock-text}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-sold-out:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.cream-paper}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  rank-badge:
    backgroundColor: "{colors.deep-peony}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.pill}"
    size: "32px"
---

# Design System: Alpacca

## Overview

**Creative North Star: "The Friendly Wholesale Counter"**

Alpacca looks like a small shop counter run by someone who knows you. The surface is warm and a little playful: cream paper, peony-rose buttons, the alpaca mascot, and headings set in a rounded hand-lettered display face. Underneath, the job is practical. A reseller comes here to do the math: unit vs. box, transfer vs. card price, shipping by weight and zip code, and how far they are from the order minimum. The friendliness puts people at ease; the numbers are what they came for.

The system is soft and flat. Surfaces are translucent white cards on cream with hairline plum borders, and depth appears only on hover. Rose is the single action color. Lilac provides calm contrast bands. Blush and the petal bar are backgrounds and never compete with actions. Density is moderate: two-column product grids on phones, up to six on desktop, with generous 56px pauses between homepage sections.

Personality comes from a few specific details rather than decoration: the Ready to Party headings, numbered rank badges, the mascot in empty states, and emoji used as inline signposts in operational copy (✅ En stock, ✈️ Envío Corea→México, 🏦 transferencia).

**Key Characteristics:**
- Cream paper ground (never pure white) with plum ink text (never pure black).
- One action color: Deep Peony on every "Agregar", cart and CTA; the bright Peony Rose only where no text sits.
- Pill shapes for anything you tap; rounded 16px cards for anything you read.
- Flat at rest; a shadow and a rose border tint appear on hover.
- A playful display face for headings, a plain sans for everything else, and Josefin Sans for prices.
- Emoji as functional signposts in commerce copy, not as decoration.

## Colors

A warm pastel palette on cream: one saturated rose for action, one muted lilac for contrast, and plum ink carried at several opacities for all text and lines.

### Primary
The rose is two-toned: one hue at three lightnesses, split by whether text sits on it.
- **Deep Peony** (`deep-peony`): the action fill. Every primary button ("Agregar", "Explorar catálogo", the cart pill, login and checkout buttons, the file-upload button) and the Best Seller rank badges, always with cream text (4.6:1). The large 01–04 step numerals also use it.
- **Peony Ink** (`peony-ink`): rose *text* on light grounds (links such as "Habla con Mae →", the order-minimum warning, form errors, the "Avísame" outline button) and the hover fill for Deep Peony buttons (5.7:1 with cream).
- **Peony Rose** (`peony-rose`): the bright brand pink, now reserved for fills that carry no text: icon circles (10% tint behind a rose stroke icon), the favorited heart, the active hero dot, quiz progress and order-tracker dots, hover tints and border washes (10–40%).

### Secondary
- **Dusk Lilac** (`dusk-lilac`): tints, borders and the keyboard focus ring. At 20% it's the ground of the "Caja con N piezas" chip, so box sizes read differently from single units.
- **Dusk Lilac Band** (`dusk-lilac-band`): the full-bleed calm bands with cream text: the scrolling ticker and the promo banner (4.6:1; the promo subtitle is full cream, not faded).
- **Lilac Ink** (`lilac-ink`): lilac *text* on light grounds: box-chip labels, the card-price highlight in the transfer-discount note, the account order summary.

### Tertiary
- **Blush** (`blush`): soft support. Focus rings on every input (2px), cart-count and wishlist-count bubbles, product image wells (at 20%), "Pieza individual" chips (at 50%), dropdown hover rows (at 40%).
- **Petal Bar** (`petal-bar`): the top announcement bar only.

### Neutral
- **Cream Paper** (`cream-paper`): page background, header (at 95% with backdrop blur), drawers, and text on rose or lilac.
- **Plum Ink** (`plum-ink`): all primary text, headings, the sold-out badge and the dark time-deal panel. At 40% it's the modal overlay.
- **Ink Muted** (`ink-muted`): the lightest text the system allows (5.1:1 on cream, 5.0 on blush tints). Secondary copy, descriptions, eyebrows, "Cerrar" text buttons, empty states, footer links, brand labels on cards.
- **Ink Placeholder** (`ink-placeholder`): placeholder text in fields (4.8:1), a shade lighter than typed text.
- **Hairline** (`hairline`): every card, tile, header and divider border.
- **Field Border** (`field-border`): input and search field strokes.
- **Card Surface / Field Surface** (`card-surface`, `field-surface`): translucent white over cream for cards, tiles and inputs.

### Status
- **In Stock** (`in-stock-bg` / `in-stock-text`): the "✅ Entrega inmediata · N piezas" chip.
- **Sold Out** (`sold-out-bg` / `sold-out-text`): the "❌ Agotado" chip on in-stock items that ran out.
- **Third-party buttons** (`whatsapp-green`, `mercadopago-blue`) keep their brand hue but are tuned for contrast: WhatsApp green (#25D366) takes plum ink text and icon (5.5:1), not white; the Mercado Pago button uses a deeper Mercado Pago blue (#0074C2, hover #00609F) under white text (4.9:1).
- On the dark plum time-deal panel, the eyebrow is blush (7.6:1), not rose.

### Browser Surfaces
Text selection is blush behind plum ink; checkboxes and other native controls use Deep Peony (`accent-color`); the text cursor in fields is Deep Peony; the search field's clear "×" is a 14px plum stroke icon. None of the operating system's blue should show.

### Named Rules
**The One Rose Rule.** Rose means "do something". Don't use it for decoration, section backgrounds or large text blocks. If an element isn't tappable, it doesn't get rose (step numerals and icon tints are the only exceptions).

**The Text Gets the Deep Shade Rule.** Any rose or lilac that carries text, or has text on it, uses its deep shade: Deep Peony or Peony Ink, Lilac Band or Lilac Ink. The bright Peony Rose and Dusk Lilac never sit behind or in front of words. Every text pair meets WCAG AA (4.5:1, or 3:1 at 24px and up).

**The Ink Floor Rule.** Text is never lighter than `ink-muted` (plum at 75%). Fainter ink is for borders and dividers only.

**The Cream, Not White Rule.** The page is always cream paper. White appears only as a translucent layer (60–70%) on cards and fields, so the warmth shows through.

## Typography

**Display Font:** Ready to Party (self-hosted, `fonts/ReadyToParty.ttf`), with sans-serif fallback
**Body Font:** Nunito (Google Fonts, 400/600/700/800)
**Price Font:** Josefin Sans (Google Fonts, 600 only)

**Character:** Ready to Party is the brand's voice: rounded, hand-lettered and a little festive, used only for headings. Nunito's soft round terminals continue that friendliness through body text without drawing attention. Josefin Sans's geometric figures give prices a clean, catalog-like read.

### Hierarchy
- **Display** (Ready to Party 400, 30px → 36px on desktop): the promo band headline and text-only hero slides (up to 48px).
- **Headline** (Ready to Party 400, 24px → 30px): every section title ("Best Seller", "Preguntas frecuentes"), drawer titles, the quiz result.
- **Eyebrow** (Nunito 600, 12px → 14px, uppercase, 0.025em tracking, ink muted): the short line above every section headline ("Elegidos por nuestros clientes", "Antes de comprar").
- **Title** (Nunito 600, 14–16px, leading-snug): product names (the size steps down for long names), tile headings, FAQ questions.
- **Price** (Josefin Sans 600, 18px, tabular figures): the card price, the strongest element on a product card.
- **Meta** (Nunito 400/600, 12px): everything under the price, one fact per short line: per-piece price for boxes ("$287.50 c/u"), "🏦 Por transferencia", "Con tarjeta: $X" (Lilac Ink, 600). Also card size ("30ml"), helper text under fields, cart notes.
- **Body** (Nunito 400, 14px, ink muted): descriptions, tile copy, FAQ answers. The base size for page copy is 16px.
- **Label** (Nunito 400, 12px, uppercase, 0.05em tracking): the brand name above product titles.
- **Chip** (Nunito 600, 12px): presentation, stock and MOQ chips, order-status badges.
- **Product name** (Nunito 600, 14px, leading-snug, up to 3 lines; the full name is in `title`): never shrinks for long names, since the end of the name carries the shade or type.

### Named Rules
**The 12px Floor Rule.** No text is smaller than 12px (`text-xs`), and anything a reseller uses to calculate (prices, per-piece price, card price, stock counts, minimums) is at least 12px, set in tabular figures where it sits in a column (cart totals, line prices). The only thing that may be smaller is a count inside a bubble, and even that is 12px today.

**The Party Is for Headings Rule.** Ready to Party is used only for section and drawer headings, rank numbers and step numerals. Never for body copy, buttons, form labels or prices.

**The Eyebrow + Headline Pair Rule.** Homepage sections open with a centered eyebrow over a Ready to Party headline. Utility result views (search, brand, stock) use a left-aligned headline with a quiet "Cerrar" text button on the right instead.

## Layout

- **Container:** `max-w-7xl` (1280px), centered, with 16px / 24px / 32px side padding at mobile / sm / lg.
- **Section rhythm:** 56px above each homepage section (48px for the first product rows), with 24–32px between a section header and its content.
- **Product grids:** 2 columns on phones, 3 at `sm` (640px), 4 at `lg` (1024px); Best Seller and the loading skeleton go to 6 at `lg`. Gap 16px, 24px on `sm`+ for featured rows.
- **Horizontal rows:** time-deal and skin-type result rows scroll sideways with snap points instead of wrapping.
- **Header:** sticky; one row on desktop (logo, search capped at ~448px, icon buttons and the rose cart pill) plus a second row for horizontal category nav with fade-edge scroll arrows. On mobile the search drops to a full-width second row and the nav moves into a full-screen ☰ drawer. `scroll-padding-top` (72px / 120px) keeps anchor jumps from hiding under it.
- **Drawers:** cart and mobile menu slide in full-screen on phones; the cart is 420px wide from `sm` up. Both sit over a 40% plum overlay with backdrop blur.
- **Hero height:** 340px on phones (portrait art). From `sm` up, the banner is always full width and its height is 38.333vw, the wide art's own ratio (2400:920). The image covers it edge to edge with nothing cropped at any width, and there are no empty bands on any side. Desktop slides must be 2400×920 (or the same 2.61:1 ratio); a different ratio gets trimmed.
- **Short landscape screens** (`sm` width but under 520px tall, i.e. a phone on its side) use the phone navigation: ☰ plus a 384px drawer, no second category row. The sticky header stays one 64px row instead of taking a third of the screen.
- **Input method, not screen size:** a `coarse:` variant (`@media (pointer: coarse)`) enlarges controls for fingers and keeps them compact for a mouse. On touch screens every text field is 16px (below that, iOS zooms the page when a field is focused, which also used to happen on landscape phones).

### Named Rules
**The Thumb Rule.** Every control is at least 44×44px to a finger. Small-looking controls (the card "Agregar", the favorite heart, text links like "quitar" or "¿Olvidaste tu contraseña?", "MXN $") keep their look and get an invisible 44px tap area from the `tap` utility. Controls that are too small to use get genuinely bigger on touch: cart −/+ are 36px circles (28px with a mouse), "×" close buttons are 44px circles, banner dots sit in 36×44px buttons, footer links become 44px rows, and dropdown and category rows are 44px tall. A `tap` area must never be clipped by an `overflow: hidden` parent or overlap a neighbor's; the ticker band is 44px tall on touch for that reason.

## Elevation & Depth

Flat at rest, lifted on interaction. Depth comes mainly from tonal layering: translucent white cards on cream, separated by hairline plum borders. Shadows are limited to hover feedback and elements that float over the page.

### Shadow Vocabulary
- **Hover lift** (`shadow-lg`, with the border tinting to rose at 30%): product cards on hover, together with a 105% image zoom (300ms).
- **Floating** (`shadow-lg`): dropdown menus and the WhatsApp floating button.
- **Overlay** (`shadow-2xl`): cart and menu drawers.
- **Badge** (`shadow`): the rank number over Best Seller images.

### Named Rules
**The Flat-at-Rest Rule.** Cards and tiles don't have a shadow until they're hovered. If something has a shadow at rest, it must be floating above the page (drawer, dropdown, floating button).

## Shapes

The shapes are soft and pebble-like. Anything you tap is a full pill: buttons, the search field, chips, badges, icon buttons, the cart pill. Anything you read sits in a rounded container: product cards and info tiles use 16px corners; wide feature bands (promo, Cosmético Americano panel) use 24px; FAQ items and dropdowns use 12px; form inputs use 8px; the variant select uses 6px. Product photos sit in square wells that inherit the card's clipping. Circles are reserved for icon badges (40px, rose at 10% behind a stroke icon), rank numbers and hero dots.

## Components

### Buttons
Soft, round and approachable, with no hard edges and no heavy weight.
- **Shape:** full pill (9999px).
- **Primary:** Deep Peony with cream text, Nunito 600. Full size is 12px × 24px padding for page CTAs. On product cards, "Agregar" and "Avísame" are full card width, 14px text, 8px × 12px padding (44px tap area).
- **Hover:** the fill darkens to Peony Ink, with a short `transition`. It never lightens, which would drop contrast. Disabled buttons drop to 30% opacity with a not-allowed cursor (for example, "Agregar" before a shade is picked, or "+" at the stock limit).
- **Focus:** a 2px Dusk Lilac outline with a 2px offset (cream on lilac bands).
- **Outline (rose):** 1px Deep Peony border and Peony Ink text, with a 10% rose fill on hover. Used for "🔔 Avísame" on sold-out items.
- **Collection button (Cosmético Americano):** plum ink with cream text, full card width, the same shape and size as the rose "Agregar". Plum marks the separate collection and its own cart; it's the one sanctioned exception to The One Rose Rule.
- **Ghost:** 1px ink/20 border and ink text; on hover the border turns Deep Peony and the text Peony Ink. Used for secondary hero CTAs and brand tiles.
- **Icon buttons:** 44px circles, ink at 70%, with ink at 5% fill on hover (wishlist, account, search submit).
- **Text buttons:** 12px, ink muted, underlined ("Cerrar", "Repetir el quiz", "← Pregunta anterior").

### Chips
- **Style:** 12px Nunito 600 pills, 2px × 8px padding, on tinted fills.
- **Variants:** Pieza individual (blush 50%, ink muted), Caja con N piezas (lilac 20%, lilac text), Entrega inmediata (green), Agotado stock (red), MOQ (ink 10%, ink muted). The standalone "Agotado" badge on images is solid plum with uppercase cream text.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** white at 60% over cream; image well blush at 20%.
- **Shadow Strategy:** flat at rest; hover lift (see Elevation).
- **Border:** 1px hairline, turning rose at 30% on hover.
- **Internal Padding:** 12px on product cards, 20px on info tiles.
- **Product card anatomy (top to bottom):** square photo (rank badge top-left, sold-out badge, wishlist heart) → chips → uppercase brand label → name → optional capacity and variant select → price block pinned to the bottom (18px Josefin price, then 12px meta lines: per-piece price for boxes, "🏦 Por transferencia", "Con tarjeta: $X") → a full-width Agregar/Avísame pill underneath. The meta lines sit in a fixed 3-line area (52px, including their small gaps), so prices in a row share one baseline whether or not a card has a "c/u" line. The price column is never squeezed beside the button: cards are about 150–180px wide, and that squeeze was what forced the notes down to 10px.

### Inputs / Fields
- **Style:** 1px field border, white at 70% fill, 8px radius, 8px × 12px padding; 16px text on mobile (prevents iOS zoom) and 14px from `sm`. The search field is the pill variant with a round icon button inset on the right.
- **Labels:** 12px Nunito 600 in ink muted, above the field; required fields marked with " *".
- **Focus:** the default outline is removed and replaced by a 2px Dusk Lilac ring (3.4:1 on cream).
- **Placeholder:** Ink Placeholder (plum at 72%).

### Navigation
- **Desktop:** a horizontal row of 14px Nunito 600 links in ink at 80% (hover to full ink), scrolled with chevron buttons that fade to cream at the edges. Dropdowns (Marcas, Categorías, País) open 208px cream panels with 12px corners, a hairline border, `shadow-lg`, and blush hover rows.
- **Mobile:** a full-screen cream drawer from the left, with uppercase 14px items in 16px × 20px rows separated by hairlines; submenus expand in place on a blush 10% ground.

### Section Header (signature)
A centered pair: an uppercase eyebrow in ink muted and a Ready to Party headline in plum ink, with 4px between them and 24–32px below. This pair gives the homepage its rhythm.

### Feature Band (signature)
A full-width rounded (24px) block in Dusk Lilac Band with cream text: a Ready to Party headline, a full-cream subtitle and a Deep Peony pill CTA. The dark variant (plum ink ground, blush eyebrow) is used for the time-limited deal with its countdown.

### Motion
Motion confirms actions and explains state changes; it never decorates. Arrivals ease out with `cubic-bezier(0.16, 1, 0.3, 1)`, and exits are shorter than entrances.
- **Cart acknowledgment (the signature moment):** whenever a line is added or its quantity changes, that cart line washes blush (75%) and fades out over 1.1s, and the header count pops (scale 1.35, 320ms). A reseller sees which line moved without re-reading the list.
- **Drawers:** slide in over 380ms, out over 220ms (accelerating). **Backdrops** fade in over 280ms, out over 180ms. **Pop-up cards** rise 12px (at 98% scale) into place over 320ms.
- **Banner:** 700ms crossfade between slides; the next slide fades in only after its image has loaded. It auto-advances every 6s and pauses on hover, on keyboard focus, off-screen, in a hidden tab, or with its pause button (bottom-right, 44px).
- **Ticker:** a continuous 22s loop that pauses on hover, on focus, off-screen, or with its pause button. The duplicated copy is hidden from screen readers.

**The Reduced Motion Rule.** When the visitor's system asks for less motion, nothing slides or moves on its own: the banner starts paused, the ticker stands still as one swipeable line, drawers fade in place, product images don't zoom, and scroll jumps are instant. Color feedback (the cart-line wash) stays, because it carries meaning.

### Info Tile + Icon Badge
A 16px translucent card with a 40px rose-tint circle holding a 20px rose stroke icon (2px stroke, round caps), then a Nunito 600 title and a 14px ink muted line. Every "Por qué Alpacca" and benefit item uses this same treatment, so icons read as one set. Don't mix in emoji here.

## Do's and Don'ts

### Do:
- **Do** use Deep Peony for every primary action and nothing decorative (The One Rose Rule), and give any rose or lilac that touches text its deep shade (The Text Gets the Deep Shade Rule).
- **Do** keep text at `ink-muted` (plum 75%) or darker (The Ink Floor Rule).
- **Do** keep the page on cream paper, with cards and fields as translucent white (60% / 70%) and 1px hairline borders.
- **Do** make every tappable control a pill, and every reading container a 16px rounded card.
- **Do** open homepage sections with the eyebrow + Ready to Party headline pair.
- **Do** set prices in Josefin Sans, and show the per-unit price under any "Caja con N piezas" price.
- **Do** use emoji as functional signposts in commerce copy (✅ En stock, ✈️ / 🚚 shipping legs, 🏦 transferencia, 💳 tarjeta).
- **Do** use the 2px-stroke line icons inside rose-tint circles for benefit and feature lists.
- **Do** use the mascot for empty and waiting states (empty cart, "Preparando tu catálogo…").
- **Do** keep touch targets at 44px or larger and inputs at 16px text on mobile.

### Don't:
- **Don't** use Ready to Party for body text, buttons, labels or prices.
- **Don't** use pure white (#fff) as a page background or pure black for text; use cream paper and plum ink.
- **Don't** add shadows to cards at rest (The Flat-at-Rest Rule).
- **Don't** introduce a second action color; lilac is a band and tag color, not a button color.
- **Don't** mix emoji into the line-icon tiles; they should read as one set.
- **Don't** add review stars, testimonial blocks or payment-logo strips that the catalog data doesn't support.
