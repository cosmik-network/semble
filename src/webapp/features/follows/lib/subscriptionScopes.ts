import { SubscriptionScope } from '@semble/types';
import { FollowTargetType } from './types';

export const SCOPES_BY_TARGET_TYPE: Record<
  FollowTargetType,
  SubscriptionScope[]
> = {
  USER: ['CARD', 'CONNECTION'],
  COLLECTION: ['CARD', 'COLLECTION_SAVED', 'CONNECTION'],
};

export const SCOPE_COPY: Record<
  SubscriptionScope,
  {
    label: string;
    description: (targetType: FollowTargetType) => string;
  }
> = {
  CARD: {
    label: 'Cards',
    description: (targetType) =>
      targetType === 'USER'
        ? 'Notify me when they save a card.'
        : 'Notify me when a card is added to this collection.',
  },
  CONNECTION: {
    label: 'Connections',
    description: (targetType) =>
      targetType === 'USER'
        ? 'Notify me when they create a connection.'
        : 'Notify me when someone connects this collection.',
  },
  COLLECTION_SAVED: {
    label: 'Collection saves',
    description: () => 'Notify me when someone saves this collection.',
  },
};
