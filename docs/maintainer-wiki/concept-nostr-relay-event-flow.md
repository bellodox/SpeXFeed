# Nostr Relay and Event Flow

## Authentication and user context

Authentication starts from a Nostr public key supplied either by extension-based login or anonymous/read-only mode. The authenticated public key becomes the basis for local storage naming and for self-scoped subscriptions.

## Relay initialization

`RelayService.initialize()` loads relay metadata from IndexedDB. If no saved relays exist, it asks the Nostr integration layer for relay information and persists those relays before starting workers.

## Worker-based connectivity

Each readable relay is represented by a `RelayType` worker wrapper that launches logic from the relay worker implementation. The worker connects to a relay, reports status back to the main thread, accepts queued jobs and subscriptions, and can be started temporarily for write-only publish operations.

## Initial subscriptions

After relay connectivity is marked active, `DataService.initialDataLoad()` subscribes to:

- self metadata and contacts
- notifications targeting the logged-in public key

Additional UI-driven subscriptions are created by `RelayService` for feed views, profile views, threads, and pagination/load-more behavior.

## Event processing pipeline

1. Relay worker receives a Nostr event.
2. Worker posts event payload back to the main thread.
3. `RelayService.processEvent()` normalizes and routes the event.
4. `EventService` parsing and domain services determine how the event is persisted and reflected in UI state.
5. Relevant services update IndexedDB, in-memory UI lists, notifications, profile state, badges, or articles.

## Persistence touchpoints

- Contacts events update following and relay state.
- Metadata events update stored profiles.
- Notifications are persisted separately for recent activity views.
- Articles and badge definitions are routed into specialized services.

## Publishing model

`DataService` creates unsigned events, delegates signing to the Nostr provider, validates the result, and publishes through `RelayService`. Write-only relays are temporarily connected for publish operations.

## Operational caveats

- Timeout handling exists in both main-thread download helpers and worker download flows.
- Some in-memory state paths are intentionally disabled or partially legacy.
- Relay capability metadata from NIP-11 affects whether articles or badge-like events are published to a relay.
