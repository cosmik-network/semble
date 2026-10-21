import {
  DefaultContextMenu,
  DefaultContextMenuContent,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  TLShapeId,
  TLUiContextMenuProps,
  useEditor,
  useValue,
} from 'tldraw';
import { isCardShape } from '../../lib/arrows';
import {
  arrangeCollection,
  isCollectionShape,
  openCollectionPage,
  toggleCollapsed,
} from '../../lib/frames';
import { useCanvasSession } from '../../lib/canvasSession';
import {
  getSelectedStackId,
  getStackableCards,
  stackCards,
  unstack,
} from '../../lib/stacks';
import { useCardActions } from '../../lib/useCardActions';
import { useIsMyCollection } from '../../lib/useRenameCollection';

export default function CanvasContextMenu(props: TLUiContextMenuProps) {
  const editor = useEditor();
  const actions = useCardActions(editor);
  const shape = useValue('context shape', () => editor.getOnlySelectedShape(), [
    editor,
  ]);

  const card = isCardShape(shape) && !shape.props.ghost ? shape : null;
  const collection = isCollectionShape(shape) ? shape : null;
  const session = useCanvasSession();
  const isMyCollection = useIsMyCollection(collection);
  const stackId = useValue('selected stack', () => getSelectedStackId(editor), [
    editor,
  ]);
  const stackableCount = useValue(
    'stackable cards',
    () => getStackableCards(editor).length,
    [editor],
  );

  return (
    <DefaultContextMenu {...props}>
      {card && (
        <>
          <TldrawUiMenuGroup id="semble-card-open">
            <TldrawUiMenuItem
              id="semble-details"
              label="Details"
              onSelect={() => {
                actions.openDetails(card.id);
              }}
            />
            <TldrawUiMenuItem
              id="semble-open"
              label="Open in Semble"
              onSelect={() => actions.openInSemble(card.id)}
            />
            <TldrawUiMenuItem
              id="semble-copy-link"
              label="Copy link"
              onSelect={() => actions.copyLink(card.id)}
            />
          </TldrawUiMenuGroup>
          <TldrawUiMenuGroup id="semble-card-explore">
            <TldrawUiMenuItem
              id="semble-trail"
              label="Start trail from here"
              onSelect={() => actions.startTrail(card.id)}
            />
            <TldrawUiMenuItem
              id="semble-similar"
              label="Suggest similar"
              onSelect={() => actions.toggleSimilar(card.id)}
            />
            <TldrawUiMenuItem
              id="semble-expand-backward"
              label="Show incoming connections"
              onSelect={() => actions.expand(card.id, 'backward')}
            />
            <TldrawUiMenuItem
              id="semble-expand-forward"
              label="Show outgoing connections"
              onSelect={() => actions.expand(card.id, 'forward')}
            />
          </TldrawUiMenuGroup>
          <TldrawUiMenuGroup id="semble-card-edit">
            <TldrawUiMenuItem
              id="semble-add-to-collection"
              label="Add to collection…"
              onSelect={() => {
                actions.addToCollection(card.id);
              }}
            />
            <TldrawUiMenuSubmenu id="semble-card-size" label="Card size">
              <TldrawUiMenuGroup id="semble-card-size-options">
                {(['compact', 'standard', 'large'] as const).map((size) => (
                  <TldrawUiMenuItem
                    key={size}
                    id={`semble-size-${size}`}
                    label={size[0].toUpperCase() + size.slice(1)}
                    disabled={card.props.size === size}
                    onSelect={() => actions.setSize(card.id, size)}
                  />
                ))}
              </TldrawUiMenuGroup>
            </TldrawUiMenuSubmenu>
            <TldrawUiMenuItem
              id="semble-toggle-connections"
              label={
                card.props.hideConnections
                  ? 'Show connections on this card'
                  : 'Hide connections on this card'
              }
              onSelect={() => actions.toggleConnections(card.id)}
            />
            <TldrawUiMenuItem
              id="semble-remove"
              label={
                isCollectionShape(editor.getShape(card.parentId as TLShapeId))
                  ? 'Remove from collection'
                  : 'Remove from canvas'
              }
              onSelect={() => actions.remove(card.id)}
            />
          </TldrawUiMenuGroup>
        </>
      )}
      {collection && (
        <TldrawUiMenuGroup id="semble-collection">
          {isMyCollection && (
            <TldrawUiMenuItem
              id="semble-rename-collection"
              label="Rename"
              onSelect={() => {
                session.renamingCollectionId.set(collection.id);
              }}
            />
          )}
          <TldrawUiMenuItem
            id="semble-open-collection"
            label="Open collection"
            onSelect={() => {
              openCollectionPage(editor, collection.id);
            }}
          />
          <TldrawUiMenuItem
            id="semble-arrange"
            label="Re-arrange cards"
            disabled={collection.props.collapsed}
            onSelect={() => arrangeCollection(editor, collection.id)}
          />
          <TldrawUiMenuItem
            id="semble-collapse"
            label={collection.props.collapsed ? 'Expand' : 'Collapse'}
            onSelect={() => toggleCollapsed(editor, collection.id)}
          />
        </TldrawUiMenuGroup>
      )}
      {!card && (stackId || stackableCount > 1) && (
        <TldrawUiMenuGroup id="semble-selection">
          {stackId ? (
            <TldrawUiMenuItem
              id="semble-unstack"
              label="Unstack cards"
              onSelect={() => unstack(editor, stackId)}
            />
          ) : (
            <TldrawUiMenuItem
              id="semble-stack"
              label="Stack cards"
              onSelect={() => stackCards(editor, getStackableCards(editor))}
            />
          )}
          <TldrawUiMenuItem
            id="semble-trail-selection"
            label="Present as trail"
            onSelect={() => actions.startTrail()}
          />
        </TldrawUiMenuGroup>
      )}
      <DefaultContextMenuContent />
    </DefaultContextMenu>
  );
}
