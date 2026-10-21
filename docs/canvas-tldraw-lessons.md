# Canvas mode: tldraw lessons

Lessons from the first canvas prototype (tldraw 5.5.2, `src/webapp/features/canvas`), to use when the canvas is rebuilt. General tldraw + React guidance is in `docs/tldraw-best-practices.md`.

## Decide these before writing code

These were retrofitted in the prototype. Each retrofit touched most of the sync code.

1. **Card identity.** The prototype keyed shapes by URL, which made dedupe easy. It then had to support copies, so arrows got re-keyed per pair and every lookup moved to a URL index. Instead, start with random shape ids, a `URL → shapes` index, and one arrow per pair of copies. Copies share info (title, note, saved state); size, position and piles stay per copy.
2. **Saving model.** The board is a scratchpad: dropping a link must not save it. Saved means the card has the user's library `cardId`. Saving happens through the webapp's save modal, a first note, or putting the card into a collection.
3. **Server sync.** The server is the source of truth, and local edits are optimistic.
   - **Arrows are derived state.** They have deterministic ids, are written outside undo history, and are redrawn from fetched connections. This worked well.
   - **Card info and collection membership** also need to follow the server. Edits still in flight must not be overwritten by a refresh: hold a key busy from the edit (including any settle delay) until the request ends, and ignore data fetched before then.
   - **Request load.** One request per link and per collection doesn't scale. Ask for a batch endpoint (library status and connections for N URLs) up front.
4. **Delete semantics under sync.** If collection membership syncs, deleting a card from a collection on the board must remove it on the server. Otherwise the refresh brings it back. When the server write isn't possible (read-only collection, someone else's card), record the link as hidden on the board.
5. **Collections as connection ends.** Connect them through the Semble page URL (`/profile/<handle>/collections/<rkey>`), the same as the webapp. Match on handle and rkey only, ignoring the host. A new collection has no rkey until it is looked up.

## Product rules the user set

- **Same view at every zoom.** No semantic zoom: cards render the webapp's URL card at all zoom levels.
- **Style matches the webapp; interaction can differ.** Every piece of canvas UI should look like the webapp: colours, buttons, typography, spacing, cards, menus. Canvas-specific interactions (dragging to connect, quick-add, trails) can work their own way, but they're styled with the webapp's look.
- **Reuse webapp components** where they exist: URL card, its actions, modals (save, connect), inline note, tabs, panels, empty states. "Make it look like the webapp" usually means styling, not layout, so check which one before redesigning.
- **One way to do each thing.** Don't add several entry points for one action, like the three Save buttons the prototype briefly had. Do what the webapp card does.
- **Copies and arrows.** Copies are allowed and show every connection. Instead of smart routing rules, there's a board-wide and a per-card way to hide connections.

## Decisions log

These ideas were tried or proposed and then rejected. Don't bring them back without a new reason.

| Rejected                                              | Why                                                         | Instead                                         |
| ----------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Semantic zoom (simpler cards when zoomed out)         | Cards must look identical at every zoom                     | Same URL card at all zooms                      |
| Mirror cards with a "primary" copy                    | Users shouldn't need to know which copy is real             | All copies equal, one shared card               |
| Smart arrow routing (hide arrows on some copies)      | Hidden rules make arrows jump around and feel unpredictable | Every copy shows every arrow, plus hide toggles |
| Canvas quick-add for the card's Connect button        | Should behave like the webapp                               | The webapp's connect modal                      |
| Several Save buttons (corner badge, action bar, menu) | Too many ways to do one thing                               | The webapp card's Save button                   |
| The webapp connect-form layout in the drag picker     | The ask was to match styling, not layout                    | Compact picker with webapp button styles        |
| "Connections are public" footer in the picker         | Noise                                                       | Removed                                         |

## Semble API gotchas

- **Library status can't drive collection membership.** `getUrlStatusForMyLibrary` only lists collections where the _user's own_ card was added; a collaborator's card for the same link doesn't show. Read membership from the collection page instead (`getCollectionPageById`).
- **A `UrlCard`'s `id` and `note` belong to its author.** For cards in someone else's collection, they're not the user's library card or note; treat the card as unsaved.
- **`collection.update` clears an omitted description.** Always send the current description when renaming.
- **`collection.getByAtUri` is flaky locally.** It returns 404 after the first call. Use `getCollectionPageById` when you have the id.
- **Reuse the webapp's query keys** (`cardKeys.byUrl`, `cardKeys.urlStatus`, `collectionKeys.collection`, `connectionKeys.forwardForUrl`). The webapp's save, connect and collection mutations already invalidate them, so the board refreshes after a modal saves.

