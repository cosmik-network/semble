import { useState } from 'react';
import {
  Image,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { stopEventPropagation, useEditor, useValue } from 'tldraw';
import { UrlMetadata } from '@semble/types';
import { LuLink, LuSearch } from 'react-icons/lu';
import { searchUrls } from '@/features/connections/lib/dal';
import { useMyCardsInfinite } from '@/features/cards/lib/queries/useMyCards';
import { getDomain } from '@/lib/utils/link';
import { createUserArrow } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';
import { addCardAt } from '../../lib/cardOps';
import styles from './QuickAdd.module.css';

interface Option {
  url: string;
  metadata?: Partial<UrlMetadata>;
  isNew?: boolean;
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function QuickAdd() {
  const editor = useEditor();
  const session = useCanvasSession();
  const state = useValue(session.quickAdd);
  const anchor = useValue(
    'quick add anchor',
    () => (state ? editor.pageToViewport(state.point) : null),
    [editor, state],
  );

  if (!state || !anchor) return null;
  return (
    <QuickAddBox
      key={`${state.point.x},${state.point.y}`}
      anchor={anchor}
      onClose={() => {
        session.quickAdd.set(null);
        editor.focus();
      }}
      onPick={async (option) => {
        session.quickAdd.set(null);
        const id = await addCardAt(editor, option, state.point);
        if (state.connectFrom && editor.getShape(state.connectFrom)) {
          createUserArrow(editor, state.connectFrom, id);
        }
        editor.focus();
      }}
    />
  );
}

interface BoxProps {
  anchor: { x: number; y: number };
  onClose: () => void;
  onPick: (option: Option) => void;
}

function QuickAddBox(props: BoxProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [debounced] = useDebouncedValue(query.trim(), 200);
  const isUrl = isValidUrl(query.trim());

  const recent = useMyCardsInfinite({ limit: 6 });
  const search = useQuery({
    queryKey: ['url search', debounced],
    queryFn: () => searchUrls({ searchQuery: debounced, limit: 10 }),
    enabled: debounced.length > 0 && !isUrl,
  });

  const options: Option[] = isUrl
    ? [{ url: query.trim(), isNew: true }]
    : debounced
      ? (search.data?.urls ?? []).map((u) => ({
          url: u.url,
          metadata: u.metadata,
        }))
      : (recent.data?.pages[0]?.cards ?? []).map((c) => ({
          url: c.url,
          metadata: c.cardContent,
        }));
  const loading = debounced ? search.isFetching : recent.isPending;
  const current = Math.min(active, Math.max(0, options.length - 1));

  return (
    <Paper
      className={styles.root}
      style={{ left: props.anchor.x, top: props.anchor.y }}
      shadow="md"
      radius="lg"
      p="xs"
      withBorder
      onPointerDown={stopEventPropagation}
      onWheel={stopEventPropagation}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) props.onClose();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') props.onClose();
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((current + 1) % Math.max(1, options.length));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive(
            (current - 1 + options.length) % Math.max(1, options.length),
          );
        }
        if (e.key === 'Enter' && options[current]) {
          e.preventDefault();
          props.onPick(options[current]);
        }
      }}
    >
      <Stack gap={6}>
        <TextInput
          autoFocus
          variant="unstyled"
          placeholder="Paste a link or search cards"
          leftSection={<LuSearch />}
          rightSection={loading ? <Loader size={14} /> : null}
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setActive(0);
          }}
        />
        {!debounced && !isUrl && options.length > 0 && (
          <Text size="xs" c="dimmed" px={6}>
            Recent cards
          </Text>
        )}
        <ScrollArea.Autosize mah={300}>
          <Stack gap={2}>
            {options.map((option, i) => (
              <UnstyledButton
                key={option.url}
                className={styles.option}
                data-active={i === current || undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => props.onPick(option)}
              >
                {option.metadata?.imageUrl ? (
                  <Image
                    src={option.metadata.imageUrl}
                    alt=""
                    w={32}
                    h={32}
                    radius="md"
                    fit="cover"
                    style={{ flexShrink: 0 }}
                  />
                ) : (
                  <ThemeIcon variant="light" color="gray" size={32} radius="md">
                    <LuLink />
                  </ThemeIcon>
                )}
                <Stack gap={0} miw={0}>
                  <Text size="sm" fw={600} lineClamp={1}>
                    {option.isNew
                      ? 'Add this link'
                      : option.metadata?.title || option.url}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {option.isNew ? option.url : getDomain(option.url)}
                  </Text>
                </Stack>
              </UnstyledButton>
            ))}
            {debounced && !isUrl && !loading && options.length === 0 && (
              <Text size="xs" c="dimmed" p={6}>
                No cards found. Paste a link to add it.
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Paper>
  );
}
