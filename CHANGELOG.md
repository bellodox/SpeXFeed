# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- [`docs/maintainer-wiki/design-system.md`](docs/maintainer-wiki/design-system.md) — Complete SpaceXpanse brand design system specification
- ROD helper backend service (`server/`) — Node.js/Express service mediating browser requests to ROD RPC at `127.0.0.1:11999`
  - `GET /api/rod/status` — ROD node connection status
  - `GET /api/rod/name/:namespace/:handle` — ROD name lookup
  - `GET /api/rod/name/:namespace/:handle/availability` — Name availability check
  - `POST /api/rod/spexfeed-name/requests` — Submit registration/update requests
  - `GET /api/rod/spexfeed-name/requests/:id` — Poll request status
  - `GET /api/rod/names/recent?limit=25` — Recent `sf/*` profile discovery endpoint backed by `name_scan`, `sf.profile` parsing, recent-first sorting, and 30-second in-memory caching
- Angular dev server proxy configuration (`server/proxy.conf.json`)
- Profile-by-name navigation via `/n/:handle` route (`src/app/pages/name-resolver/name-resolver.ts`)
- SpeXFeed name search — global search bar now routes `sf/<handle>` input to name resolver
- Backward-compatible localStorage/IndexedDB namespace migration (`src/app/services/storage-migration.ts`) from `blockcore:notes:*` to `spexfeed:*`
- Recent ROD profile discovery client pieces: [`src/app/services/recent-rod-names.ts`](src/app/services/recent-rod-names.ts) and lazy-loaded [`src/app/pages/discover-profiles/discover-profiles.ts`](src/app/pages/discover-profiles/discover-profiles.ts) with loading, empty, and error states

### Changed

- **Visual Identity**: Complete SpaceXpanse brand transformation — new color system (cyan/teal primary, amber secondary, violet tertiary), Rajdhani + IBM Plex Sans typography, dark-first aesthetic
- **Design Tokens**: Introduced ~20 semantic `--sf-*` CSS custom properties for consistent theming across light and dark modes
- **Material Palettes**: Replaced magenta/pink (`#ae1c7d`) Material 3 palettes with space-tech cyan/teal palette system in [`styles-theme.scss`](src/styles-theme.scss)
- **Component Styles**: Eliminated hardcoded colors from 12+ component CSS files, replacing them with semantic design tokens
- **PWA Metadata**: Updated manifest theme/background colors to `#0B1118`, fixed `short_name` from `Notes` to `SpeXFeed`
- **Typography**: Switched from Roboto to Rajdhani (headings) + IBM Plex Sans (body) via Google Fonts
- **Full rebrand from Blockcore Notes to SpeXFeed** across all user-facing surfaces:
  - Package name (`package.json`), Angular project name (`angular.json`), browser title, Open Graph metadata (`src/index.html`)
  - PWA manifest (`src/manifest.webmanifest`), Tauri desktop config, GitHub Actions workflow
  - All connect/login/create/key onboarding pages, about page, consent dialogs, example page
  - Runtime application title and browser tab suffix (`src/app/services/applicationstate.ts`)
  - Media session metadata (media-player, podcast, music components)
  - Share URLs, upload headers, event/profile copy URLs → `spexfeed.spacexpanse.org`
  - i18n translation files (en, no, ru, de)
  - README badges, screenshots, extension recommendations
  - IndexedDB database name prefix changed from `blockcore-` to `spexfeed-` (`src/app/app.ts`)
  - IndexedDB name prefix changed from `blockcore-notes-` to `spexfeed-` (`src/app/services/storage.ts`)
  - Android asset links, Tauri identifiers → `org.spacexpanse.spexfeed`
  - Curated follow suggestions updated to SpaceXpanse community
  - Commented theme variables and legacy code references updated
- **Brand Assets**: Replaced all icon/logo assets with SpaceXpanse official logo (14 icon sizes + WebP variants generated from source)
- **Legacy Text**: Eliminated all user-visible "Notes" references — login, key import, badge editor, article editor, about page now say "SpeXFeed"
- **Connect Page**: Overhauled landing page with SpaceXpanse dark-gradient hero, opaque feature cards, improved text contrast, and fixed broken screenshot reference
- **Readability**: Added global `body` text color enforcement, Rajdhani heading font to toolbar, and stronger `on-surface` contrast for event/card content
- **Home Discovery CTA**: Retargeted the SpaceXpanse "View Profiles" action from following-based navigation to the new `/discover/profiles` experience while leaving the Nostr and Bitcoin discovery entries unchanged

### Fixed

- ROD helper backend route definitions updated to handle slash-containing names (`sf/handle`) via explicit namespace/handle path segments
- **Authenticated UX**: Registered the missing `/update-name` route so the Settings "Update SpeXFeed Name" action no longer opens a blank page.
- **Settings Form**: Fixed Angular `NG01203` errors by registering `MatSlideToggleModule` and adding unique names to Settings slide-toggle controls.
- **Authenticated Shell Readability**: Converted the authenticated app shell, sidenav, cards, form fields, and major page panels to a dark-first SpaceXpanse surface treatment with stronger text contrast.
- **Account Drawer Testing**: Added accessible account-menu labeling and `data-testid="account-menu-button"` for reliable visual verification.
- **HTTP Client Wiring**: Registered [`provideHttpClient()`](src/app/app.config.ts:93) in [`src/app/app.config.ts`](src/app/app.config.ts) so the recent-profile discovery client can resolve Angular `HttpClient` correctly.

### Removed

- Stale generated files: `ng-serve-smoke.log`, `ng-serve-smoke-final.log`, `dependencies.txt`, `server/helper-service.log`
- Deleted legacy Blockcore image assets: `blockcore-light-small.png`, `blockcore-notes-screenshot.png`, `blockcore-notes-social.png`
