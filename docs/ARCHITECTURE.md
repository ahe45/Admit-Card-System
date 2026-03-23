# Architecture Notes

## Observed issues

- `app.js` was a single 4,900+ line browser entry that mixed state, DOM references, API calls, rendering, template editing, and event wiring.
- Client and server duplicated the account role list and template tag definitions.
- The application had no lightweight architectural guide, so future changes would likely keep accumulating in the same files.

## Applied changes

- Split the browser code into feature-oriented files under `client/`.
- Added `shared/app-config.js` so client and server use the same role and template tag definitions.
- Removed the legacy single-file browser entry from the runtime path.

## Current client structure

- `client/core.js`: state, DOM references, API helpers, bootstrap data loading, upload helpers, preview helpers.
- `client/template-editor.js`: template CRUD, template preview/editor logic, image manipulation, table editing.
- `client/renderers.js`: view rendering, grid rendering, pagination/filter/sort helpers, account actions, global `switchView`.
- `client/events.js`: DOM event registration and startup.

## Remaining hotspots

- `server.js` is still a large mixed file and should be split next into transport, import/template, and account/print services.
- `styles.css` is still large enough to benefit from page or feature-level CSS extraction.
- There is still no automated regression test coverage for the client interaction-heavy template editor.
