import { ContextMenu } from 'radix-ui';
import { useCallback, useEffect } from 'react';
import {
  ArrangeMenuSubmenu,
  ClipboardMenuGroup,
  FitFrameToContentMenuItem,
  RemoveFrameMenuItem,
  ReorderMenuSubmenu,
  SelectAllMenuItem,
  TldrawUiMenuContextProvider,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  ToggleAutoSizeMenuItem,
  ToggleLockMenuItem,
  UngroupMenuItem,
  preventDefault,
  useContainer,
  useActions,
  useEditor,
  useEditorComponents,
  useMenuIsOpen,
  useReadonly,
  useTranslation,
  useValue,
  type TLUiContextMenuProps,
} from 'tldraw';
import { selectedCardsHideArrows } from '../../shapes/connectionArrow/connectionArrows';

// tldraw's DefaultContextMenu with Radix's open state following tldraw's.
// In the default, a press on tldraw's menu click capture closes the menu
// without telling Radix, which then ignores every right-click after.
export default function BoardContextMenu(props: TLUiContextMenuProps) {
  const editor = useEditor();
  const msg = useTranslation();
  const container = useContainer();
  const { Canvas } = useEditorComponents();

  // Escape closes the menu without taking focus off the board
  const keepFocusOnEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      editor.getContainer().focus();
    },
    [editor],
  );
  useEffect(
    () => () =>
      document.body.removeEventListener('keydown', keepFocusOnEscape, {
        capture: true,
      }),
    [keepFocusOnEscape],
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        const onlySelected = editor.getOnlySelectedShape();
        if (onlySelected && editor.isShapeOrAncestorLocked(onlySelected)) {
          editor.setSelectedShapes([]);
        }
        editor.timers.requestAnimationFrame(() =>
          document.body.removeEventListener('keydown', keepFocusOnEscape, {
            capture: true,
          }),
        );
        return;
      }
      document.body.addEventListener('keydown', keepFocusOnEscape, {
        capture: true,
      });
      // A long press is how touch selects a locked shape, to unlock it
      if (editor.getInstanceState().isCoarsePointer) {
        const point = editor.inputs.currentPagePoint;
        const atPoint = editor.getShapesAtPoint(point);
        const selected = editor.getSelectedShapes();
        if (selected.length && atPoint.some((s) => selected.includes(s))) {
          return;
        }
        const locked = atPoint.filter((s) => editor.isShapeOrAncestorLocked(s));
        if (locked.length) editor.select(...locked.map((s) => s.id));
      }
    },
    [editor, keepFocusOnEscape],
  );
  const [isOpen, handleOpenChange] = useMenuIsOpen(
    'context menu',
    onOpenChange,
  );

  return (
    <ContextMenu.Root
      dir="ltr"
      open={isOpen}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <ContextMenu.Trigger dir="ltr" disabled={props.disabled}>
        {Canvas && <Canvas />}
      </ContextMenu.Trigger>
      {isOpen && (
        <ContextMenu.Portal container={container}>
          <ContextMenu.Content
            className="tlui-menu tlui-scrollable"
            aria-label={msg('context-menu.title')}
            alignOffset={-4}
            collisionPadding={4}
            onContextMenu={preventDefault}
          >
            <TldrawUiMenuContextProvider
              type="context-menu"
              sourceId="context-menu"
            >
              <BoardContextMenuContent />
            </TldrawUiMenuContextProvider>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}

// tldraw's items without what a board can't do: flattening and exports need
// an asset store, link and embed items need tldraw's bookmark shapes, and a
// board has one page
function BoardContextMenuContent() {
  const editor = useEditor();
  const isReadonly = useReadonly();
  const isSelecting = useValue(
    'select tool',
    () => editor.getCurrentToolId() === 'select',
    [editor],
  );
  const hasSelection = useValue(
    'has selection',
    () => editor.getSelectedShapeIds().length > 0,
    [editor],
  );
  const actions = useActions();
  const cardsHideArrows = useValue(
    'selected cards hide arrows',
    () => selectedCardsHideArrows(editor),
    [editor],
  );
  if (!isSelecting) return null;

  return (
    <>
      {hasSelection && !isReadonly && (
        <TldrawUiMenuGroup id="modify">
          <TldrawUiMenuSubmenu id="edit" label="context-menu.edit" size="small">
            <UngroupMenuItem />
            <FitFrameToContentMenuItem />
            <RemoveFrameMenuItem />
            <ToggleAutoSizeMenuItem />
            <ToggleLockMenuItem />
          </TldrawUiMenuSubmenu>
          <ArrangeMenuSubmenu />
          <ReorderMenuSubmenu />
        </TldrawUiMenuGroup>
      )}
      {cardsHideArrows !== null && !isReadonly && (
        <TldrawUiMenuGroup id="card-arrows">
          <TldrawUiMenuItem
            id="toggle-card-arrows"
            label={cardsHideArrows ? 'Show arrows' : 'Hide arrows'}
            onSelect={() =>
              actions['toggle-card-arrows']?.onSelect('context-menu')
            }
          />
        </TldrawUiMenuGroup>
      )}
      <ClipboardMenuGroup />
      <TldrawUiMenuGroup id="select-all">
        <SelectAllMenuItem />
      </TldrawUiMenuGroup>
    </>
  );
}
