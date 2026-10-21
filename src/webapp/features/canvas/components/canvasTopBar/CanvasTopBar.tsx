import { ActionIcon, Button, Group, Menu, Text, Tooltip } from '@mantine/core';
import Link from 'next/link';
import { useValue, type Editor } from 'tldraw';
import {
  LuArrowLeft,
  LuChevronDown,
  LuGlobe,
  LuGroup,
  LuLayoutGrid,
  LuLibrary,
  LuNetwork,
  LuOrbit,
} from 'react-icons/lu';
import { applyLayout, LayoutMode } from '../../lib/applyLayout';
import { useCanvasSession } from '../../lib/canvasSession';
import { frameSelectedCards } from '../../lib/frames';
import styles from './CanvasTopBar.module.css';

interface Props {
  title: string;
  backHref: string;
  editor: Editor | null;
}

const LAYOUTS: {
  mode: LayoutMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    mode: 'graph',
    label: 'Graph',
    hint: 'Follow the arrows left to right',
    icon: <LuNetwork />,
  },
  {
    mode: 'radial',
    label: 'Radial',
    hint: 'Around the selected card',
    icon: <LuOrbit />,
  },
  {
    mode: 'site',
    label: 'Group by site',
    hint: 'Cards from the same site together',
    icon: <LuGlobe />,
  },
  {
    mode: 'grid',
    label: 'Tidy grid',
    hint: 'Pack everything into columns',
    icon: <LuLayoutGrid />,
  },
];

export default function CanvasTopBar(props: Props) {
  const editor = props.editor;
  const session = useCanvasSession();
  const trayOpen = useValue(session.trayOpen);
  return (
    <Group
      className={styles.root}
      justify="space-between"
      wrap="nowrap"
      px="sm"
    >
      <div className={styles.pill}>
        <Tooltip label="Back">
          <ActionIcon
            component={Link}
            href={props.backHref}
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label="Back"
          >
            <LuArrowLeft />
          </ActionIcon>
        </Tooltip>
        <Text className={styles.title} fz="lg" fw={700} truncate>
          {props.title}
        </Text>
      </div>
      <div className={styles.pill}>
        <Button
          variant={trayOpen ? 'light' : 'subtle'}
          color="gray"
          leftSection={<LuLibrary />}
          disabled={!editor}
          onClick={() => session.trayOpen.set(!trayOpen)}
        >
          Library
        </Button>
        <Tooltip label="Select cards first to group them into it">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<LuGroup />}
            disabled={!editor}
            onClick={() => editor && frameSelectedCards(editor)}
          >
            New collection
          </Button>
        </Tooltip>
        <Menu position="bottom-end" width={260} zIndex={1000}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<LuNetwork />}
              rightSection={<LuChevronDown />}
              disabled={!editor}
            >
              Layout
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Arranges the selection, or everything</Menu.Label>
            {LAYOUTS.map((l) => (
              <Menu.Item
                key={l.mode}
                leftSection={l.icon}
                onClick={() => editor && applyLayout(editor, l.mode)}
              >
                {l.label}
                <Text size="xs" fw={400} c="dimmed">
                  {l.hint}
                </Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </div>
    </Group>
  );
}
