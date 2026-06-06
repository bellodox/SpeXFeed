# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- ROD helper backend service (`server/`) — Node.js/Express service mediating browser requests to ROD RPC at `127.0.0.1:11999`
  - `GET /api/rod/status` — ROD node connection status
  - `GET /api/rod/name/:namespace/:handle` — ROD name lookup
  - `GET /api/rod/name/:namespace/:handle/availability` — Name availability check
  - `POST /api/rod/spexfeed-name/requests` — Submit registration/update requests
  - `GET /api/rod/spexfeed-name/requests/:id` — Poll request status
- Angular dev server proxy configuration (`server/proxy.conf.json`)
- Profile-by-name navigation via `/n/:handle` route (`src/app/pages/name-resolver/name-resolver.ts`)
- SpeXFeed name search — global search bar now routes `sf/<handle>` input to name resolver
- Backward-compatible localStorage/IndexedDB namespace migration (`src/app/services/storage-migration.ts`) from `blockcore:notes:*` to `spexfeed:*`

### Changed

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

### Fixed

- ROD helper backend route definitions updated to handle slash-containing names (`sf/handle`) via explicit namespace/handle path segments

### Removed

- Stale generated files: `ng-serve-smoke.log`, `ng-serve-smoke-final.log`, `dependencies.txt`, `server/helper-service.log`
