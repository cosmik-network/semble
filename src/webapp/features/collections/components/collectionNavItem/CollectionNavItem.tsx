import { useNavbarContext } from '@/providers/navbar';
import { Badge, NavLink } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './CollectionNavItem.module.css';
import { isMarginUri } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';

interface Props {
  name: string;
  url: string;
  cardCount: number;
  uri?: string;
}

export default function CollectionNavItem(props: Props) {
  const { toggleMobile } = useNavbarContext();
  const pathname = usePathname();
  const isActive = pathname === props.url;
  const isMargin = isMarginUri(props.uri);

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
      leftSection={isMargin ? <MarginLogo size={16} /> : undefined}
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
