import {
  createBindingId,
  createShapeId,
  getArrowBindings,
  type Editor,
  type TLArrowBinding,
  type TLArrowShape,
  type TLBindingCreate,
  type TLRecord,
  type TLShapeId,
  type TLShapePartial,
} from 'tldraw';
import { LINK_CARD_TYPE } from '../model/linkCards';
import {
  isArrowKey,
  reconcileArrows,
  type BoardArrowSpec,
  type FetchedConnections,
} from '../model/arrows';
import {
  arrowSettings,
  connectionOf,
  DEFAULT_ARROW_SETTINGS,
  isConnectionArrow,
  selectedCardsHideArrows,
  type ConnectionArrowMeta,
} from '../shapes/connectionArrow/connectionArrows';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';
import type { SavedArrowSettings } from '../storage/canvasStorage';

export interface ArrowsDeps {
  editor: Editor;
  viewerDid: string;
  copies(): Map<string, TLShapeId[]>;
  // Each link's connections, for links fetched at least once
  fetchedConnections(): Map<string, FetchedConnections>;
}

const SHAPE_PREFIX = 'shape:';
const withoutShapePrefix = (id: string) =>
  id.startsWith(SHAPE_PREFIX) ? id.slice(SHAPE_PREFIX.length) : id;

const arrowStyle = (own: boolean): Partial<TLArrowShape['props']> => ({
  kind: 'arc',
  bend: 0,
  color: 'green',
  dash: own ? 'solid' : 'dotted',
  size: 'm',
  arrowheadStart: 'none',
  arrowheadEnd: 'arrow',
  text: '',
});

const metaOf = (spec: BoardArrowSpec): ConnectionArrowMeta => ({
  connectionId: spec.connectionId,
  connectionType: spec.type,
  own: spec.own,
  from: createShapeId(spec.fromCopy),
  to: createShapeId(spec.toCopy),
});

const sameMeta = (arrow: TLArrowShape, meta: ConnectionArrowMeta) =>
  JSON.stringify(connectionOf(arrow)) === JSON.stringify(meta);

function bindingFor(
  arrowId: TLShapeId,
  terminal: 'start' | 'end',
  toId: TLShapeId,
): TLBindingCreate<TLArrowBinding> {
  return {
    id: createBindingId(`${withoutShapePrefix(arrowId)}:${terminal}`),
    type: 'arrow',
    fromId: arrowId,
    toId,
    props: {
      terminal,
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: false,
    },
  };
}

