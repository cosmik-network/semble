import { ReactNode, Suspense, useEffect } from 'react';
import {
  ActionIcon,
  Center,
  Group,
  Loader,
  Scroller,
  ScrollArea,
  Tabs,
  Text,
} from '@mantine/core';
import { ErrorBoundary } from 'react-error-boundary';
import { Editor, useValue } from 'tldraw';
import { LuX } from 'react-icons/lu';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import CollectionsTab from './CollectionsTab';
import ConnectionsTab from './ConnectionsTab';
import DetailsTab from './DetailsTab';
import SimilarTab from './SimilarTab';
import styles from './CardPanel.module.css';

interface Props {
  editor: Editor;
}

export default function CardPanel(props: Props) {
  const editor = props.editor;
  const session = useCanvasSession();
  const card = useValue(
    'panel card',
    () => {
      const id = session.panelShapeId.get();
      const shape = id ? editor.getShape(id) : undefined;
      return isCardShape(shape) ? shape : null;
    },
    [editor, session],
  );
  const panelId = useValue(session.panelShapeId);

  useEffect(() => {
    if (panelId && !card) session.panelShapeId.set(null);
  }, [panelId, card, session]);

  if (!card) return null;
  const url = card.props.url;

  return (
    <aside className={styles.root}>
      <Group justify="space-between" wrap="nowrap" px="md" pt="sm" pb="xs">
        <Text fz="lg" fw={700} lineClamp={1}>
          {card.props.title || url}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          aria-label="Close panel"
          onClick={() => session.panelShapeId.set(null)}
        >
          <LuX />
        </ActionIcon>
      </Group>
      <Tabs
        key={url}
        defaultValue="details"
        className={styles.tabs}
        keepMounted={false}
      >
        <Tabs.List px="md" style={{ flexWrap: 'nowrap' }}>
          <Scroller>
            <Tabs.Tab value="details" className={styles.tab}>
              Details
            </Tabs.Tab>
            <Tabs.Tab value="similar" className={styles.tab}>
              Similar
            </Tabs.Tab>
            <Tabs.Tab value="connections" className={styles.tab}>
              Connections
            </Tabs.Tab>
            <Tabs.Tab value="collections" className={styles.tab}>
              Collections
            </Tabs.Tab>
          </Scroller>
        </Tabs.List>
        <Tabs.Panel value="details" className={styles.panel}>
          <TabBody>
            <DetailsTab editor={editor} card={card} />
          </TabBody>
        </Tabs.Panel>
        <Tabs.Panel value="similar" className={styles.panel}>
          <TabBody>
            <SimilarTab editor={editor} card={card} />
          </TabBody>
        </Tabs.Panel>
        <Tabs.Panel value="connections" className={styles.panel}>
          <TabBody>
            <ConnectionsTab editor={editor} card={card} />
          </TabBody>
        </Tabs.Panel>
        <Tabs.Panel value="collections" className={styles.panel}>
          <TabBody>
            <CollectionsTab editor={editor} card={card} />
          </TabBody>
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}

function TabBody(props: { children: ReactNode }) {
  return (
    <ScrollArea h="100%" p="sm">
      <ErrorBoundary
        fallback={
          <Text size="sm" c="dimmed">
            Could not load this.
          </Text>
        }
      >
        <Suspense
          fallback={
            <Center p="md">
              <Loader size="sm" />
            </Center>
          }
        >
          {props.children}
        </Suspense>
      </ErrorBoundary>
    </ScrollArea>
  );
}
