import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AccountSummarySkeleton from './Skeleton.AccountSummary';

const meta = {
  title: 'Features/Settings/AccountSummarySkeleton',
  component: AccountSummarySkeleton,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountSummarySkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
