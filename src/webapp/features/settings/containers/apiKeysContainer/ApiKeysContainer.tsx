'use client';

import classes from './ApiKeysContainer.module.css';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Code,
  Container,
  CopyButton,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { MdDelete, MdEdit, MdKey } from 'react-icons/md';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import { useApiKeys } from '../../lib/apiKeys/useApiKeys';
import type { ApiKey, NewApiKey } from '@semble/types';

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ApiKeysContainer() {
  const {
    keys,
    createKey,
    updateKey,
    revokeKey,
    isCreating,
    isUpdating,
    isRevoking,
  } = useApiKeys();

  // Create modal
  const [createOpened, { open: openCreate, close: closeCreate }] =
    useDisclosure(false);
  const [keyName, setKeyName] = useState('');

  // Token reveal modal (shown once after creation)
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [tokenOpened, { open: openToken, close: closeToken }] =
    useDisclosure(false);

  // Rename modal
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [editName, setEditName] = useState('');
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);

  // Revoke confirm modal
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revokeOpened, { open: openRevoke, close: closeRevoke }] =
    useDisclosure(false);

  async function handleCreate() {
    if (!keyName.trim() || isCreating) return;
    const created = await createKey(keyName.trim());
    setKeyName('');
    closeCreate();
    setNewKey(created);
    openToken();
  }

  function handleEditClick(key: ApiKey) {
    setEditTarget(key);
    setEditName(key.name);
    openEdit();
  }

  async function handleEditConfirm() {
    if (!editTarget || !editName.trim() || isUpdating) return;
    await updateKey(editTarget.id, editName.trim());
    setEditTarget(null);
    setEditName('');
    closeEdit();
  }

  function handleRevokeClick(key: ApiKey) {
    setRevokeTarget(key);
    openRevoke();
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget || isRevoking) return;
    await revokeKey(revokeTarget.id);
    setRevokeTarget(null);
    closeRevoke();
  }

  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={0}>
            <Text fw={500}>API Keys</Text>
            <Text fw={500} c="gray" fz="sm">
              Authenticate requests to the Semble API
            </Text>
          </Stack>
          <Button variant="light" size="sm" radius="xl" onClick={openCreate}>
            Create key
          </Button>
        </Group>

        {/* Key list */}
        <Stack gap={0} className={classes.groupedCards}>
          {keys.length === 0 ? (
            <Card radius="lg" p="xl" bg="var(--mantine-color-gray-light)">
              <Stack align="center">
                <Stack align="center" gap="xs">
                  <MdKey size={28} color="var(--mantine-color-gray-5)" />
                  <Stack align="center" gap={0}>
                    <Text fw={500} c="gray" ta="center">
                      No keys created
                    </Text>
                    <Text fw={500} c="gray" fz="sm" ta="center">
                      Create a key to get started
                    </Text>
                  </Stack>
                </Stack>
                <Button
                  variant="white"
                  color="gray"
                  size="sm"
                  radius="xl"
                  onClick={openCreate}
                >
                  Create key
                </Button>
              </Stack>
            </Card>
          ) : (
            keys.map((key) => (
              <Card key={key.id} bg="var(--mantine-color-gray-light)" p="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Stack gap={4}>
                    <Text fw={500} fz="sm">
                      {key.name}
                    </Text>
                    <Text fz="xs" c="dimmed" ff="monospace">
                      {key.prefix}
                      {'••••••••••••••••••••••'}
                    </Text>
                    <Group gap={4}>
                      <Text fz="xs" fw={500} c="gray">
                        Created {formatDate(key.createdAt)}
                      </Text>
                      <Text fz="xs" fw={500} c="gray">
                        ·
                      </Text>
                      <Text fz="xs" fw={500} c="gray">
                        {key.lastUsedAt
                          ? `Last used ${formatDate(key.lastUsedAt)}`
                          : 'Never used'}
                      </Text>
                    </Group>
                  </Stack>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                      variant="light"
                      color="gray"
                      radius="xl"
                      onClick={() => handleEditClick(key)}
                      aria-label={`Rename ${key.name}`}
                    >
                      <MdEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      radius="xl"
                      onClick={() => handleRevokeClick(key)}
                      aria-label={`Revoke ${key.name}`}
                    >
                      <MdDelete size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </Stack>

      {/* Create key modal */}
      <Modal
        opened={createOpened}
        onClose={closeCreate}
        title="Generate API key"
        size="sm"
        centered
      >
        <Stack>
          <TextInput
            variant="filled"
            label="Choose a name that helps you identify this key"
            placeholder="e.g. Production server"
            value={keyName}
            onChange={(e) => setKeyName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            data-autofocus
          />
          <Group justify="end" gap={'xs'}>
            <Button
              variant="light"
              color="gray"
              size="sm"
              onClick={closeCreate}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!keyName.trim() || isCreating}
              loading={isCreating}
            >
              Generate
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Rename key modal */}
      <Modal
        opened={editOpened}
        onClose={closeEdit}
        title="Rename API key"
        size="sm"
        centered
      >
        <Stack>
          <TextInput
            variant="filled"
            label="Choose a name that helps you identify this key"
            placeholder="e.g. Production server"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEditConfirm()}
            data-autofocus
          />
          <Group justify="end" gap={'xs'}>
            <Button variant="light" color="gray" size="sm" onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditConfirm}
              disabled={!editName.trim() || isUpdating}
              loading={isUpdating}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Token reveal modal — shown once immediately after creation */}
      <Modal
        opened={tokenOpened}
        onClose={closeToken}
        title="Your new API key"
        size="sm"
        centered
      >
        <Stack>
          <Text fz="sm" fw={600}>
            Copy this key now — it will not be shown again.
          </Text>
          <Stack gap={0}>
            <Code color="transparent">{newKey?.name}</Code>
            <CopyButton value={newKey?.token ?? ''}>
              {({ copied, copy }) => (
                <Box
                  pos="relative"
                  onClick={copy}
                  style={{ cursor: 'pointer' }}
                >
                  <Code
                    block
                    p="md"
                    style={{
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px',
                    }}
                  >
                    {newKey?.token}
                  </Code>
                  <Button
                    size="xs"
                    pos="absolute"
                    top={8}
                    right={8}
                    onClick={(e) => {
                      e.stopPropagation();
                      copy();
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </Box>
              )}
            </CopyButton>
          </Stack>

          <Button variant="light" color="gray" onClick={closeToken}>
            I have saved this key
          </Button>
        </Stack>
      </Modal>

      {/* Revoke confirm modal */}
      <Modal
        opened={revokeOpened}
        onClose={closeRevoke}
        withCloseButton={false}
        title={`Revoke "${revokeTarget?.name}"`}
        size="xs"
        overlayProps={DANGER_OVERLAY_PROPS}
        centered
      >
        <Stack>
          <Text fz="sm" fw={500} c="gray">
            This key will stop working immediately and cannot be recovered.
          </Text>
          <Button variant="subtle" size="md" color="gray" onClick={closeRevoke}>
            Cancel
          </Button>
          <Button
            color="red"
            size="md"
            onClick={handleRevokeConfirm}
            data-autofocus
            loading={isRevoking}
            disabled={isRevoking}
          >
            Revoke key
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
