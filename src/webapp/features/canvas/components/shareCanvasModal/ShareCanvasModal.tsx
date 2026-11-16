import {
  Button,
  CopyButton,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { IoCheckmarkOutline, IoCopyOutline } from 'react-icons/io5';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import useShareCanvas from '../../lib/mutations/useShareCanvas';
import useUnshareCanvas from '../../lib/mutations/useUnshareCanvas';
import useShareToken from '../../lib/queries/useShareToken';
import { showCanvasError } from '../../lib/showCanvasError';
import type { CanvasRecord } from '../../storage/canvasStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  canvas: CanvasRecord;
}

// The share link's address. Outside /canvas, whose layout requires a session:
// the token is the credential
const shareHref = (shareToken: string) =>
  `${window.location.origin}/share/canvas/${shareToken}`;

export default function ShareCanvasModal(props: Props) {
  const shareCanvas = useShareCanvas();
  const unshareCanvas = useUnshareCanvas();
  // Kept so turning sharing off and back on within the modal keeps working
  const [sharedHere, setSharedHere] = useState<boolean | null>(null);
  const shared = sharedHere ?? props.canvas.sharedAt != null;
  const token = useShareToken(props.canvas.id, shared);
  const link = token.data ? shareHref(token.data.shareToken) : null;

  const handleToggle = (on: boolean) => {
    setSharedHere(on);
    if (on) {
      shareCanvas.mutate(
        { id: props.canvas.id },
        { onError: () => showCanvasError('Could not share this canvas') },
      );
    } else {
      unshareCanvas.mutate(
        { id: props.canvas.id },
        { onError: () => showCanvasError('Could not stop sharing') },
      );
    }
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title="Share Canvas"
      centered
      onClick={(e) => e.stopPropagation()}
      overlayProps={UPDATE_OVERLAY_PROPS}
    >
      <Stack gap={'md'}>
        <Switch
          label="Anyone with the link can view"
          checked={shared}
          disabled={shareCanvas.isPending || unshareCanvas.isPending}
          onChange={(event) => handleToggle(event.currentTarget.checked)}
        />
        {shared ? (
          link ? (
            <TextInput
              readOnly
              variant="filled"
              value={link}
              rightSection={
                <CopyButton value={link} timeout={2000}>
                  {({ copied, copy }) => (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      leftSection={
                        copied ? <IoCheckmarkOutline /> : <IoCopyOutline />
                      }
                      onClick={copy}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </CopyButton>
              }
            />
          ) : (
            <Text fz="sm" c="dimmed">
              Loading link…
            </Text>
          )
        ) : (
          <Text fz="sm" c="dimmed">
            Turn on to create a view-only link. Turning it off stops the link
            from working.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="light" color="gray" onClick={props.onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
