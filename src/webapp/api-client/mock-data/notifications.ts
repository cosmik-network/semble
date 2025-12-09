import { NotificationItem, NotificationType } from '@semble/types';

class MockNotificationStore {
  private notifications: NotificationItem[] = [
    {
      id: '1',
      user: {
        id: 'user-1',
        name: 'Alice Johnson',
        handle: 'alice.bsky.social',
        avatarUrl: 'https://picsum.photos/seed/alice/100/100',
        description: 'Frontend developer and design enthusiast',
      },
      card: {
        id: 'card-1',
        type: 'URL',
        url: 'https://example.com/article-1',
        cardContent: {
          url: 'https://example.com/article-1',
          title: 'Building Better User Interfaces',
          description:
            'A comprehensive guide to modern UI design principles and best practices.',
          author: 'John Doe',
          thumbnailUrl: 'https://picsum.photos/seed/article1/400/200',
        },
        libraryCount: 15,
        urlLibraryCount: 15,
        urlInLibrary: false,
        createdAt: '2024-12-08T10:30:00Z',
        updatedAt: '2024-12-08T10:30:00Z',
        author: {
          id: 'current-user',
          name: 'You',
          handle: 'you.bsky.social',
          avatarUrl: 'https://picsum.photos/seed/you/100/100',
        },
      },
      createdAt: '2024-12-09T09:15:00Z',
      collections: [
        {
          id: 'collection-1',
          name: 'Design Resources',
          uri: 'at://did:plc:alice123/network.cosmik.collection/collection1',
          author: {
            id: 'user-1',
            name: 'Alice Johnson',
            handle: 'alice.bsky.social',
            avatarUrl: 'https://picsum.photos/seed/alice/100/100',
          },
          cardCount: 23,
          createdAt: '2024-12-01T14:20:00Z',
          updatedAt: '2024-12-08T16:45:00Z',
        },
      ],
      type: NotificationType.USER_ADDED_YOUR_CARD,
      read: false,
    },
    {
      id: '2',
      user: {
        id: 'user-2',
        name: 'Bob Smith',
        handle: 'bob.bsky.social',
        avatarUrl: 'https://picsum.photos/seed/bob/100/100',
        description: 'Tech writer and blogger',
      },
      card: {
        id: 'card-2',
        type: 'URL',
        url: 'https://bsky.app/profile/you.bsky.social/post/abc123',
        cardContent: {
          url: 'https://bsky.app/profile/you.bsky.social/post/abc123',
          title: 'My thoughts on the future of web development',
          description:
            'Sharing some insights about where I think web development is heading in 2025.',
          thumbnailUrl: 'https://picsum.photos/seed/bsky1/400/200',
        },
        libraryCount: 8,
        urlLibraryCount: 8,
        urlInLibrary: false,
        createdAt: '2024-12-07T15:45:00Z',
        updatedAt: '2024-12-07T15:45:00Z',
        author: {
          id: 'current-user',
          name: 'You',
          handle: 'you.bsky.social',
          avatarUrl: 'https://picsum.photos/seed/you/100/100',
        },
      },
      createdAt: '2024-12-08T14:22:00Z',
      collections: [
        {
          id: 'collection-2',
          name: 'Web Dev Insights',
          uri: 'at://did:plc:bob456/network.cosmik.collection/collection2',
          author: {
            id: 'user-2',
            name: 'Bob Smith',
            handle: 'bob.bsky.social',
            avatarUrl: 'https://picsum.photos/seed/bob/100/100',
          },
          cardCount: 12,
          createdAt: '2024-11-15T09:30:00Z',
          updatedAt: '2024-12-08T14:22:00Z',
        },
      ],
      type: NotificationType.USER_ADDED_YOUR_BSKY_POST,
      read: false,
    },
    {
      id: '3',
      user: {
        id: 'user-3',
        name: 'Carol Davis',
        handle: 'carol.bsky.social',
        avatarUrl: 'https://picsum.photos/seed/carol/100/100',
        description: 'Product manager and curator',
      },
      card: {
        id: 'card-3',
        type: 'URL',
        url: 'https://example.com/my-collection',
        cardContent: {
          url: 'https://example.com/my-collection',
          title: 'Essential JavaScript Resources',
          description:
            'A curated collection of the best JavaScript learning resources and tools.',
          thumbnailUrl: 'https://picsum.photos/seed/collection1/400/200',
        },
        libraryCount: 42,
        urlLibraryCount: 42,
        urlInLibrary: false,
        createdAt: '2024-11-20T11:15:00Z',
        updatedAt: '2024-12-05T09:30:00Z',
        author: {
          id: 'current-user',
          name: 'You',
          handle: 'you.bsky.social',
          avatarUrl: 'https://picsum.photos/seed/you/100/100',
        },
      },
      createdAt: '2024-12-07T16:45:00Z',
      collections: [
        {
          id: 'collection-3',
          name: 'Learning Resources',
          uri: 'at://did:plc:carol789/network.cosmik.collection/collection3',
          author: {
            id: 'user-3',
            name: 'Carol Davis',
            handle: 'carol.bsky.social',
            avatarUrl: 'https://picsum.photos/seed/carol/100/100',
          },
          cardCount: 67,
          createdAt: '2024-10-01T08:00:00Z',
          updatedAt: '2024-12-07T16:45:00Z',
        },
      ],
      type: NotificationType.USER_ADDED_YOUR_COLLECTION,
      read: true,
    },
    {
      id: '4',
      user: {
        id: 'user-4',
        name: 'David Wilson',
        handle: 'david.bsky.social',
        avatarUrl: 'https://picsum.photos/seed/david/100/100',
        description: 'Software engineer and open source contributor',
      },
      card: {
        id: 'card-4',
        type: 'URL',
        url: 'https://example.com/article-2',
        cardContent: {
          url: 'https://example.com/article-2',
          title: 'Advanced React Patterns',
          description:
            'Deep dive into advanced React patterns and when to use them.',
          author: 'Jane Smith',
          thumbnailUrl: 'https://picsum.photos/seed/article2/400/200',
        },
        libraryCount: 28,
        urlLibraryCount: 28,
        urlInLibrary: false,
        createdAt: '2024-12-06T13:20:00Z',
        updatedAt: '2024-12-06T13:20:00Z',
        author: {
          id: 'current-user',
          name: 'You',
          handle: 'you.bsky.social',
          avatarUrl: 'https://picsum.photos/seed/you/100/100',
        },
      },
      createdAt: '2024-12-06T18:30:00Z',
      collections: [
        {
          id: 'collection-4',
          name: 'React Deep Dives',
          uri: 'at://did:plc:david012/network.cosmik.collection/collection4',
          author: {
            id: 'user-4',
            name: 'David Wilson',
            handle: 'david.bsky.social',
            avatarUrl: 'https://picsum.photos/seed/david/100/100',
          },
          cardCount: 15,
          createdAt: '2024-11-01T10:00:00Z',
          updatedAt: '2024-12-06T18:30:00Z',
        },
        {
          id: 'collection-5',
          name: 'Frontend Architecture',
          uri: 'at://did:plc:david012/network.cosmik.collection/collection5',
          author: {
            id: 'user-4',
            name: 'David Wilson',
            handle: 'david.bsky.social',
            avatarUrl: 'https://picsum.photos/seed/david/100/100',
          },
          cardCount: 31,
          createdAt: '2024-10-15T14:30:00Z',
          updatedAt: '2024-12-06T18:30:00Z',
        },
      ],
      type: NotificationType.USER_ADDED_YOUR_CARD,
      read: true,
    },
    {
      id: '5',
      user: {
        id: 'user-5',
        name: 'Emma Thompson',
        handle: 'emma.bsky.social',
        avatarUrl: 'https://picsum.photos/seed/emma/100/100',
        description: 'UX designer and researcher',
      },
      card: {
        id: 'card-5',
        type: 'URL',
        url: 'https://bsky.app/profile/you.bsky.social/post/def456',
        cardContent: {
          url: 'https://bsky.app/profile/you.bsky.social/post/def456',
          title: 'The importance of accessibility in modern web design',
          description:
            'Why accessibility should be a priority, not an afterthought.',
          thumbnailUrl: 'https://picsum.photos/seed/bsky2/400/200',
        },
        libraryCount: 19,
        urlLibraryCount: 19,
        urlInLibrary: false,
        createdAt: '2024-12-05T09:15:00Z',
        updatedAt: '2024-12-05T09:15:00Z',
        author: {
          id: 'current-user',
          name: 'You',
          handle: 'you.bsky.social',
          avatarUrl: 'https://picsum.photos/seed/you/100/100',
        },
      },
      createdAt: '2024-12-05T11:45:00Z',
      collections: [
        {
          id: 'collection-6',
          name: 'Accessibility Resources',
          uri: 'at://did:plc:emma345/network.cosmik.collection/collection6',
          author: {
            id: 'user-5',
            name: 'Emma Thompson',
            handle: 'emma.bsky.social',
            avatarUrl: 'https://picsum.photos/seed/emma/100/100',
          },
          cardCount: 24,
          createdAt: '2024-09-20T12:00:00Z',
          updatedAt: '2024-12-05T11:45:00Z',
        },
      ],
      type: NotificationType.USER_ADDED_YOUR_BSKY_POST,
      read: true,
    },
  ];

