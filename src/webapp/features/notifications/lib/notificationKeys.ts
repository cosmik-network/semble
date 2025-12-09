export const notificationKeys = {
  all: () => ['notifications'] as const,
  infinite: (limit?: number) => [...notificationKeys.all(), 'infinite', limit],
  unreadCount: () => [...notificationKeys.all(), 'unreadCount'] as const,
};
