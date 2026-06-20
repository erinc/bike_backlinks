# Bike Extension Workspace Notes

This workspace contains local Bike 2.x extensions in `src/*.bkext`. The
Bike extension kit is installed from GitHub through `package.json`. Upstream
sample repositories are intentionally not kept in this workspace; use this
document and the current source tree as the local guide.

## Build And Test

- Install dependencies from the workspace root with `npm install`.
- Build all local extensions with `npm run build`.
- Build one extension with `npx bike-ext build <id>`.
- Run extension tests with `npm test` or `npx bike-ext test <id>`.
- During manual Bike testing, use `npx bike-ext watch <id> --install`.

## Extension Structure

- `manifest.json` is the only required file. The folder name is the extension
  id and display name source.
- `app/main.ts` runs in Bike's app context and can access outlines, editors,
  selections, inspectors, commands, and URL resolution.
- `dom/*.ts` or `dom/*.tsx` runs in Bike-hosted WebViews and should render UI.
  DOM scripts communicate with app code through typed protocols in
  `dom/protocols.ts`.
- Inspector extensions should follow the pattern used by `backlinks.bkext`:
  register the inspector item in app context, then render the panel in DOM
  context.

## Current Learnings

- Use `window.inspector.addItem({ label, script })` from app context to place a
  custom item in the right sidebar inspector.
- `DOMScriptHandle<P>` and `DOMExtensionContext<P>` share a protocol whose
  `toDOM` and `toApp` message types live in `dom/protocols.ts`.
- Prefer app context for outline operations that need native objects or methods
  such as `outline.resolveLink()`, `row.url`, `editor.observeSelection()`, and
  `editor.revealRow()`.
- Prefer DOM context for display-only React UI. Use `bike/components` controls
  for native-looking inspector panels.
- Bike links are text attributes named `a`. Iterate an `AttributedString` with
  `attributeAt('a', index, 'downstream', effectiveRange)` so each linked range
  is visited once.
- A row must have a persistent id to be a stable link target. Backlink features
  should treat rows without `persistentId` as not linkable instead of assigning
  ids implicitly from a passive inspector view.
- The original Backlinks implementation was informed by Hog Bay's Calendar
  inspector example and Todos inspector example. Those sample repositories were
  removed after the local patterns were documented.
