import { Center, Image } from '@mantine/core';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BiWorld } from 'react-icons/bi';
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
  const [imageError, setImageError] = useState(false);
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
        props.imageUrl && !imageError ? (
          <Image
            src={props.imageUrl}
            alt=""
            w={24}
            h={24}
            fit="cover"
            radius={'sm'}
            onError={() => setImageError(true)}
          />
        ) : (
          <Center w={24} h={24} className={styles.imagePlaceholder}>
            <BiWorld size={16} />
          </Center>
        )
      }
    />
  );
}
