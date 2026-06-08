# SpaceXpanse SpeXFeed Design System

## 1. Brand Identity Summary

SpeXFeed should feel like a calm command deck for the SpaceXpanse Multiverse: dark space surfaces, crisp geometric structure, cyan-teal action energy, warm ROD-inspired amber highlights, and restrained violet cosmic depth. The design must prioritize readability and trust for social, identity, relay, and wallet-adjacent workflows while using subtle glow, layered surfaces, and precise typography to express space exploration, decentralization, and futuristic technology without busy sci-fi decoration.

## 2. Color Palette — Exact Values

Use these Angular Material 3 tonal palettes as the source values for `src/styles-theme.scss`. Tones increase from black at `0` to white at `100`.

### Primary — orbital cyan teal

Primary action and brand interaction color.

```scss
primary: (
  0: #000000,
  10: #002022,
  20: #00373B,
  25: #004449,
  30: #005158,
  35: #005F67,
  40: #006D76,
  50: #008996,
  60: #00A7B8,
  70: #22C6D8,
  80: #5ADFEB,
  90: #A6F2F8,
  95: #D2FAFC,
  98: #ECFEFF,
  99: #F6FFFF,
  100: #FFFFFF,
),
```

### Secondary — ROD amber gold

Warm highlight, secondary actions, positive emphasis, and platform economy accents.

```scss
secondary: (
  0: #000000,
  10: #251A00,
  20: #3F2E00,
  25: #4D3900,
  30: #5C4400,
  35: #6B5000,
  40: #7B5C00,
  50: #9B7500,
  60: #BC8F00,
  70: #DFAA12,
  80: #FBC84E,
  90: #FFE39B,
  95: #FFF0C7,
  98: #FFF8EC,
  99: #FFFCF6,
  100: #FFFFFF,
),
```

### Tertiary — cosmic violet

Cosmic accent for tertiary UI states, badges, decorative gradients, and non-primary emphasis.

```scss
tertiary: (
  0: #000000,
  10: #1B1038,
  20: #30215F,
  25: #3B2A70,
  30: #463481,
  35: #523E94,
  40: #5E49A7,
  50: #7662C4,
  60: #907BE0,
  70: #AA96F9,
  80: #C8BFFF,
  90: #E6DEFF,
  95: #F3EEFF,
  98: #FCF8FF,
  99: #FFFBFF,
  100: #FFFFFF,
),
```

### Neutral — blue-black space gray

Backgrounds, surfaces, and primary text containers.

```scss
neutral: (
  0: #000000,
  10: #0B1118,
  20: #20262E,
  25: #2B3139,
  30: #363C44,
  35: #424850,
  40: #4E545C,
  50: #676D76,
  60: #818790,
  70: #9CA1AA,
  80: #B7BCC5,
  90: #D3D8E1,
  95: #E9EDF5,
  98: #F6F9FF,
  99: #FBFCFF,
  100: #FFFFFF,
),
```

### Neutral-variant — cool muted boundary gray

Borders, dividers, outlines, muted chips, and field containers.

```scss
neutral-variant: (
  0: #000000,
  10: #111923,
  20: #26313C,
  25: #313C48,
  30: #3D4854,
  35: #485460,
  40: #54606D,
  50: #6D7987,
  60: #8793A1,
  70: #A1ADBC,
  80: #BDC9D8,
  90: #D9E5F4,
  95: #EAF2FC,
  98: #F7FAFF,
  99: #FCFCFF,
  100: #FFFFFF,
),
```

### Error — tuned red

Error, destructive states, and validation failure.

```scss
error: (
  0: #000000,
  10: #410002,
  20: #690005,
  25: #7E0007,
  30: #93000A,
  35: #A80710,
  40: #BA1A1A,
  50: #DE3730,
  60: #FF5449,
  70: #FF897D,
  80: #FFB4AB,
  90: #FFDAD6,
  95: #FFEDEA,
  98: #FFF8F7,
  99: #FFFBFF,
  100: #FFFFFF,
),
```