  getNotifications(): NotificationItem[] {
    return this.notifications;
  }

  markAsRead(notificationIds: string[]): number {
    let markedCount = 0;
    this.notifications.forEach((notification) => {
      if (notificationIds.includes(notification.id) && !notification.read) {
        notification.read = true;
        markedCount++;
      }
    });
    return markedCount;
  }

  markAllAsRead(): number {
    let markedCount = 0;
    this.notifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        markedCount++;
      }
    });
    return markedCount;
  }
}

const mockNotificationStore = new MockNotificationStore();

export const getMockNotifications = (params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) => {
  const { page = 1, limit = 10, unreadOnly = false } = params || {};

  let filteredNotifications = mockNotificationStore.getNotifications();

  if (unreadOnly) {
    filteredNotifications = filteredNotifications.filter((n) => !n.read);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedNotifications = filteredNotifications.slice(
    startIndex,
    endIndex,
  );

  const unreadCount = mockNotificationStore
    .getNotifications()
    .filter((n) => !n.read).length;

  return {
    notifications: paginatedNotifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filteredNotifications.length / limit),
      totalCount: filteredNotifications.length,
      hasMore: endIndex < filteredNotifications.length,
      limit,
    },
    unreadCount,
  };
};

export const getMockUnreadCount = () => {
  return {
    unreadCount: mockNotificationStore.getNotifications().filter((n) => !n.read)
      .length,
  };
};

export const markMockNotificationsAsRead = (notificationIds: string[]) => {
  const markedCount = mockNotificationStore.markAsRead(notificationIds);
  return { markedCount };
};

export const markAllMockNotificationsAsRead = () => {
  const markedCount = mockNotificationStore.markAllAsRead();
  return { markedCount };
};
