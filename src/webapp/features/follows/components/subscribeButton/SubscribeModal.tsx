'use client';

import { Modal, Stack, Switch, Text, Button, Group } from '@mantine/core';
import { SubscriptionScope } from '@semble/types';
import { useEffect, useMemo, useState } from 'react';
import { useUpdateSubscription } from '../../lib/mutations/useUpdateSubscription';

interface Props {
  opened: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  isSubscribed: boolean;
  initialScopes: SubscriptionScope[];
  onSubscribedChange?: (
    isSubscribed: boolean,
    scopes: SubscriptionScope[],
  ) => void;
}

const SCOPE_LABELS: Record<
  SubscriptionScope,
  { title: string; description: (targetType: 'USER' | 'COLLECTION') => string }
> = {
  CARD: {
    title: 'Cards',
    description: (t) =>
      t === 'USER'
        ? 'Notify me when they save a card.'
        : 'Notify me when a card is added to this collection.',
  },
  CONNECTION: {
    title: 'Connections',
    description: (t) =>
      t === 'USER'
        ? 'Notify me when they create a connection.'
        : 'Notify me when a connection is made involving this collection.',
  },
  COLLECTION_SAVED: {
    title: 'Collection saves',
    description: () => 'Notify me when someone saves this collection.',
  },
};

const SCOPES_BY_TARGET: Record<'USER' | 'COLLECTION', SubscriptionScope[]> = {
  USER: ['CARD', 'CONNECTION'],
  COLLECTION: ['CARD', 'COLLECTION_SAVED', 'CONNECTION'],
};

export default function SubscribeModal({
  opened,
  onClose,
  targetId,
  targetType,
  isSubscribed,
  initialScopes,
  onSubscribedChange,
}: Props) {
  const validScopes = SCOPES_BY_TARGET[targetType];

  const seededScopes = useMemo<SubscriptionScope[]>(() => {
    if (isSubscribed) return initialScopes;
    return [];
  }, [isSubscribed, initialScopes]);

  const [selected, setSelected] = useState<Set<SubscriptionScope>>(
    () => new Set(seededScopes),
  );

  useEffect(() => {
    if (opened) setSelected(new Set(seededScopes));
  }, [opened, seededScopes]);

  const mutation = useUpdateSubscription();

  const toggle = (scope: SubscriptionScope) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const nextScopes = validScopes.filter((s) => selected.has(s));
  const nothingSelected = nextScopes.length === 0;

  const sameAsInitial =
    isSubscribed &&
    nextScopes.length === initialScopes.length &&
    nextScopes.every((s) => initialScopes.includes(s));

  const primaryLabel = !isSubscribed
    ? 'Subscribe'
    : nothingSelected
      ? 'Unsubscribe'
      : 'Update subscription';

  const primaryColor = isSubscribed && nothingSelected ? 'red' : 'tangerine';

  const primaryDisabled =
    mutation.isPending ||
    (nothingSelected && !isSubscribed) ||
    (!nothingSelected && sameAsInitial);

  const handleConfirm = () => {
    mutation.mutate(
      {
        targetId,
        targetType,
        currentlySubscribed: isSubscribed,
        nextScopes,
      },
      {
        onSuccess: (data) => {
          onSubscribedChange?.(data.isSubscribed, data.scopes);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Notification settings"
      centered
    >
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          Choose what you want to be notified about.
        </Text>
        <Stack gap="sm">
          {validScopes.map((scope) => {
            const meta = SCOPE_LABELS[scope];
            return (
              <Switch
                key={scope}
                checked={selected.has(scope)}
                onChange={() => toggle(scope)}
                label={meta.title}
                description={meta.description(targetType)}
              />
            );
          })}
        </Stack>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color={primaryColor}
            onClick={handleConfirm}
            disabled={primaryDisabled}
            loading={mutation.isPending}
          >
            {primaryLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
