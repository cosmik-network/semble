import { useNavbarContext } from '@/providers/navbar';
import { Badge } from '@mantine/core';
import { usePathname } from 'next/navigation';
import styles from './CollectionNavItem.module.css';
import { isMarginUri } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';
import { CollectionAccessType } from '@semble/types';
import { abbreviateNumber } from '@/lib/utils/text';
import { LinkNavLink } from '@/components/link/MantineLink';

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
  const isOpenCollection = props.accessType === CollectionAccessType.OPEN;

  return (
    <LinkNavLink
      href={props.url}
      label={props.name}
      active={isActive}
      color={isOpenCollection ? 'green' : 'gray'}
      classNames={{
        root: isActive
          ? `${styles.navLink} ${isOpenCollection ? styles.navLinkActiveGreen : styles.navLinkActive}`
          : isOpenCollection
            ? `${styles.navLink} ${styles.navLinkGreen}`
            : styles.navLink,
      }}
      onClick={toggleMobile}
      leftSection={isMargin ? <MarginLogo size={16} /> : undefined}
      rightSection={
        props.cardCount > 0 ? (
          <Badge
            fullWidth
            className={
              isActive
                ? isOpenCollection
                  ? styles.badgeActiveGreen
                  : styles.badgeActive
                : styles.badge
            }
          >
            {abbreviateNumber(props.cardCount)}
          </Badge>
        ) : null
      }
    />
  );
}
