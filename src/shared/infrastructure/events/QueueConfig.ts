export const QueueNames = {
  FEEDS: 'feeds',
  SEARCH: 'search',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export const QueueOptions = {
  [QueueNames.FEEDS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 25,
    concurrency: 15,
  },
  [QueueNames.SEARCH]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 25,
    concurrency: 10,
  },
  [QueueNames.ANALYTICS]: {
    attempts: 2,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: 25,
    removeOnFail: 10,
    concurrency: 20,
  },
  [QueueNames.NOTIFICATIONS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 25,
    concurrency: 10,
  },
} as const;
