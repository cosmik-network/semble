import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NoteCard from './NoteCard';

const meta = {
  component: NoteCard,
} satisfies Meta<typeof NoteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    note: `This is the note's content`,
    authorId: 'author id',
    id: 'note id',
    updatedAt: '2025'
  },
};
