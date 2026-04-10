'use client';

import { useNavbarContext } from '@/providers/navbar';
import { usePathname } from 'next/navigation';
import { LinkNavLink } from '@/components/link/MantineLink';

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
    <LinkNavLink
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