### App shell and status colors

- PWA `theme_color`: `#006D76`
- PWA `background_color`: `#0B1118`
- `meta[name=theme-color]`: `#0B1118`
- Light success tokens:
  - `--mat-success-color`: `#228E52`
  - `--mat-success-lighter`: `#BDE8CE`
  - `--mat-success-darker`: `#0F5F33`
- Dark success tokens:
  - `--mat-success-color`: `#57D989`
  - `--mat-success-lighter`: `#BDE8CE`
  - `--mat-success-darker`: `#1FA463`

Accessibility baseline:

- Dark default canvas `#0B1118` with body text `#E9EDF5` exceeds WCAG 2.1 AA for body text.
- Primary action cyan `#5ADFEB` on dark canvas `#0B1118` exceeds WCAG 2.1 AA for body text.
- Light default canvas `#F6F9FF` with text `#20262E` exceeds WCAG 2.1 AA for body text.

## 3. Typography

### Display and heading font

- Font: `Rajdhani`
- Google Fonts URL: `https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap`
- Weights: `500`, `600`, `700`
- Use for app title, page titles, section headings, hero-style labels, and high-emphasis navigation labels.

### Body font

- Font: `IBM Plex Sans`
- Google Fonts URL: `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`
- Weights: `400`, `500`, `600`, `700`
- Use for all body copy, controls, forms, feed content, dialogs, settings, and dense UI surfaces.

### Material typography configuration

Use this typography value in `mat.theme()`:

```scss
typography: 'IBM Plex Sans',
```

Then explicitly assign `Rajdhani` to headings and brand display selectors in global styles.

### Font size scale

- Base body: `16px`
- Small body: `14px`
- Caption and metadata: `12px`
- `h1`: `40px`
- `h2`: `32px`
- `h3`: `26px`
- `h4`: `22px`
- `h5`: `18px`
- `h6`: `16px`

### Line heights

- Body text: `1.55`
- Compact UI labels and buttons: `1.25`
- Caption and metadata: `1.35`
- Headings: `1.12`
- Feed content with multiline notes: `1.6`

## 4. Semantic Design Tokens

Define these CSS custom properties in `src/styles.scss` under `html` for light mode and under `.dark` for dark mode.

### Light mode

```scss
--sf-surface-elevated: #FFFFFF;
--sf-surface-overlay: #F6F9FF;
--sf-text-muted: #54606D;
--sf-border-subtle: #D9E5F4;
--sf-border-emphasis: #008996;
--sf-hover-surface: #EAF2FC;
--sf-scrollbar-thumb: #8793A1;
--sf-scrollbar-thumb-hover: #6D7987;
--sf-glow-primary: 0 0 0 1px #5ADFEB, 0 0 18px #00A7B8;
--sf-glow-secondary: 0 0 0 1px #FBC84E, 0 0 16px #DFAA12;
```

### Dark mode

```scss
--sf-surface-elevated: #111923;
--sf-surface-overlay: #20262E;
--sf-text-muted: #A1ADBC;
--sf-border-subtle: #3D4854;
--sf-border-emphasis: #5ADFEB;
--sf-hover-surface: #26313C;
--sf-scrollbar-thumb: #54606D;
--sf-scrollbar-thumb-hover: #8793A1;
--sf-glow-primary: 0 0 0 1px #00A7B8, 0 0 22px #006D76;
--sf-glow-secondary: 0 0 0 1px #FBC84E, 0 0 18px #7B5C00;
```

## 5. Component-Specific Tokens

Define component tokens beside the semantic tokens in `src/styles.scss`.

### Light mode

```scss
--sf-active-nav-background: #D2FAFC;
--sf-profile-banner-border: #008996;
--sf-profile-avatar-border: #FBC84E;
--sf-chat-bubble-sent: #D2FAFC;
--sf-chat-bubble-received: #FFFFFF;
--sf-media-player-background: #20262E;
--sf-title-bar-background: #0B1118;
--sf-loading-spinner-color: #006D76;
```

