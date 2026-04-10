'use client';

import {
  ActionIcon,
  type ActionIconProps,
  Avatar,
  type AvatarProps,
  Badge,
  type BadgeProps,
  Button,
  type ButtonProps,
  Card,
  type CardProps,
  MenuItem,
  type MenuItemProps,
  NavLink,
  type NavLinkProps,
  type PolymorphicComponentProps,
  Text,
  type TextProps,
} from '@mantine/core';
import NextLink from 'next/link';

type AsNextLink<P> = PolymorphicComponentProps<typeof NextLink, P>;

export function LinkActionIcon(props: AsNextLink<ActionIconProps>) {
  return <ActionIcon component={NextLink} {...props} />;
}

export function LinkAvatar(props: AsNextLink<AvatarProps>) {
  return <Avatar component={NextLink} {...props} />;
}

export function LinkBadge(props: AsNextLink<BadgeProps>) {
  return <Badge component={NextLink} {...props} />;
}

export function LinkButton(props: AsNextLink<ButtonProps>) {
  return <Button component={NextLink} {...props} />;
}

export function LinkCard(props: AsNextLink<CardProps>) {
  return <Card component={NextLink} {...props} />;
}

export function LinkMenuItem(props: AsNextLink<MenuItemProps>) {
  return <MenuItem component={NextLink} {...props} />;
}

export function LinkNavLink(props: AsNextLink<NavLinkProps>) {
  return <NavLink component={NextLink} {...props} />;
}

export function LinkText(props: AsNextLink<TextProps>) {
  return <Text component={NextLink} {...props} />;
}
