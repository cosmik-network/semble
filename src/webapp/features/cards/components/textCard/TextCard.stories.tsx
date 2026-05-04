import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CollectionAccessType } from '@semble/types';
import type { Collection } from '@semble/types';
import TextCard from './TextCard';
import { AuthContext } from '@/hooks/useAuth';
import type { AuthContextType } from '@/hooks/useAuth';

const mockAuthUser = {
  id: 'did:plc:mock123',
  name: 'Test User',
  handle: 'test.user',
  avatarUrl: 'https://i.pravatar.cc/150?u=testuser',
};

const mockAuthValue: AuthContextType = {
  user: mockAuthUser as any,
  isAuthenticated: true,
  isLoading: false,
  refreshAuth: async () => {},
  logout: async () => {},
};

const cardAuthor = {
  id: 'did:plc:author456',
  name: 'Jane Researcher',
  handle: 'jane.researcher',
  avatarUrl: 'https://i.pravatar.cc/150?u=jane',
  description: 'Science writer and open-access advocate.',
  followerCount: 214,
  followingCount: 63,
};

const baseCollection: Collection = {
  id: 'col-story-001',
  uri: 'at://did:plc:colauthor789/app.semble.collection/3juzt2xkr5c2a',
  name: 'Research Notes',
  author: {
    id: 'did:plc:colauthor789',
    name: 'Alex Curator',
    handle: 'alex.curator',
    avatarUrl: 'https://i.pravatar.cc/150?u=alex',
  },
  description: 'A curated collection of research notes and insights.',
  accessType: CollectionAccessType.CLOSED,
  cardCount: 24,
  createdAt: '2024-09-15T12:00:00.000Z',
  updatedAt: '2025-06-20T09:30:00.000Z',
  isFollowing: false,
  followerCount: 31,
};

const baseCardContent = {
  url: 'https://example.com/article-1',
  title: 'How to Actually Enjoy Cooking at Home',
  siteName: 'The Kitchn',
  type: 'article',
  retrievedAt: '2025-06-01T10:00:00.000Z',
};

const meta: Meta<typeof TextCard> = {
  title: 'Features/Cards/TextCard',
  component: TextCard,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthValue}>
        <div style={{ maxWidth: 360 }}>
          <Story />
        </div>
      </AuthContext.Provider>
    ),
  ],
  args: {
    id: 'card-txt-001',
    cardContent: baseCardContent,
    urlLibraryCount: 5,
    urlIsInLibrary: false,
    urlConnectionCount: 2,
    urlIsConnected: false,
  },
};

export default meta;

type Story = StoryObj<typeof TextCard>;

export const Default: Story = {
  args: {
    text: "<p>The trick to enjoying cooking is to stop treating every meal like a project. Pick three recipes you actually like, rotate them during the week, and save the experiments for weekends when there's no pressure.</p>",
  },
};

export const RichFormatting: Story = {
  args: {
    id: 'card-txt-rich',
    text: `<h3>Things I Changed This Year</h3>
<p>I finally stopped buying groceries without a <strong>rough plan</strong> for the week. It sounds obvious, but it cut my food waste in <em>half</em>.</p>
<ul>
  <li>Check what's already in the <strong>fridge</strong> before shopping</li>
  <li>Buy versatile ingredients that work in multiple meals</li>
  <li>Freeze anything you won't use in two days</li>
</ul>
<blockquote>
  <p>"The best meal plan is the one you actually stick to."</p>
</blockquote>
<p>Also started keeping a running note on my phone with a list of <code>go-to meals</code> so I never blank at the store again.</p>`,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/simple-meal-planning',
      title: 'Simple Meal Planning for Busy People',
      siteName: 'Budget Bytes',
    },
  },
};

export const LongText: Story = {
  args: {
    id: 'card-txt-long',
    text: `<p>I've been thinking a lot about how we pick up habits without realizing it. Most of the things I do every morning — checking my phone, making coffee in a specific order, even the route I walk to the train — started without any conscious decision.</p>
<p>What's interesting is that <strong>small disruptions</strong> to routine can feel weirdly unsettling. When my usual coffee shop closed for renovation last month, it threw off my whole morning for a week. I started arriving at work later and feeling groggy until noon.</p>
<p>Eventually I found a new place two blocks further, and now I actually prefer it. The walk is longer but I pass through a park, which turns out to be a much nicer way to start the day than staring at traffic.</p>
<p>The lesson I keep re-learning: the things that feel like inconveniences in the moment often push you toward something better, but only if you let them.</p>
<p>I wonder how many other parts of my routine could use a gentle shake-up. Maybe it's time to audit the defaults I've been living on autopilot.</p>`,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/daily-habits',
      title: 'The Hidden Power of Everyday Routines',
      siteName: 'Psyche Magazine',
    },
  },
};

export const InLibrary: Story = {
  args: {
    id: 'card-txt-library',
    urlIsInLibrary: true,
    urlLibraryCount: 42,
    text: '<p>This is a really solid breakdown of how to organize a small apartment. The bit about <strong>vertical storage</strong> in the kitchen freed up so much counter space when I tried it at home.</p>',
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/small-space-living',
      title: 'Making the Most of a Small Kitchen',
      siteName: 'Apartment Therapy',
    },
  },
};

export const Connected: Story = {
  args: {
    id: 'card-txt-connected',
    urlIsConnected: true,
    urlConnectionCount: 8,
    text: "<p>I like how this frames budgeting not as restriction but as <em>clarity</em>. Knowing where your money goes each month isn't about cutting fun — it's about making sure the fun stuff is actually what you'd choose on purpose.</p>",
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/budgeting-mindset',
      title: 'A Healthier Way to Think About Money',
      siteName: 'The Financial Diet',
    },
  },
};

export const WithCollection: Story = {
  args: {
    id: 'card-txt-collection',
    currentCollection: baseCollection,
    cardAuthor: cardAuthor,
    authorHandle: cardAuthor.handle,
    text: "<p>Great advice in here about running a book club that people actually show up to. The key is keeping it casual — pick shorter books, don't guilt people for not finishing, and always have <strong>snacks</strong>.</p>",
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/book-club-tips',
      title: 'How to Run a Book Club That Lasts',
      siteName: 'Literary Hub',
    },
  },
};

export const ShortText: Story = {
  args: {
    id: 'card-txt-short',
    text: '<p>The photos in this one are gorgeous.</p>',
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/travel-photos',
      title: 'A Weekend in the Cotswolds',
      siteName: 'Condé Nast Traveller',
    },
  },
};
