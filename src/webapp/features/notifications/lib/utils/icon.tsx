import { ReactNode } from 'react';
import { NotificationType } from '@semble/types';
import { FaUserPlus } from 'react-icons/fa6';
import { FiPlus } from 'react-icons/fi';
import { BiLink } from 'react-icons/bi';
import { MdNotificationsActive, MdOutlineAlternateEmail } from 'react-icons/md';
import { IconBaseProps, IconType } from 'react-icons/lib';

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
    case NotificationType.SUBSCRIBED_USER_ADDED_CARD:
    case NotificationType.USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION:
    case NotificationType.SUBSCRIBED_USER_MADE_CONNECTION:
    case NotificationType.USER_CONNECTED_SUBSCRIBED_COLLECTION:
    case NotificationType.USER_ADDED_SUBSCRIBED_COLLECTION:
      return MdNotificationsActive;
    case NotificationType.USER_FOLLOWED_YOU:
      return FaUserPlus;
    case NotificationType.USER_FOLLOWED_YOUR_COLLECTION:
      return FaUserPlus;
    case NotificationType.USER_CONNECTED_YOUR_URL:
      return BiLink;
    case NotificationType.USER_CONNECTED_YOUR_POST:
      return BiLink;
    case NotificationType.USER_CONNECTED_YOUR_COLLECTION:
      return BiLink;
    case NotificationType.USER_MENTIONED_YOU:
      return MdOutlineAlternateEmail;
    default:
      return null;
  }
};

// Element-returning variant for use directly in JSX; the icons are stable
// module-level components, which the static-components lint rule can't see
// through a component-scope variable.
export const renderNotificationTypeIcon = (
  type?: NotificationType,
  props?: IconBaseProps,
): ReactNode => {
  const Icon = getNotificationTypeIcon(type);
  if (!Icon) return null;
  return <Icon {...props} />;
};
