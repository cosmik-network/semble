'use client';

import { ActionIcon, Group, Paper, TextInput } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { IoArrowBack } from 'react-icons/io5';
import { useNavHistory } from '@/providers/navHistory';
import useRenameCanvas from '../../lib/mutations/useRenameCanvas';
import useCanvas from '../../lib/queries/useCanvas';
import { showCanvasError } from '../../lib/showCanvasError';
import { DEFAULT_CANVAS_NAME } from '../../storage/canvasStorage';

interface Props {
  canvasId: string;
}

export default function BoardHeader(props: Props) {
  const { canGoBack } = useNavHistory();
  const router = useRouter();
  const { data: canvas } = useCanvas(props.canvasId);
  const renameCanvas = useRenameCanvas();
  // Set while the title is being edited
  const [draft, setDraft] = useState<string | null>(null);
  // Escape blurs too, and the blur mustn't save what it discarded
  const discarding = useRef(false);

  const name = canvas?.name ?? DEFAULT_CANVAS_NAME;

  // A board opened from a link has no history to go back to
  const goBack = () => (canGoBack ? router.back() : router.replace('/home'));

  const commit = () => {
    const next = draft?.trim();
    setDraft(null);
    if (discarding.current) {
      discarding.current = false;
      return;
    }
    if (!next || next === name) return;
    renameCanvas.mutate(
      { id: props.canvasId, name: next },
      { onError: () => showCanvasError('Could not rename canvas') },
    );
  };

  return (
    <Paper
      shadow="sm"
      radius="xl"
      p={4}
      pr="md"
      m="xs"
      style={{ pointerEvents: 'all' }}
    >
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          onClick={goBack}
          variant="subtle"
          size="lg"
          color="gray"
          radius="xl"
          aria-label="Go back"
        >
          <IoArrowBack />
        </ActionIcon>
        <TextInput
          variant="unstyled"
          aria-label="Canvas name"
          maxLength={100}
          // Editing before the name loads would start from the default
          readOnly={!canvas}
          value={draft ?? name}
          onFocus={(e) => {
            setDraft(name);
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              discarding.current = true;
              e.currentTarget.blur();
            }
          }}
          styles={{
            input: {
              fontWeight: 600,
              fieldSizing: 'content',
              minWidth: 80,
              maxWidth: 320,
            },
          }}
        />
      </Group>
    </Paper>
  );
}
