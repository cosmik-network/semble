# Prompt: rebuild canvas mode

Paste the section below into a fresh session to start the rebuild.

---

Build canvas mode for the Semble webapp from scratch: a tldraw board where people lay out Semble cards and collections, connect them, and explore related links. Read `docs/canvas-tldraw-lessons.md` and `docs/tldraw-best-practices.md` first. The first records what the prototype learned; don't repeat its mistakes or re-propose anything in its decisions log. The second is the SDK's intended patterns; follow them. If the old prototype is still in `src/webapp/features/canvas`, use it as reference only, not as a base.

## Product rules (non-negotiable)

- **The board is a scratchpad.** Placing a link never saves it. Saving is deliberate: the webapp's save modal, writing a first note, or putting the card into a collection.
- **Style matches the webapp; interaction can differ.** Colours, buttons, typography, spacing, cards and menus look like the webapp. Reuse webapp components wherever they exist: URL card with its save, connect and note actions, the save and connect modals, the inline note, tabs, panels, empty states. Canvas-only interactions keep the webapp's look.
- **Cards look identical at every zoom.** No semantic zoom.
- **One way to do each thing.** Follow the webapp card's actions; don't add parallel buttons.
- **The server is the source of truth.** Cards, collection membership and connections follow it. Local edits are optimistic and must never be overwritten by a refresh while they're in flight.

## Decide and confirm with me before coding

Propose these, with trade-offs, and wait for my answer:

1. **Identity.** Random shape ids plus a URL → shapes index. A link can appear many times, and all copies are one card (shared title, note and saved state; per-copy size, position, pile, hidden connections). One arrow per pair of copies.
2. **Sync design.** What is derived from the server (arrows, card info, membership), the refresh cadence, how in-flight edits are protected, and whether to ask the backend for a batch endpoint. One request per link doesn't scale.
3. **Persistence and multiple canvases.** Canvases live in browser storage for now (one `persistenceKey` per canvas, plus a stored list of canvases); there's no canvas backend yet. They'll sync to our Postgres database later, so keep storage behind one module, keep document and session state separate, and give every canvas a stable id that can become its database id. The canvas list and its thumbnails come from the same storage module.
4. **Delete semantics.** Deleting a card inside a collection removes it from the collection on the server. If that isn't possible, the link is hidden on the board.
5. **Architecture.** Modules, their interfaces, and the test seam: a headless tldraw `Editor` fed server data, checking shapes and arrows. Prefer one high seam.

## Features to cover, in phases

Confirm each phase's scope with me before starting it.

1. **Foundation.** Canvases behind the `canvas` flag. Users can create multiple canvases, each at its own full-screen URL (`/canvas/[id]`), reached from the webapp:
   - **Sidebar:** a "Canvases" section in the Library nav, like My Collections: recent canvases, a + to create one, and "View all".
   - **List page (`/canvas`):** inside the normal webapp layout. A grid of canvas cards, each with a thumbnail of the board (rendered from tldraw and cached in the browser), name, last edited and card count. Each card's menu has rename, duplicate and delete, and a "New canvas" tile sits in the grid.

   Webapp-styled chrome:
   - top bar: back, title, library, new collection, layout;
   - navigation pill: undo/redo, zoom, fit, minimap, show/hide connections;
   - trimmed toolbar and right-click menu.

   Cards are the webapp URL card with its actions. Adding a card works by paste, drop, or quick-add (`/` or double-click).

   Entry points from the webapp (build these at the end of phase 3, once connections and collections exist):
   - **Any collection page** has a canvas view, whatever its access type or owner. It opens a canvas seeded with that collection, or adds the collection to an existing canvas. Collections the user can't edit come in read-only.
   - **A link's Semble page** has "Explore in canvas": a new canvas with that card and its connections laid out around it.

2. **Connections.** Arrows derived from server connections:
   - **Your own:** solid, in the type colour, with a type pill.
   - **Others':** dotted ghosts.
   - **Every type has an arrowhead** except "Same as".
   - **Drawing:** drag from card edge dots, or use the arrow tool. A pending arrow opens a compact type picker in webapp styling.
   - **After saving:** change type, flip direction, delete with confirmation.
   - **Collections as ends:** they connect through their Semble page URL.
   - **Hiding:** board-wide and per card.
3. **Collections.** Containers styled like the webapp collection card:
   - **Placing:** add from the library tray.
   - **Creating:** from a selection, or by drawing a frame and naming it.
   - **Editing:** rename, collapse, re-arrange.
   - **Read-only:** a lock icon, and drops are refused.
   - **Membership on the server:** dragging a card in or out, or deleting it inside, changes membership.
4. **Copies and sync.**
   - **Copies:** Option-drag, Cmd+D, or dropping a link that's already on the board. Each copy shows a copy badge, and hovering one outlines its siblings.
   - **Library sync:** saved state, note, title and membership refresh on open, on tab focus, and every few minutes.
5. **Discovery.**
   - **Library tray:** My cards, Collections, Search.
   - **Card panel:** Details, Similar, Connections, Collections.
   - **Expand:** show incoming or outgoing connections.
   - **Suggest similar:** unsaved suggestion cards, each with Keep or dismiss.
   - **New cards:** they fly in from where they came from.
6. **Navigation and presenting.**
   - **Find:** Cmd+F.
   - **Minimap.**
   - **Trails:** from a card following its connections, or from a selection.
   - **Layouts:** graph, radial, by site, grid.
   - **Hover preview.**
   - **Stacks:** these must move real shape positions when they spread out, not use CSS transforms.

Not in scope unless I ask: export, adding single cards to a canvas from the webapp's card menu.

## How to work

- **Before writing UI, check tldraw's actual behaviour** against the lessons doc: license cutoff, arrowhead sizing, label measurement, frame hit testing, undo side effects.
- **Testing:**
  - Put pure logic in modules that don't import tldraw.
  - Test editor behaviour through the headless `Editor` seam.
  - Run `npx vitest run`.
- **Before calling a step done,** run `npm run webapp:type-check` from the repo root, plus eslint on the touched files.
- **Visual changes** (labels, spacing, overlays) need a look in a browser before you call them done. Say when you haven't looked.
- **Repo conventions:**
  - Don't destructure React props.
  - Build Semble links with `getSembleHref` from `lib/utils/link.ts`.
  - Keep comments sparse.
  - Never commit or push.
- **When I say "match the webapp",** ask whether I mean styling or layout if it's unclear.
- **Report briefly:** what changed, what's unverified, and any trade-off I should decide.
