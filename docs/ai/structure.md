# VATSIM Radar Architecture Map

This document is an orientation map for AI agents working in this repository. It is intentionally biased toward "where should I look next?" rather than exhaustive API documentation.

## Project Shape

VATSIM Radar is a Nuxt 4 application with:

- A Vue/OpenLayers client in `app/`.
- Nitro server routes and plugins in `server/`.
- Shared client/server utilities in `app/utils/`, with server-only utilities under `app/utils/server/`.
- Prisma/MariaDB persistence in `prisma/`.
- A VitePress documentation site in `docs/`.
- Build-time Nuxt modules in `modules/`.

Important root files:

- `nuxt.config.ts` configures `srcDir: 'app/'`, modules, runtime config, PWA, Nitro route rules, and dev port `8080`.
- `package.json` defines the main workflows: `yarn dev`, `yarn build`, `yarn lint`, `yarn typecheck`, `yarn docs:*`.
- `prisma/schema.prisma` defines persisted user/auth/settings/list/message/notam models.
- `docker-compose*.yml` files describe local/prebuilt deployment environments.

## Runtime Topology

The app has three main runtime layers:

1. Client UI and map rendering:
   - Vue pages/components under `app/pages` and `app/components`.
   - Pinia stores in `app/store`.
   - OpenLayers map setup in `app/components/views/ViewMap.vue`.
   - Map feature rendering and update logic in `app/composables/render`.

2. Nitro API and SSR context:
   - API route files under `server/api`.
   - Nitro plugins under `server/plugins`.
   - Server helpers under `app/utils/server`.

3. Background data ingestion/cache:
   - In-memory `radarStorage` in `app/utils/server/storage.ts`.
   - Redis synchronization in `app/utils/server/redis.ts` and `server/plugins/vatsim.ts`.
   - Cron/data jobs in `app/utils/server/tasks.ts` and `server/plugins/cron.ts`.
   - VATSIM-specific data enrichment in `app/utils/server/vatsim/*`.

## Data Flow

High-level data path:

1. Background jobs fetch external data from VATSIM, VATSpy, SimAware, VATGlasses, Navigraph, Patreon, FAA/AeroNav, etc.
2. Server jobs normalize data into `radarStorage` and/or Redis.
3. Nitro API routes expose compact or detailed datasets under `/api/data/**`.
4. Client initialization in `app/composables/init.ts` checks versions, downloads changed datasets, and caches large static datasets in IndexedDB via `app/composables/render/idb.ts`.
5. `useDataStore()` in `app/composables/render/storage.ts` holds reactive live/static data used by rendering, overlays, filters, and feature components.
6. `ViewMap.vue` creates the OpenLayers map and mounts map layers/components.
7. `app/composables/render/update/*` combines live aircraft/ATC data with static datasets into airport/sector/aircraft render state.

Fast live updates:

- Client websocket management lives in `app/composables/render/ws.ts`.
- Server websocket implementation lives in `app/utils/server/vatsim/ws.ts`.
- Websocket updates currently focus on own-flight/self-coordinate fast updates and tab coordination.

## Client Entry Points

- `app/app.vue` is the Nuxt app root. It provides OpenLayers `map` and `layer-group` refs to descendants and handles iframe postMessage auth/logout integration.
- `app/layouts/default.vue` is the main shell. It mounts header/footer, init/update popups, data policy UI, theme selection, supervisor checks, and route content.
- `app/pages/index.vue` renders the main map page through async `ViewMap`.
- `app/error.vue` renders Nuxt error states.

The main page is mostly client-only because the map and OpenLayers state are browser-bound.

## State Model

There are two different state layers:

- Pinia stores:
  - `app/store/index.ts` (`useStore`) owns user/session state, UI flags, settings/presets/bookmarks, init status, events/bookings, device flags, and high-level VATSIM data fetch actions.
  - `app/store/map.ts` (`useMapStore`) owns map view state, overlays, selected aircraft, distance tool state, rendered IDs, and Navigraph update progress.

- Module-level reactive data store:
  - `app/composables/render/storage.ts` exposes `useDataStore()`.
  - This is not Pinia. It is a singleton object of refs/shallowRefs for large live and static datasets.
  - It stores VATSIM live data, VATSpy, SimAware, VATGlasses, SIGMETs, tracks, Navigraph waypoints/procedures, airport/sector render lists, and visible pilots.

When adding general UI/session state, use Pinia. When adding large map/datafeed state used by render loops, check `useDataStore()` first.

## Map And Rendering

Core files:

