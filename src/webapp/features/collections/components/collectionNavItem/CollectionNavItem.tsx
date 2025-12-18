import { useNavbarContext } from '@/providers/navbar';
import { Badge, NavLink } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './CollectionNavItem.module.css';

interface Props {
  name: string;
  url: string;
  cardCount: number;
}

export default function CollectionNavItem(props: Props) {
  const { toggleMobile } = useNavbarContext();
  const pathname = usePathname();
  const isActive = pathname === props.url;

  return (
    <NavLink
      component={Link}
      href={props.url}
      label={props.name}
      variant="subtle"
      classNames={{
        root: isActive
          ? `${styles.navLink} ${styles.navLinkActive}`
          : styles.navLink,
      }}
      onClick={toggleMobile}
      rightSection={
        props.cardCount > 0 ? (
          <Badge
            className={isActive ? styles.badgeActive : styles.badge}
            circle
          >
            {props.cardCount}
          </Badge>
        ) : null
      }
    />
  );
}