## tldraw behaviour that cost time

- **License.** Without `licenseKey`, tldraw stops rendering after about 5s in production builds, Vercel previews included. Get a key before anything ships beyond localhost.
- **Deletes can't be vetoed.** tldraw removes bindings before your `beforeDelete` handlers run. Confirm afterwards and restore if the user cancels.
- **Side effects:**
  - Handlers fire for remote changes too, so check `source` where it matters.
  - For derived writes, use `store.mergeRemoteChanges` with `run(fn, { history: 'ignore' })`.
  - Undo and redo recreate shapes with source `user`, so creation handlers fire on undo.
  - Deletes arrive child by child. To tell "the container went too" from a single delete, wait a microtask.
- **Arrows:**
  - Arrowhead length is at most 3× the stroke width, so a thin stroke makes heads nearly invisible. Set stroke and label size with `ArrowShapeUtil.configure({ getCustomDisplayValues })`, not CSS.
  - The gap between arrow and shape (10px plus stroke) only applies at ends with an arrowhead. For tail gaps, return padded geometry from `getGeometry` when `opts.context === '@tldraw/arrow-without-arrowhead'`.
  - Labels are measured from the label size at normal weight. Bold text or CSS padding makes them wrap or clip. The label's parent is 2px wide: a pill needs `width: max-content; min-width: max-content; flex-shrink: 0`. The text element inherits `padding`, so reset it.
  - The arrow tool only binds to frame-like shapes at their edge or label, not their interior.
- **Hit testing.** `getShapeAtPoint` ignores frame interiors unless you pass `hitFrameInside: true`.
- **Visibility.** Use the `getShapeVisibility` prop for collapse and hiding. It's evaluated in a computed, so reading atoms inside it is reactive.
- **Performance:**
  - For board-wide indexes (piles, URL → shapes), use one `computed` per editor, kept in a WeakMap, so each card doesn't scan the page.
  - Give `useValue` effect dependencies stable string keys.
- **Migrations.** Every new shape prop needs a props migration, or saved boards break.
- **CSS transforms don't move hit areas.** The fanned-out pile was a CSS transform, so clicks still landed on the pile's real position. Anything people click must move as real shape positions.
- **`animateShape` adds undo entries.** The fly-in animation left extra steps in undo history. Set the start position outside history and expect the animation frames to need squashing.
- **Content-driven heights break grid layouts.** Cards report their rendered height back to the shape, so a card that grows (actions row, open note) overlaps the one below in a collection grid. Re-run layout when a card's height changes, or reserve space.
- **Ids derived from content collide.** Suggestion cards used the link-derived id, which clashed once copies existed. Give temporary shapes their own ids.
- **UI overrides:**
  - Action `onSelect` must return void.
  - The shortcut syntax is `'cmd+f,ctrl+f'`.
  - Binding Cmd+F replaces the browser's find while the canvas has focus.
  - Remove built-in UI by setting component slots to `null`.
- **Theming.** Override `--tl-color-*`, `--tl-radius-*` and `--tl-shadow-*` on `.tl-container` and `.tl-theme__light/dark`, wrapped in a parent `:global(...)` selector to win specificity.

## Mantine inside tldraw

- **Interactive elements inside shapes** need `pointer-events: all` and `onPointerDown={stopEventPropagation}`.
- **Popovers, tooltips and comboboxes inside the canvas:** use `withinPortal={false}` so they stay above it. Modals get a high `zIndex`.
- **Shadows.** `Paper shadow` sets `--paper-shadow`, which nested Cards inherit, so a card inside a shadowed Paper also gets a shadow. Reset it with `--paper-shadow: none`.
- **Full-width images.** `AspectRatio` has `max-width: 100%`, so negative margins can't bleed an image edge to edge. Put the image outside the padded area instead.
- **Inline notes.** `NoteCardInline` with no `cardAuthor` renders an empty header row. Pass the author.
- **Hooks with effects.** Don't mount hooks like `useAuth` (which runs analytics effects) or mutations in every card. Mount them in child components that only exist when needed.

## Testing

- Importing tldraw under vitest fails in this repo: react and react-dom versions differ, and tldraw checks. Keep pure logic (layout, placement, URL matching) in modules that don't import tldraw, or fix the versions first.
- The best seam is a headless `Editor` with the real shape utils: feed in server data, check shapes and arrows. A mocked `react-dom` gets past the version check.
- Many bugs only show when rendered: label wrapping and padding, collapsed widths, inherited shadows. Plan a quick visual check for chrome and labels.