- `app/components/views/ViewMap.vue` creates the OpenLayers `Map`, wires controls/popups/layers, and orchestrates map-only UI.
- `app/composables/render/index.ts` contains shared render constants/helpers.
- `app/composables/render/storage.ts` owns the client data store and VATSIM data conversion functions.
- `app/composables/render/update/index.ts` is the main recompute entry point for controllers/aircraft/airports/sectors.
- `app/composables/render/update/aircraft.ts` updates aircraft-derived state.
- `app/composables/render/update/atc.ts` updates controller/ATC-derived state.
- `app/composables/render/update/vatglasses.ts` merges VATGlasses sector ownership into render state.
- `app/composables/render/aircraft/*`, `airports/*`, `sectors/*`, `navigraph/*` build OpenLayers styles/features/layers for each domain.
- `app/composables/render/aircraft/smooth.ts` owns optional smooth aircraft movement. It records mandatory-data aircraft samples, estimates render delay from accepted snapshot cadence, and moves existing aircraft OpenLayers geometries on `requestAnimationFrame`.
- `app/composables/render/aircraft/style.ts` owns aircraft icon/text/hitbox style caching, including async SVG/PNG icon loading and aircraft-specific rotation/label styling.
- `app/utils/map/*` contains map entities, distance helpers, and aircraft scaling.

Map component groups:

- `app/components/map/layers/*`: layer-level map UI and rendered layer components.
  - `app/components/map/layers/MapLayer.vue`: base raster/vector tile layer selection, Protomaps styling, attribution layer setup, and tile source cleanup.
- `app/components/map/overlays/*`: draggable/minified overlays for pilots, airports, ATC, etc.
- `app/components/map/popups/*`: OpenLayers popup content.
- `app/components/map/settings/*`: map filters and quick settings panels.
- `app/components/map/navigraph/*`: Navigraph visual layers and procedures.
- `app/components/map/airports/*`: airport counters/runway/traffic subviews.

## Feature Components

Feature-level UI lives under `app/components/features`:

- `header/`: app header, search, theme switcher, settings entry points, mobile menu.
- `footer/`: landing/footer content.
- `settings/`: account and profile settings.
- `events/`: VATSIM event cards/details.
- `navigation/`: AIRAC/favorites/featured airport widgets.
- `vatsim/airport/`: airport detail panels such as METAR, TAF, controllers, aircraft, NOTAMs, procedures.
- `vatsim/controllers/`: controller display helpers.
- `vatsim/pilots/`: pilot detail helpers.

Reusable UI primitives are in `app/components/ui`:

- `buttons/`, `inputs/`, `text/`, `data/`, plus layout wrappers such as `UiContainer` and `UiPageContainer`.

For new UI, prefer these primitives and existing feature/component patterns before adding new base components.

## Client Composables

Important composable groups:

- `app/composables/init.ts`: startup/version checks and IndexedDB population for static datasets.
- `app/composables/fetchers/*`: user preset/settings/filter/bookmark fetch/save helpers.
- `app/composables/settings/*`: local settings, filters, colors, visibility rules.
- `app/composables/map/*`: map presets, world helpers, click outside behavior.
- `app/composables/vatsim/*`: domain helpers for pilots, controllers, airport data, bookings, events.
- `app/composables/navigraph/*`: Navigraph data/layout helpers.
- `app/composables/render/*`: map rendering and live data handling.
- `app/composables/errors.ts`: client error handling.
- `app/composables/iframe.ts`: iframe/dashboard integration.

Nuxt auto-imports composables from `app/composables/**` because `nuxt.config.ts` sets `imports.dirs`.

## Server API

Route files mirror URL paths under `server/api`.

Main groups:

- `server/api/data/**`: public data endpoints.
  - `vatsim/data/*`: full, compact, short, mandatory, pilot-specific, airport-specific, event, booking, and stats data.
  - `navigraph/*`: navdata/procedure/airport/item endpoints.
  - `vatspy.ts`, `simaware.ts`, `vatglasses.ts`, `airlines.ts`, `tracks.ts`, `sigmets.ts`, `notams.ts`, `versions.ts`, `status.ts`.
  - `debug/*` and `custom/*` support data debugging and custom source comparison.
- `server/api/auth/**`: VATSIM and Navigraph OAuth/token flows.
- `server/api/user/**`: authenticated user profile, logout/delete, supervisor, private mode, iframe tokens, messages.
- `server/api/user/settings/**`, `filters/**`, `lists/**`, `bookmarks/**`: persisted user customization.

API routes are usually thin. Business logic and validation should live in `app/utils/server/**`, especially `app/utils/server/handlers/**` for user preset-like resources.

Common server helpers:

