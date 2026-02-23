import { NotificationType } from '@semble/types';
import { FaUserPlus } from 'react-icons/fa6';
import { FiPlus } from 'react-icons/fi';
import { IconType } from 'react-icons/lib';

export const getNotificationTypeIcon = (
  type?: NotificationType,
): IconType | null => {
  if (!type) return null;

  switch (type) {
    case NotificationType.USER_ADDED_TO_YOUR_COLLECTION:
      return FiPlus;
    case NotificationType.USER_ADDED_YOUR_BSKY_POST:
      return FiPlus;
    case NotificationType.USER_ADDED_YOUR_CARD:
      return FiPlus;
    case NotificationType.USER_ADDED_YOUR_COLLECTION:
      return FiPlus;
    case NotificationType.USER_FOLLOWED_YOU:
      return FaUserPlus;
    case NotificationType.USER_FOLLOWED_YOUR_COLLECTION:
      return FaUserPlus;
    default:
      return null;
  }
};