// Arrows follow from the server, never from an edit, so they're written as
// remote changes, outside undo
export function attachArrows(deps: ArrowsDeps) {
  const { editor } = deps;

  // Links fetched together arrive one by one; they're reconciled once
  let reconcileTimer: ReturnType<typeof setTimeout> | null = null;
  function reconcileSoon() {
    reconcileTimer ??= setTimeout(() => {
      reconcileTimer = null;
      reconcile();
    });
  }

  function reconcile() {
    // Its writer's saves bring a read-only tab its arrows
    if (editor.getIsReadonly()) return;
    const copies = new Map(
      Array.from(deps.copies(), ([url, ids]) => [
        url,
        ids.map(withoutShapePrefix),
      ]),
    );
    const specs = reconcileArrows({
      copies,
      links: deps.fetchedConnections(),
      viewerDid: deps.viewerDid,
    });
    const wanted = new Map(
      specs.map((spec) => [createShapeId(spec.key), spec]),
    );

    const removed = editor
      .getCurrentPageShapes()
      .filter((shape) => isConnectionArrow(shape) && !wanted.has(shape.id))
      .map((shape) => shape.id);
    const created: TLShapePartial<TLArrowShape>[] = [];
    const updated: TLShapePartial<TLArrowShape>[] = [];
    const staleBindings: TLArrowBinding['id'][] = [];
    const bindings: TLBindingCreate<TLArrowBinding>[] = [];

    for (const [id, spec] of Array.from(wanted)) {
      const meta = metaOf(spec);
      const from = createShapeId(spec.fromCopy);
      const to = createShapeId(spec.toCopy);
      const arrow = editor.getShape<TLArrowShape>(id);
      if (!arrow) {
        const start = editor.getShapePageBounds(from)!.center;
        const end = editor.getShapePageBounds(to)!.center;
        created.push({
          id,
          type: 'arrow',
          x: start.x,
          y: start.y,
          meta: { ...meta },
          props: {
            ...arrowStyle(spec.own),
            start: { x: 0, y: 0 },
            end: { x: end.x - start.x, y: end.y - start.y },
          },
        });
      } else if (!sameMeta(arrow, meta)) {
        updated.push({
          id,
          type: 'arrow',
          meta: { ...meta },
          props: arrowStyle(spec.own),
        });
      }
      const bound: Partial<Record<'start' | 'end', TLArrowBinding>> = arrow
        ? getArrowBindings(editor, arrow)
        : {};
      for (const [terminal, toId] of [
        ['start', from],
        ['end', to],
      ] as const) {
        const binding = bound[terminal];
        if (binding?.toId === toId) continue;
        if (binding) staleBindings.push(binding.id);
        bindings.push(bindingFor(id, terminal, toId));
      }
    }

    const nothingToDo =
      removed.length + created.length + updated.length + bindings.length === 0;
    if (nothingToDo) return;
    editor.store.mergeRemoteChanges(() => {
      editor.deleteShapes(removed);
      editor.deleteBindings(staleBindings);
      editor.createShapes(created);
      editor.updateShapes(updated);
      editor.createBindings(bindings);
    });
  }

  // The user can't re-point or restyle connection arrows
  const keepArrows = editor.sideEffects.registerBeforeChangeHandler(
    'shape',
    (before, after, source) =>
      source === 'user' && isConnectionArrow(before)
        ? { ...after, props: before.props, meta: before.meta }
        : after,
  );
  const keepBindings = editor.sideEffects.registerBeforeChangeHandler(
    'binding',
    (before, after, source) =>
      source === 'user' && isConnectionArrowId(before.fromId) ? before : after,
  );

  // Moving a card changes no arrow, so only adds and deletes count
  const unlisten = editor.store.listen(
    ({ changes }) => {
      const isCard = (record: TLRecord) =>
        record.typeName === 'shape' && record.type === LINK_CARD_TYPE;
      const isArrowRecord = (record: TLRecord) =>
        (record.typeName === 'shape' && isConnectionArrow(record)) ||
        (record.typeName === 'binding' &&
          record.type === 'arrow' &&
          isConnectionArrowId(record.fromId));
      const addedOrRemoved = [
        ...Object.values(changes.added),
        ...Object.values(changes.removed),
      ];
      const touched =
        addedOrRemoved.some(
          (record) => isCard(record) || isArrowRecord(record),
        ) ||
        Object.values(changes.updated).some(([before]) =>
          isArrowRecord(before),
        );
      if (touched) reconcile();
    },
    { scope: 'document', source: 'user' },
  );

  function isConnectionArrowId(id: TLShapeId) {
    const shape = editor.getShape(id);
    // A removed arrow's id still says what it was
    return shape
      ? isConnectionArrow(shape)
      : isArrowKey(withoutShapePrefix(id));
  }

  const settings = arrowSettings(editor);

  // None of it enters undo. A card's hidden arrows are saved with the board;
  // the rest is session state.
  const view = {
    isFocusOn: () => settings.focus.get(),
    areHidden: () => settings.hidden.get(),
    toggleFocus: () => settings.focus.update((on) => !on),
    toggleHidden: () => settings.hidden.update((hidden) => !hidden),
    // Hides arrows on the selected cards, or shows them if all hide them
    toggleSelectedArrows() {
      const hideArrows = !selectedCardsHideArrows(editor);
      const cards = editor
        .getSelectedShapes()
        .filter(
          (shape): shape is LinkCardShape => shape.type === LINK_CARD_TYPE,
        );
      editor.run(
        () =>
          editor.updateShapes(
            cards.map((card) => ({
              id: card.id,
              type: card.type,
              props: { hideArrows },
            })),
          ),
        { history: 'ignore' },
      );
    },
  };

  return {
    reconcile,
    reconcileSoon,
    view,
    saveSettings: (): SavedArrowSettings => ({
      focus: settings.focus.get(),
      hidden: settings.hidden.get(),
    }),
    restoreSettings(saved: SavedArrowSettings | undefined) {
      const { focus, hidden } = saved ?? DEFAULT_ARROW_SETTINGS;
      settings.focus.set(focus);
      settings.hidden.set(hidden);
    },
    detach() {
      if (reconcileTimer) clearTimeout(reconcileTimer);
      unlisten();
      keepArrows();
      keepBindings();
    },
  };
}