- `app/utils/server/h3.ts`: error handling, data-ready validation, per-user request freezing.
- `app/utils/server/user.ts`: user lookup, token refresh, list privacy filtering.
- `app/utils/server/prisma.ts`: Prisma client configured with MariaDB adapter.
- `app/utils/server/storage.ts`: server data storage types and read helpers.
- `app/utils/server/redis.ts`: Redis helpers.

## Server Plugins And Background Work

Nitro plugins:

- `server/plugins/index.ts`: per-request storage-ready context and a one-time bookmark coordinate migration.
- `server/plugins/user.ts`: per-request user lookup, iframe referrer checks, and optional Discord-role page access gating.
- `server/plugins/vatsim.ts`: subscribes to Redis `data` channel and updates `radarStorage.vatsim`.
- `server/plugins/cron.ts`: starts Redis data fetch setup and scheduled Navigraph init.
- `server/plugins/discord.ts`: Discord bot/client setup, slash command registration, and `radarVersion` request context.
- `server/plugins/influx.ts`: InfluxDB client initialization. InfluxDB 3 client setup, SQL query usage, and buffered writes live in `app/utils/server/influx/influx.ts`.

Background tasks:

- `app/utils/server/tasks.ts` is the central scheduler for recurring jobs.
- `app/utils/server/vatsim/update.ts` normalizes and enriches live VATSIM data, including pilot status, routes, transceivers, achievements, sectors, bookings, tracks, and websocket counters.
- `app/utils/server/vatsim/atc-duplicating.ts` contains the shared ATC duplicating settings used by client ATC render updates to duplicate controllers based on callsign shape and ATIS area text.
- `app/utils/server/vatsim/*` contains source-specific VATSIM/VATSpy/SimAware/Kafka/websocket helpers.
- `app/utils/server/worker/kafka.ts` owns the Kafka consumer startup, topic subscription, stale-message cutoff, and periodic consumer health logs for message age, processing time, dropped stale messages, and offset lag.
- `app/utils/server/navigraph/*` handles Navigraph DB setup and navdata parsing.
- `app/utils/server/vatglasses.ts` handles VATGlasses data.
- `app/utils/server/influx/*` handles analytics queries/converters. `queries.ts` builds InfluxDB 3 SQL over the `data` table; `converters.ts` still emits line protocol for the main and flight-plan databases.

## Persistence

Prisma schema:

- `User` is the root account model.
- `UserToken` and `UserIframeToken` store access/refresh tokens.
- `Auth` stores OAuth state/verifier rows.
- `NavigraphUser` and `VatsimUser` attach external account identities/tokens to `User`.
- `UserPreset` stores map settings, filters, bookmarks, and dashboard bookmarks as JSON.
- `UserTrackingList` stores friends/achtung/custom user lists.
- `UserPresetList` links presets and tracking lists.
- `UserAcknowledgedMessages` tracks dismissed/acknowledged user messages.
- `Notams` stores internal NOTAM/announcement records.

Prisma client output is generated into `.nuxt/prisma` and imported via the `#prisma` alias configured in `nuxt.config.ts`.

## Types And Shared Utilities

Types:

- `app/types/data/vatsim.ts`: VATSIM live, compact, pilot, controller, event, booking, stats types.
- `app/types/data/vatsim-kafka.ts`: Kafka-related VATSIM types.
- `app/types/data/vatspy.ts`: VATSpy data structures.
- `app/types/data/navigraph.ts`: Navigraph client-facing types.
- `app/types/map.ts`: map settings/local settings types.
- `app/types/index.ts`: generic project types.

Shared utility split:

- `app/utils/shared/*`: safe for client and server. Flight math, VATSIM helpers, runway detection.
- `app/utils/data/*`: domain transforms/helpers used mostly around data/rendering.
- `app/utils/db/*`: database-facing helper types/functions.
- `app/utils/server/*`: server-only code; do not import into browser-only code.
- `app/utils/icons.ts`: aircraft icon mapping and icon metadata used by both build tooling and rendering.
- `app/utils/colors.ts`: theme color definitions.

## Build-Time Modules And Assets

Custom Nuxt modules:

- `modules/index.ts` aliases VueUse `useStorage` as `useStorageLocal`.
- `modules/icons.ts` processes SVG/PNG assets with Sharp/SVGO, generates public aircraft icons, and writes `.nuxt/radar/icons.ts`.
- `modules/styles.ts` generates SCSS color variables and `.nuxt/radar/colors.ts` imports from `app/utils/colors.ts`.

Assets:

- `app/assets/icons/**`: source SVG icons.
- `public/aircraft/**`: generated/public aircraft icons.
- `public/icons/**`: public map icons and compressed/generated variants.
- `app/assets/fonts/**` and `app/scss/**`: fonts and global style variables.
- `app/data/`: local data directory placeholder.

