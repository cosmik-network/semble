import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs, TabsList, TabsTab } from '@mantine/core';
import TabCount from './TabCount';

const meta: Meta<typeof TabCount> = {
  title: 'Components/TabCount',
  component: TabCount,
  decorators: [
    // In a real tab, so the skeleton and the badge can be compared in place.
    (Story) => (
      <Tabs value="cards">
        <TabsList>
          <TabsTab value="cards" fw={600} rightSection={<Story />}>
            Cards
          </TabsTab>
        </TabsList>
      </Tabs>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TabCount>;

/** Not loaded yet — holds the badge's space so the number lands without a shift. */
export const Loading: Story = { args: { count: undefined } };

/** An empty tab still shows its zero. */
export const Zero: Story = { args: { count: 0 } };

/** Two digits fit the reserved width exactly. */
export const TwoDigits: Story = { args: { count: 42 } };

/** Past two digits the tab grows, which nothing can avoid. */
export const Abbreviated: Story = { args: { count: 12400 } };

/** The count request failed — no badge at all, rather than a stuck shimmer. */
export const Unavailable: Story = { args: { count: null } };
