'use client';

import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { SubscriptionScope } from '@semble/types';
import { useState } from 'react';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import {
  SCOPES_BY_TARGET_TYPE,
  SCOPE_COPY,
} from '../../lib/subscriptionScopes';
import { FollowTargetType } from '../../lib/types';

interface Props {
  opened: boolean;
  onClose: () => void;
  targetType: FollowTargetType;
  isSubscribed: boolean;
  currentScopes: SubscriptionScope[];
  onConfirm: (scopes: SubscriptionScope[]) => void;
}

export default function SubscribeModal(props: Props) {
  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title="Notification settings"
      overlayProps={DEFAULT_OVERLAY_PROPS}
      centered
    >
      {/* children unmount on close, so the form re-seeds itself every open */}
      <ScopeForm
        targetType={props.targetType}
        isSubscribed={props.isSubscribed}
        currentScopes={props.currentScopes}
        onCancel={props.onClose}
        onConfirm={props.onConfirm}
      />
    </Modal>
  );
}

interface ScopeFormProps {
  targetType: FollowTargetType;
  isSubscribed: boolean;
  currentScopes: SubscriptionScope[];
  onCancel: () => void;
  onConfirm: (scopes: SubscriptionScope[]) => void;
}

function ScopeForm({
  targetType,
  isSubscribed,
  currentScopes,
  onCancel,
  onConfirm,
}: ScopeFormProps) {
  const availableScopes = SCOPES_BY_TARGET_TYPE[targetType];
  const [selected, setSelected] = useState<SubscriptionScope[]>(
    isSubscribed ? currentScopes : availableScopes,
  );

  const toggleScope = (scope: SubscriptionScope) => {
    setSelected((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const isUnchanged =
    isSubscribed &&
    selected.length === currentScopes.length &&
    currentScopes.every((scope) => selected.includes(scope));
  const isDisabled = isSubscribed ? isUnchanged : selected.length === 0;

  return (
    <Stack>
      <Stack gap="xs">
        {availableScopes.map((scope) => (
          <Checkbox.Card
            key={scope}
            withBorder={false}
            radius="md"
            p={0}
            checked={selected.includes(scope)}
            onClick={() => toggleScope(scope)}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={0}>
                <Text>{SCOPE_COPY[scope].label}</Text>
                <Text c="dimmed" fz="sm">
                  {SCOPE_COPY[scope].description(targetType)}
                </Text>
              </Stack>
              <Checkbox.Indicator />
            </Group>
          </Checkbox.Card>
        ))}
      </Stack>

      <Group gap={'xs'} justify="flex-end">
        <Button variant="light" color="gray" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={isDisabled}
          onClick={() => onConfirm(selected)}
          data-autofocus
        >
          {isSubscribed ? 'Save changes' : 'Subscribe'}
        </Button>
      </Group>
    </Stack>
  );
}
