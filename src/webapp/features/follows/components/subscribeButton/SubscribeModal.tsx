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

function ScopeForm(props: ScopeFormProps) {
  const availableScopes = SCOPES_BY_TARGET_TYPE[props.targetType];
  const [selected, setSelected] = useState<SubscriptionScope[]>(
    props.isSubscribed ? props.currentScopes : availableScopes,
  );

  const toggleScope = (scope: SubscriptionScope) => {
    setSelected((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const isUnchanged =
    props.isSubscribed &&
    selected.length === props.currentScopes.length &&
    props.currentScopes.every((scope) => selected.includes(scope));
  const isDisabled = props.isSubscribed ? isUnchanged : selected.length === 0;

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
                  {SCOPE_COPY[scope].description(props.targetType)}
                </Text>
              </Stack>
              <Checkbox.Indicator />
            </Group>
          </Checkbox.Card>
        ))}
      </Stack>

      <Group gap={'xs'} justify="flex-end">
        <Button variant="light" color="gray" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button
          disabled={isDisabled}
          onClick={() => props.onConfirm(selected)}
          data-autofocus
        >
          {!props.isSubscribed
            ? 'Subscribe'
            : selected.length === 0
              ? 'Unsubscribe'
              : 'Save changes'}
        </Button>
      </Group>
    </Stack>
  );
}
