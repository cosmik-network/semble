import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { useEffect, useState } from 'react';
import { LuArrowLeftRight } from 'react-icons/lu';
import { MdDeleteOutline } from 'react-icons/md';
import { TbArrowsExchange } from 'react-icons/tb';
import { useEditor, useValue, type TLArrowShape } from 'tldraw';
import { CONNECTION_TYPES } from '@/features/connections/const/connectionTypes';
import BoardPopup, {
  GAP,
  ICON_PROPS,
  ROOM_ABOVE,
} from '../boardPopup/BoardPopup';
import {
  CONNECTION_TYPE_MENU,
  type ConnectionEdits,
  type EditableConnection,
} from '../../controller/connectionEdits';
import {
  arrowMiddle,
  pillSize,
} from '../../shapes/connectionArrow/connectionArrows';

interface Props {
  edits: ConnectionEdits;
}

// Shown on one of the viewer's own connection arrows, selected on its own
export default function ConnectionEditPopup(props: Props) {
  const connection = useValue(props.edits.selected);
  if (!connection) return null;

  return <Popup edits={props.edits} connection={connection} />;
}

interface PopupProps {
  edits: ConnectionEdits;
  connection: EditableConnection;
}

function Popup(props: PopupProps) {
  const editor = useEditor();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Just above the type pill, which sits at the arrow's middle
  const position = useValue(
    'connection popup position',
    () => {
      const arrow = editor.getShape<TLArrowShape>(props.connection.arrowId);
      const middle = arrow && arrowMiddle(editor, arrow);
      if (!arrow || !middle) return null;
      const inPage = editor.getShapePageTransform(arrow).applyToPoint(middle);
      const center = editor.pageToViewport(inPage);
      const pill = pillSize(editor, arrow.id).get();
      const reach = ((pill?.h ?? 0) / 2) * editor.getZoomLevel() + GAP;
      const above = center.y - reach > ROOM_ABOVE;
      return {
        left: center.x,
        top: above ? center.y - reach : center.y + reach,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      };
    },
    [editor, props.connection.arrowId],
  );

  // Open as a tldraw menu, so the board's shortcuts leave its keys alone
  useEffect(() => {
    if (!isMenuOpen) return;
    editor.menus.addOpenMenu(CONNECTION_TYPE_MENU);
    return () => editor.menus.deleteOpenMenu(CONNECTION_TYPE_MENU);
  }, [editor, isMenuOpen]);

  if (!position) return null;

  return (
    <BoardPopup position={position}>
      <Menu
        position="bottom"
        withinPortal={false}
        opened={isMenuOpen}
        onChange={setIsMenuOpen}
      >
        <Menu.Target>
          <Tooltip label="Change type" withArrow withinPortal={false}>
            <ActionIcon {...ICON_PROPS} aria-label="Change type">
              <TbArrowsExchange size={16} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          {CONNECTION_TYPES.map((type) => {
            const Icon = type.icon;
            const isCurrent = type.value === props.connection.type;
            return (
              <Menu.Item
                key={type.value}
                leftSection={<Icon size={16} color="green" />}
                fw={isCurrent ? 600 : undefined}
                bg={isCurrent ? 'var(--mantine-color-green-light)' : undefined}
                onClick={() =>
                  void props.edits.changeType(props.connection, type.value)
                }
              >
                {type.label}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
      <Tooltip label="Flip direction" withArrow withinPortal={false}>
        <ActionIcon
          {...ICON_PROPS}
          aria-label="Flip direction"
          onClick={() => void props.edits.flip(props.connection)}
        >
          <LuArrowLeftRight size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Delete" withArrow withinPortal={false}>
        <ActionIcon
          {...ICON_PROPS}
          color="red"
          aria-label="Delete"
          onClick={() => props.edits.requestDelete()}
        >
          <MdDeleteOutline size={16} />
        </ActionIcon>
      </Tooltip>
    </BoardPopup>
  );
}