### Dark mode

```scss
--sf-active-nav-background: #00373B;
--sf-profile-banner-border: #22C6D8;
--sf-profile-avatar-border: #FBC84E;
--sf-chat-bubble-sent: #00373B;
--sf-chat-bubble-received: #20262E;
--sf-media-player-background: #0B1118;
--sf-title-bar-background: #05080D;
--sf-loading-spinner-color: #5ADFEB;
```

## 6. Motion & Effects

- Default transition: `180ms cubic-bezier(0.2, 0, 0, 1)` for color, background-color, border-color, box-shadow, opacity, and transform.
- Emphasized transition: `240ms cubic-bezier(0.2, 0, 0, 1)` for drawer, card elevation, and modal entry effects.
- Hover lift for cards and primary interactive surfaces: `translateY(-1px)` plus `--sf-glow-primary` only on focused or selected states, not every hover.
- Focus ring: `0 0 0 2px #0B1118, 0 0 0 4px #5ADFEB` on dark surfaces; `0 0 0 2px #FFFFFF, 0 0 0 4px #006D76` on light surfaces.
- Primary button hover glow, dark mode: `0 0 0 1px #00A7B8, 0 0 22px #006D76`.
- Secondary emphasis hover glow, dark mode: `0 0 0 1px #FBC84E, 0 0 18px #7B5C00`.
- Background effects should be subtle and optional: a very faint radial cyan nebula at the top edge and sparse star-like points with opacity below `0.08`. Do not add animated starfields, parallax, or dense sci-fi textures to feed surfaces.

## 7. Implementation Notes

### Update `src/styles-theme.scss`

- Replace the existing magenta-generated palette map in `src/styles-theme.scss` with the six palette maps from this document.
- Keep the existing Angular Material 3 structure: `$_palettes`, `$_rest`, `$primary-palette`, and `$tertiary-palette`.
- Ensure `$_rest` continues to expose `secondary`, `neutral`, `neutral-variant`, and `error` from `$_palettes`.
- Update the file comment from the old generated seed to note this is the SpaceXpanse SpeXFeed design-system palette.

### Add semantic tokens in `src/styles.scss`

- Add the light-mode semantic and component tokens under the existing `html` block before `@include mat.theme()`.
- Add the dark-mode semantic and component tokens under the existing `.dark` block before its `@include mat.theme()`.
- Replace direct scrollbar colors with `--sf-scrollbar-thumb` and `--sf-scrollbar-thumb-hover`.
- Replace `:root` progress spinner override with `--sf-loading-spinner-color`.
- Replace hardcoded surface, border, hover, muted text, and status colors with the semantic or component tokens above.

### Font loading changes in `src/index.html`

- Replace the current Roboto Google Fonts link with these two links:
  - `https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap`
  - `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`
- Keep the Material Icons font link.
- Add `meta[name=theme-color]` with `#0B1118`.
- Keep initial loading text readable on dark canvas; use `#E9EDF5` rather than `white`.
- Keep `og:image` pointed at a real shipped asset until a dedicated SpaceXpanse social card is generated.

### Post-review polish rules

- Default the root Material theme to dark in `src/styles.scss` so the generated Material tokens match the dark-first app shell and `color-scheme: dark` behavior.
- Interactive avatars must use semantic buttons rather than clickable images. The authenticated account-menu trigger in `src/app/app.html` should remain a keyboard-focusable `<button>` with an inner decorative image.
- Avoid dead asset references in shipped CSS. Remove unused third-party placeholder imagery and do not leave non-existent local backgrounds such as `/assets/bg.jpg` in active gradients.
- Keep hover transitions merged into a single declaration when animating multiple properties in the same selector.

### Search and Discover UX rules

