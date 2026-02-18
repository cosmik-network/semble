import { useNavbarContext } from '@/providers/navbar';
import { Badge, NavLink, ThemeIcon } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './CollectionNavItem.module.css';
import { isMarginUri } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import { CollectionAccessType } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  name: string;
  url: string;
  cardCount: number;
  accessType?: CollectionAccessType;
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
      leftSection={
        isMargin ? (
          <MarginLogo size={16} />
        ) : props.accessType === CollectionAccessType.OPEN ? (
          <ThemeIcon size={'sm'} variant="light" color={'green'} radius={'xl'}>
            <FaSeedling size={10} />
          </ThemeIcon>
        ) : undefined
      }
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
