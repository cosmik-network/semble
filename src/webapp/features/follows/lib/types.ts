import { SubscriptionScope } from '@semble/types';

export type FollowTargetType = 'USER' | 'COLLECTION';

export interface FollowTarget {
  targetId: string;
  targetType: FollowTargetType;
}

export interface SubscriptionState {
  isSubscribed: boolean;
  scopes: SubscriptionScope[];
}