- The authenticated toolbar search currently searches profiles, not posts. Keep the user-facing search label explicit as `Search profiles` in [`src/assets/i18n/en.json`](../../src/assets/i18n/en.json:14) unless search scope expands.
- Search result overlays and action menus must use opaque elevated surfaces rather than translucent panels so text remains readable over feed content. Current global Material menu/autocomplete panel treatment lives in [`src/styles.scss`](../../src/styles.scss:356).
- The Discover page card order is intentionally `Activity Feed` → `Following Lists` → `Status` in [`src/app/pages/home/home.html`](../../src/app/pages/home/home.html:40).
- The curated Discover list order is intentionally `SpaceXpanse`, then `Nostr`, then `Bitcoin` in [`src/app/pages/home/home.ts`](../../src/app/pages/home/home.ts:59).

### Files with hardcoded colors that need token replacement

Prioritize active colors and leave historical commented examples for a cleanup-only follow-up if desired.

- `src/styles-theme.scss` — existing magenta Material 3 palette values.
- `src/styles.scss` — Roboto typography, success colors, spinner override, scrollbar colors, thread borders, hover surfaces, profile buttons, error color, and title bar background.
- `src/index.html` — Roboto font link and inline loading text color.
- `src/manifest.webmanifest` — PWA `theme_color` and `background_color`.
- `src/app/app.css` — active nav background, profile banner border, avatar border, muted metadata color, overlay background, and white text.
- `src/app/pages/register-name/register-name.css` — card borders, identity copy, status panels, confirmation panel, pending panel, and verified panel.
- `src/app/pages/update-name/update-name.css` — card borders, identity copy, rotation warning, preview panel, status panels, and error text.
- `src/app/pages/name-resolver/name-resolver.ts` — inline loading, warning icon, and error text colors.
- `src/app/pages/settings/settings.css` — relay status and primary relay colors.
- `src/app/pages/relays/relays.css` — relay status and primary relay colors.
- `src/app/pages/home/home.css` — scrollbar hover and relay status colors.
- `src/app/pages/connect/login/login.css` — error color.
- `src/app/pages/connect/key/key.css` — error color.
- `src/app/pages/connect/create/create.css` — error color.
- `src/app/pages/connect/connect.css` — store banner gradient, store button colors, legacy commented brand colors, and connect-page background cleanup.
- `src/app/pages/editor/editor.css` — toolbar hover color.
- `src/app/pages/editor-badges/editor.css` — toolbar hover color.
- `src/app/shared/event-buttons/event-buttons.css` — toolbar hover color.
- `src/app/shared/create-note-dialog/create-note-dialog.scss` — toolbar hover and maximize button colors.
- `src/app/shared/zap-dialog/zap-dialog.component.scss` — zap button, emoji hover, and white icon states.
- `src/app/shared/zappers-list-dialog/zappers-list-dialog.component.scss` — zap button, emoji hover, border, and chip background colors.
- `src/app/shared/chat-detail/chat-detail.component.scss` — chat background surface, scrollbar colors, toolbar hover, and card surface colors.
- `src/app/shared/message-bubble/message-bubble.component.scss` — message bubble card surface.
- `src/app/shared/media-player/media-player.css` — media player background and muted artist text.
- `src/app/shared/profile-header/profile-header.css` — profile header chip backgrounds.
- `src/app/shared/spexfeed-name-badge/spexfeed-name-badge.css` — verified, warning, and muted badge colors.
- `src/app/shared/relay/relay.css` — relay status, primary relay, and relay item background.
- `src/app/shared/status/status.component.scss` — online, offline, and busy status colors.
- `src/app/shared/content-music/content-music.css` — muted artist text.
- `src/app/shared/content-podcast/content-podcast.css` — muted artist text.
- `src/app/pages/connect/key/qr-scan-dialog/qr-scan.css` — QR instruction and camera error colors.
- `src/app/shared/create-circle-dialog/create-circle-dialog.scss` — white hover and border colors.
- `src/app/shared/create-circle-dialog/create-circle-dialog.ts` — default circle color.
- `src/app/services/circle.ts` — default circle category colors; keep categories distinguishable while aligning pink, teal, amber, violet, slate, and success values to this palette.
