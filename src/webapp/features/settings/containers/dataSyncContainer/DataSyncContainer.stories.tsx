import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DataSyncContainer from './DataSyncContainer';
import DataSyncContainerSkeleton from './Skeleton.DataSyncContainer';
import {
  MOCK_BOTH_DIRECTIONS,
  MOCK_DB_AHEAD,
  MOCK_FAILED,
  MOCK_PDS_AHEAD,
  MOCK_SYNCING,
} from '../../lib/dataSync/mockData';

const meta: Meta<typeof DataSyncContainer> = {
  title: 'Features/Settings/DataSyncContainer',
  component: DataSyncContainer,
};

export default meta;

type Story = StoryObj<typeof DataSyncContainer>;

/** Healthy state — everything matches between Semble and the PDS. */
export const InSync: Story = {};

/** Records arrived on the PDS that Semble hasn't pulled in yet. */
export const PdsAhead: Story = {
  args: {
    initialState: MOCK_PDS_AHEAD,
  },
};

/** Records exist in Semble that haven't been published to the PDS. */
export const DbAhead: Story = {
  args: {
    initialState: MOCK_DB_AHEAD,
  },
};

/** Drift on both sides — items missing in each direction. */
export const BothDirections: Story = {
  args: {
    initialState: MOCK_BOTH_DIRECTIONS,
  },
};

/** A re-sync is currently running. Button shows the loading state. */
export const Syncing: Story = {
  args: {
    initialState: MOCK_SYNCING,
  },
};

/** Last sync attempt failed — button flips to "Retry" and shows the error. */
export const Failed: Story = {
  args: {
    initialState: MOCK_FAILED,
  },
};

export const Skeleton: Story = {
  render: () => <DataSyncContainerSkeleton />,
};
