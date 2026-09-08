import { Image } from '@mantine/core';
import { usePathname, useSearchParams } from 'next/navigation';
import { useNavbarContext } from '@/providers/navbar';
import { LinkNavLink } from '@/components/link/MantineLink';
import { getDomain, getSembleHref } from '@/lib/utils/link';
import styles from './CardNavItem.module.css';

interface Props {
  url: string;
  title?: string;
  imageUrl?: string;
}

export default function CardNavItem(props: Props) {
  const { toggleMobile } = useNavbarContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Active on this card's semble page, /url?id=<url>
  const isActive = pathname === '/url' && searchParams.get('id') === props.url;

  return (
    <LinkNavLink
      href={getSembleHref(props.url)}
      label={props.title || getDomain(props.url)}
      noWrap
      py={'xxs'}
      color="gray"
      active={isActive}
      classNames={{ root: isActive ? styles.navLinkActive : styles.navLink }}
      onClick={toggleMobile}
      leftSection={
        props.imageUrl ? (
          <Image
            src={props.imageUrl}
            alt=""
            w={24}
            h={24}
            fit="cover"
            radius={'sm'}
          />
        ) : undefined
      }
    />
  );
}
