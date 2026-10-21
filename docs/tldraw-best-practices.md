# tldraw + React best practices

General guidance for building on the tldraw SDK (5.x), from the official docs and the first canvas prototype. Project-specific lessons live in `docs/canvas-tldraw-lessons.md`. API names were checked against tldraw 5.5.2.

## Setup in Next.js

- Load the editor client-only: a `'use client'` wrapper that imports it with `next/dynamic` and `ssr: false`. tldraw needs browser APIs.
- Import `tldraw/tldraw.css` in that client module.
- Set `licenseKey` from the start. Without it, tldraw stops rendering in production builds after about 5s.

## Reactivity (signals)

- Read editor state in React through `useValue(name, fn, deps)` or a `track()`-wrapped component. Calling `.get()` in a plain component doesn't subscribe it.
- List every outside value the getter reads in `deps` (usually `[editor]`, plus ids).
- Derive with `computed` instead of copying into another atom. Computeds are lazy and only recompute when read.
- Name every atom; names show up in `whyAmIRunning()`, the tool for tracing why an effect or computed re-ran.
- Group several atom writes in `transact` so effects run once.
- `useReactor` runs at most once per animation frame, for DOM work. `useQuickReactor` runs immediately, for state that must stay in sync.
- `react()` returns a stop function. Call it on cleanup, or the effect runs forever.
- `unsafe__withoutCapture` reads a signal without depending on it. Keep its use rare and deliberate.

## Writing to the store

- Pass arrays to `createShapes` / `updateShapes` / `deleteShapes`. Wrap multi-step changes in `editor.run()`: listeners hear about it once, and it becomes one undo step.
- `editor.run(fn, options)` takes:
  - `history: 'ignore'` for derived or transient state;
  - `history: 'record-preserveRedoStack'` for selection-like changes;
  - `ignoreShapeLock: true` to write to locked shapes.
- Never mutate records directly; go through editor methods.
- Apply data that mirrors a server inside `editor.store.mergeRemoteChanges(...)`. It's tagged `remote`, stays out of undo, and save listeners filtering on `source: 'user'` don't echo it back.

## History

- Call `markHistoryStoppingPoint()` at the start of each user interaction, so one interaction undoes as one step.
- `bailToMark(id)` cancels an interaction and discards it. `squashToMark(id)` merges intermediate steps into one.
- State outside the store, like your own atoms, is never undone.
- Call `clearHistory()` after loading a document.
- Undo and redo replay store changes, so side-effect handlers run for them, with source `user`.

## Side effects (`editor.sideEffects`)

- **Before handlers** must return a record:
  - return a modified copy to change it;
  - `beforeChange` returning `prev` blocks the change;
  - `beforeDelete` returning `false` prevents the delete.
- **After handlers** run when the outermost operation finishes. Their writes join the same transaction and undo step, and trigger handlers again in a later pass, so guard against handlers that re-trigger themselves.
- **`registerOperationCompleteHandler`** runs once per transaction. Use it for batch work like autosave.
- **Registration order** is run order. Register a writer before any handler that reads its output.
- **Source.** Every handler gets `source` (`'user'` | `'remote'`); check it for anything that writes to a server.
- **Cleanup.** Keep the cleanup functions registration returns, and call them on unmount.
- **Deletes can't be vetoed reliably.** From the prototype: when a shape is deleted, tldraw removes its bindings before custom `beforeDelete` handlers run. Plan "confirm after, restore if cancelled" flows instead.

## Custom shapes

- Declare props by augmenting `TLGlobalShapePropsMap`, and derive the type from `TLShape`.
- Always define `static props` validators. Without them, props accept any JSON and bad data slips through.
- Add a props migration (`createShapePropsMigrationSequence`) for every new or changed prop. Write `down` migrations if sync between clients on different versions may ever happen.
- Only JSON goes in props and `meta`. Set meta defaults with `getInitialMetaForShape`.
- Put expensive hit-test and bounds math in `getGeometry`, which the editor caches. Read geometry through `editor.getShapeGeometry`, never `util.getGeometry()`.
- `getGeometry(shape, opts)` gets `opts.context`, so different callers can get different geometry (e.g. arrows binding without an arrowhead).
- Extend `BaseBoxShapeUtil` for rectangular shapes. Use `ShapeUtil.configure({...})` to change built-in shapes, like `ArrowShapeUtil` display values, without subclassing.
- Buttons and inputs inside a shape need `pointer-events: all` and `onPointerDown={stopEventPropagation}`. Otherwise the canvas treats the click as a select or drag.

## Bindings