Do not hand-edit generated files under `.nuxt` or public generated icon outputs unless the generation pipeline is also updated.

## Documentation Site

The public docs site is VitePress:

- `docs/.vitepress/config.mts`: nav/sidebar/theme config.
- `docs/index.md`, `docs/introduction/**`, `docs/contributing/**`, `docs/guide/**`, `docs/blog/**`: documentation pages.
- `docs/ai/**`: AI-facing project notes. This file belongs here and should stay focused on repository orientation.

Use `yarn docs:dev`, `yarn docs:build`, and `yarn docs:preview` for documentation workflows.

## Routing Landmarks

Main app routes:

- `/`: map.
- `/airport/[icao]`: airport detail page.
- `/events` and `/events/[id]`: VATSIM events.
- `/bookings`: ATC bookings.
- `/stats` and `/stats/*`: stats dashboards.
- `/pilots`, `/sigmets`, `/notams`, `/achievements`, `/support-us`, `/about`, `/roadmap`, `/privacy-policy`.
- `/data/[type]/[id]/compare`: data debugging comparison UI.
- `/demo/*`: UI primitive/demo pages.

## Common Change Paths

Add or change a map visual layer:

1. Check `app/components/map/layers` for the UI/layer mount point.
2. Check `app/composables/render/*` for OpenLayers feature/style generation.
3. Check `app/composables/render/update/*` if the layer depends on recomputed live data.
4. Check `app/store/index.ts`, `app/store/map.ts`, and `app/types/map.ts` for settings/state.

Add a VATSIM data field:

1. Update source/server normalization in `app/utils/server/vatsim/*` or `app/utils/server/storage.ts`.
2. Update API route return types under `server/api/data/vatsim/**`.
3. Update client data conversion in `app/composables/render/storage.ts`.
4. Update types in `app/types/data/vatsim.ts`.
5. Update render/UI consumers.

Add a persisted user setting or preset field:

1. Add/update types in the relevant server handler under `app/utils/server/handlers/*`.
2. Add validation in the same handler.
3. Update fetcher/composable code in `app/composables/fetchers/*` or `app/composables/settings/*`.
4. Update `app/store/index.ts` if global store state/defaults are needed.
5. Add UI under `app/components/features/settings` or `app/components/map/settings`.

Add an authenticated endpoint:

1. Create a route under `server/api/user/**`.
2. Use `findUserByCookie` or `findAndRefreshUserByCookie` from `app/utils/server/user.ts`.
3. Use `handleH3Error`/`handleH3Exception` from `app/utils/server/h3.ts`.
4. Keep validation/business logic in `app/utils/server/handlers/**` when it is reusable.

Add or change static/external dataset ingestion:

1. Check existing task in `app/utils/server/tasks.ts`.
2. Add source-specific logic under `app/utils/server/<domain>`.
3. Store normalized data in `radarStorage` and/or Redis.
4. Expose it through `server/api/data/**`.
5. Add client initialization/cache logic in `app/composables/init.ts` if it is large or versioned.

Add docs:

1. Add Markdown under `docs/**`.
2. Update `docs/.vitepress/config.mts` sidebar/nav if the page should be discoverable.

## Testing And Verification

Available commands:

- `yarn lint`: stylelint plus ESLint.
- `yarn lint:ts`: ESLint only.
- `yarn stylelint`: SCSS/CSS/Vue style checks.
- `yarn typecheck`: Nuxt/Vue typecheck.
- `yarn build`: production build.
- `yarn dev`: Nuxt dev server on port `8080`.
- `yarn docs:build`: VitePress docs build.

There is no obvious dedicated unit test suite in `package.json`; rely on lint/typecheck/build and targeted manual verification for changed flows.

## Cautions For AI Agents

- Many files are auto-imported by Nuxt. Absence of explicit imports does not mean a symbol is global JavaScript; check Nuxt composables/stores/plugins.
- `useDataStore()` is a singleton reactive object, not a Pinia store.
- `app/utils/server/**` must stay server-only. Avoid importing it into client-only Vue/composable code unless the import is type-only and safe.
- Large static datasets are cached in IndexedDB; changing data shape often requires updating both server response shape and client cache/version handling.
- API routes are intentionally thin. Look for real validation and persistence logic in `app/utils/server/handlers/**`.
- Map rendering is split between Vue layer components and composable-generated OpenLayers features/styles. Search both before making visual changes.
- `radarStorage` is process-local memory synchronized by Redis/jobs. Do not treat it as durable persistence.
- User preset JSON is validated manually in handlers. Update validators when adding fields.
- Generated icon assets are produced by `modules/icons.ts`; update source assets or generation code instead of only changing output files.
