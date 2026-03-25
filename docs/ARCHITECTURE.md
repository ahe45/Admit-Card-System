# Architecture Notes

## Refactor direction

- Keep entry files thin and use them as composition or wiring layers.
- Move reusable behavior into feature folders under `client/features/*` and domain services under `server/modules/*`.
- Keep shared constants in `shared/*` so client and server stay aligned.

## Current structure

### Client

- `client/app/*`: runtime state, API access, DOM lookup, navigation, bootstrap loading.
- `client/features/*`: feature-specific controllers and rendering helpers.
- Thin composition files such as `client/features/admit-cards/workflow.js`, `client/features/grids/filtering.js`, and `client/features/template-editor/lifecycle.js` now assemble smaller modules from sibling folders.
- `client/events.js`: top-level event registration and startup wiring.

### Server

- `server/http/*`: request body parsing, response helpers, routing, and page handling.
- `server/modules/auth/*`: password helpers, session/auth flows, account administration.
- `server/modules/system/*`: settings, login notice, data cleanup, account bootstrap, summary payloads.
- `server/modules/templates/*`: template bootstrap, rendering, generated objects, tag replacement.
- `server/modules/bootstrap/*`: schema bootstrap per table/domain.
- `server.js`: composition root that wires HTTP helpers and domain services together.

### Styles

- `styles.css`: shared components and common form/layout rules.
- `styles/features/*.css`: feature-level styling for grids, examinees, system pages, templates, and modals.
- `styles/responsive.css`: responsive overrides.

## Current hotspots

- `server.js` is thinner now, but it is still the main composition root and can be reduced further by extracting more route dependency wiring if needed.
- `index.html` still carries a long script and modal list because the app is multi-view and script-order dependent.
- There is still no automated regression coverage for the interaction-heavy client flows, especially template editing and grid behavior.
