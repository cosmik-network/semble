import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useState } from 'react';
import { BiCopy } from 'react-icons/bi';
import { IoMdCheckmark } from 'react-icons/io';
import { IoEyeOutline } from 'react-icons/io5';
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

// The switch is the whole control: off stops sharing at once, in place
export default function ShareCanvasModal(props: Props) {
  const shareCanvas = useShareCanvas();
  const unshareCanvas = useUnshareCanvas();
  // Kept so turning sharing off and back on within the modal keeps working,
  // and set before the server answers, then rolled back if it fails
  const [sharedHere, setSharedHere] = useState<boolean | null>(null);
  const shared = sharedHere ?? props.canvas.sharedAt != null;
  const token = useShareToken(props.canvas.id, shared);
  const link = token.data ? shareHref(token.data.shareToken) : null;

  const handleToggle = (on: boolean) => {
    setSharedHere(on);
    if (on) {
      shareCanvas.mutate(
        { id: props.canvas.id },
        {
          onError: () => {
            setSharedHere(false);
            showCanvasError('Could not share this canvas. Try again.');
          },
        },
      );
    } else {
      unshareCanvas.mutate(
        { id: props.canvas.id },
        {
          onError: () => {
            setSharedHere(true);
            showCanvasError(
              'Could not stop sharing. The link still works, so try again.',
            );
          },
        },
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
      <Stack gap="xl">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              size="md"
              variant="light"
              color={shared ? 'blue' : 'gray'}
              radius="xl"
            >
              <IoEyeOutline size={14} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={500} size="sm">
                View-only link
              </Text>
              <Text fw={500} c="gray" size="sm">
                {shared
                  ? 'Anyone with the link can view'
                  : 'Only you can see this canvas'}
              </Text>
            </Stack>
          </Group>
          <Switch
            size="md"
            withThumbIndicator={false}
            aria-label="View-only link"
            checked={shared}
            disabled={shareCanvas.isPending || unshareCanvas.isPending}
            onChange={(event) => handleToggle(event.currentTarget.checked)}
          />
        </Group>

        <Stack>
          {shared && (
            <TextInput
              readOnly
              variant="filled"
              size="md"
              aria-label="Share link"
              description="Copy and share this link"
              value={link ?? 'Creating link…'}
              onFocus={(e) => e.currentTarget.select()}
              rightSection={
                link && (
                  <CopyButton value={link} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? 'Copied' : 'Copy link'}
                        withArrow
                      >
                        <ActionIcon
                          onClick={copy}
                          variant="subtle"
                          color={copied ? 'green' : 'gray'}
                          aria-label={copied ? 'Link copied' : 'Copy link'}
                        >
                          {copied ? (
                            <IoMdCheckmark size={18} />
                          ) : (
                            <BiCopy size={16} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                )
              }
            />
          )}
          <Button
            variant="light"
            color="gray"
            size="md"
            onClick={props.onClose}
          >
            Done
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
