'use client';

import { useNavbarContext } from '@/providers/navbar';
import { NavLink } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  href: string;
  label: string;
  icon: React.ReactElement;
}

export default function NavItem(props: Props) {
  const { toggleMobile } = useNavbarContext();
  const pathname = usePathname();
  const isActive = pathname === props.href;

  return (
    <NavLink
      component={Link}
      href={props.href}
      color="gray"
      c={'gray'}
      fw={600}
      label={props.label}
      leftSection={props.icon}
      active={isActive}
      onClick={toggleMobile}
    />
  );
}
