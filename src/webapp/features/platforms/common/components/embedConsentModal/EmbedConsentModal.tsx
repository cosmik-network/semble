import { Button, Modal, Stack, Text } from '@mantine/core';
import {
  EMBED_SOURCES,
  EmbedSource,
} from '@/features/platforms/common/lib/externalEmbeds';
import { LinkAnchor } from '@/components/link/MantineLink';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  source: EmbedSource;
  onAllowOnce: () => void;
  onAllowAlways: () => void;
}

export default function EmbedConsentModal(props: Props) {
  const label = EMBED_SOURCES[props.source].label;

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      title={`Load ${label} content?`}
      size={'xs'}
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Stack gap="md">
        <Text c="gray" fz="sm">
          This embed is hosted by {label}. Loading it lets {label} see that you
          visited and track any interaction with it. You can change this anytime
          in{' '}
          <LinkAnchor
            href="/settings/external-media"
            fz="sm"
            c="blue"
            onClick={props.onClose}
          >
            Settings → External media
          </LinkAnchor>
          .
        </Text>
        <Stack gap="xs">
          <Button size="md" onClick={props.onAllowAlways}>
            Always allow {label}
          </Button>
          <Button
            size="md"
            variant="light"
            color="gray"
            onClick={props.onAllowOnce}
          >
            Allow once
          </Button>
          <Button
            size="md"
            variant="subtle"
            color="gray"
            onClick={props.onClose}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
