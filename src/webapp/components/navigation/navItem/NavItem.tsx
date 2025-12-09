'use client';

import { useNavbarContext } from '@/providers/navbar';
import { NavLink, Indicator } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  href: string;
  label: string;
  icon: React.ReactElement;
  badge?: number;
}

export default function NavItem(props: Props) {
  const { toggleMobile } = useNavbarContext();
  const pathname = usePathname();
  const isActive = pathname === props.href;

  const navLink = (
    <NavLink
      component={Link}
      href={props.href}
      color="gray"
      c={'gray'}
      fw={600}
      label={props.label}
      leftSection={props.icon}
      rightSection={props.badge ? String(props.badge) : undefined}
      active={isActive}
      onClick={toggleMobile}
    />
  );

  // Show pink dot indicator if there are unread notifications
  if (props.badge && props.badge > 0) {
    return (
      <Indicator
        color="pink"
        size={8}
        offset={7}
        position="top-start"
      >
        {navLink}
      </Indicator>
    );
  }

  return navLink;
}