- Reuse arrow bindings for connectors. Write a custom `BindingUtil` (registered via `bindingUtils`) for other relationships: a sticker following its parent, pins, layout constraints.
- Direction matters: `onAfterChangeFromShape` and `onAfterChangeToShape` fire for different ends.
- Isolation hooks (`onBeforeIsolate…`) keep things consistent when shapes are separated by delete, copy or duplicate. Deletion hooks are for delete-only behaviour.
- Bindings are only copied when both shapes are copied. `canBind` returning false on either shape silently skips the binding.

## External content

- Paste, drop and `putExternalContent` all route to `registerExternalContentHandler(type, handler)`. One add path keeps behaviour consistent.
- A handler registered in `onMount` replaces the default. To extend it, call the default from your handler.
- `putExternalContent` does nothing in read-only mode unless forced.
- Support new file types with an `AssetUtil`, not by replacing the file handler.

## Events and UI

- `editor.on(name, fn)` / `editor.off(name, fn)` need the same function reference. Register them in a `useEffect` and remove them in its cleanup.
- `before-event` fires before tools handle input; `event` fires after.
- `created-shapes` / `edited-shapes` / `deleted-shapes` don't fire for remote changes, undo or `store.put`. Use `store.listen(fn, { source, scope })` or the `change` event for full coverage.
- Keep `tick` and `frame` handlers light; they run 60+ times a second.
- Customise UI through `components` (any slot set to `null` is hidden) and `overrides`:
  - action and tool `onSelect` must return void;
  - when you remove an action, remove the menu items that use it too.
- `hideUi` hides visuals only; shortcuts and clipboard still work.
- `onUiEvent` reports UI-triggered actions (clicks and shortcuts) for analytics, not programmatic calls.
- Position overlays outside shapes (in `InFrontOfTheCanvas`) with `editor.pageToViewport`.

## Persistence and sync

- Use one `persistenceKey` per document. Tabs with the same key share the document and keep their own session (camera, selection).
- Snapshots split into `document` (shapes, bindings, assets) and `session` (camera, selection, UI). Save the document to a server; keep the session local.
- Save from `editor.store.listen(fn, { source: 'user', scope: 'document' })`, throttled (around 500ms). Without the source filter, sync loops.
- Load asynchronously with `TLStoreWithStatus` (loading / error / ready).
- For real multiplayer, use `@tldraw/sync` rather than a hand-rolled layer.

## Performance

- Keep culling on (`canCull`). Opt out only for shapes that measure their DOM, draw past their bounds, or animate off-screen.
- In shape rendering, use `getEfficientZoomLevel()`, not `getZoomLevel()`. It stays stable during camera moves (tuned by `debouncedZoomThreshold`).
- Memoise heavy render work with `useMemo`. For board-wide indexes, use one `computed` per editor, not a scan in every shape component.
- Use CSS animations for visual effects, and keep the number of shapes animating at once small. `animateShape` writes to the store.
- Request smaller images when zoomed out (`TLAssetStore.resolve` with `context.steppedScreenScale`).
- A page holds 4000 shapes by default (`maxShapesPerPage`).
- Profile production builds. Use `editor.performance` events and `editor.getCulledShapes()` to measure.

## Testing

- Use Vitest. tldraw's own `TestEditor` is internal to its repo and not exported. Build a raw `Editor` with `createTLStore`, your `shapeUtils` / `bindingUtils`, and the default tools.
- Make a fresh editor in `beforeEach` and `dispose()` it in `afterEach`. Use `vi.useFakeTimers()` for timers and animations.
- Test through the editor, as the user would see it: shapes, bindings and store state after an action. Don't test internals.
- In this repo, importing tldraw under Vitest currently fails on a react / react-dom version mismatch. See the lessons doc.

## Sources

- [Editor](https://tldraw.dev/docs/editor)
- [Shapes](https://tldraw.dev/docs/shapes)
- [Signals](https://tldraw.dev/sdk-features/signals)
- [Side effects](https://tldraw.dev/sdk-features/side-effects)
- [History](https://tldraw.dev/sdk-features/history)
- [Bindings](https://tldraw.dev/sdk-features/bindings)
- [External content](https://tldraw.dev/sdk-features/external-content)
- [Events](https://tldraw.dev/sdk-features/events)
- [UI components](https://tldraw.dev/sdk-features/ui-components)
- [Persistence](https://tldraw.dev/sdk-features/persistence)
- [Performance](https://tldraw.dev/sdk-features/performance)
- [Clickable custom shape example](https://tldraw.dev/examples/interactive-shape)
