import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Box, Button } from '@mantine/core';
import ReportCardModal, { ReportSubmission } from './ReportCardModal';

const mockResolve = async (input: ReportSubmission) => {
  // eslint-disable-next-line no-console
  console.log('[mock] report submitted', input);
  await new Promise((r) => setTimeout(r, 800));
};

const mockReject = async () => {
  await new Promise((r) => setTimeout(r, 600));
  throw new Error('Network error — please try again.');
};

const mockNeverResolve = (): Promise<void> => new Promise(() => {});

const meta: Meta<typeof ReportCardModal> = {
  title: 'Features/Cards/ReportCardModal',
  component: ReportCardModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    cardId: 'card-mock-001',
    onClose: () => {
      // eslint-disable-next-line no-console
      console.log('[mock] modal closed');
    },
    onSubmit: mockResolve,
  },
  decorators: [
    (Story) => (
      <Box mih="100vh" p="md">
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ReportCardModal>;

export const Default: Story = {
  name: 'Form (default)',
};

export const Submitting: Story = {
  name: 'Submitting',
  args: {
    onSubmit: mockNeverResolve,
    initialState: { kind: 'submitting' },
  },
};

export const Success: Story = {
  name: 'Success',
  args: {
    initialState: { kind: 'success' },
  },
};

export const ErrorState: Story = {
  name: 'Error',
  args: {
    initialState: {
      kind: 'error',
      message: 'Network error — please try again.',
    },
  },
};

export const AlreadyReported: Story = {
  name: 'Already reported',
  args: {
    initialState: { kind: 'already-reported' },
  },
};

export const SubmitFails: Story = {
  name: 'Interactive: submission fails',
  args: {
    onSubmit: mockReject,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pick a reason and click Submit — the mock rejects so you can see the error state transition.',
      },
    },
  },
};

const TriggerExample = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button color="red" variant="light" onClick={() => setOpen(true)}>
        Report card
      </Button>
      <ReportCardModal
        isOpen={open}
        onClose={() => setOpen(false)}
        cardId="card-mock-001"
        onSubmit={mockResolve}
      />
    </>
  );
};

export const FromTrigger: Story = {
  name: 'Opened from a trigger button',
  render: () => <TriggerExample />,
};
