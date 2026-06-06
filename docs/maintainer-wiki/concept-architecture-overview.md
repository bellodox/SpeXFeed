# Architecture Overview

## Project type

SpeXFeed is a client-side Angular application for Nostr-based social publishing and identity workflows. It combines public note feeds, profile management, relay configuration, long-form content, badges, notifications, and import/export-style data operations.

## Top-level structure

- `src/app/` — application code, pages, shared UI, services, workers, and types
- `src/assets/` — static assets, translations, images, and worker-related resources
- `src-tauri/` — desktop packaging configuration for Tauri
- `docs/` — project documentation artifacts; maintainer wiki now lives under `docs/maintainer-wiki/`

## Bootstrap model

The app uses Angular standalone bootstrap rather than NgModule bootstrap. `src/main.ts` starts `AppComponent` with providers defined in `src/app/app.config.ts`.

## Core runtime responsibilities

- `AppComponent` coordinates post-authentication initialization, global UI state, and app-wide services.
- `ApplicationState` tracks connection, initialization, title, visibility, language, and responsive UI signals.
- `AuthenticationService` resolves Nostr public-key identity and stores login state in local storage.
- `StorageService` opens a per-user IndexedDB database and persists state through the storage abstraction in `src/app/types/storage.ts`.
- `RelayService` manages relay metadata, subscriptions, and Web Worker-backed relay connections.
- `DataService` handles relay queries, event signing/publishing, initial subscriptions, and event download helpers.

## UI organization

Routes map to feature pages such as home, feed, files, articles, badges, profile, relays, messages, notifications, settings, and connect/login/create flows.

## Persistence model

The app stores relays, contacts, notes, events, profiles, badges, labels, notifications, circles, and state locally in IndexedDB. The database name is derived from the logged-in public key, which isolates local data per user identity.

## Notable architectural characteristics

- Nostr relay access is fan-out based and uses multiple worker-backed relay connections.
- Event processing routes through central services before UI/state updates.
- Product naming remains mixed between SpeXFeed and Blockcore Notes in code and configuration.
