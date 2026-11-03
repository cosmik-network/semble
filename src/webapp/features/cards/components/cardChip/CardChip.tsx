'use client';

import { Image, Group, Text, Tooltip } from '@mantine/core';
import { truncateText } from '@/lib/utils/text';
import { getDomain, getSembleHref } from '@/lib/utils/link';
import { LinkCard } from '@/components/link/MantineLink';
import { useSembleNavigation } from '@/features/semble/lib/sembleNavigation';
import styles from './CardChip.module.css';

interface Props {
  url: string;
  title?: string;
  imageUrl?: string;
}

export default function CardChip(props: Props) {
  const sembleNavigation = useSembleNavigation();
  const href = getSembleHref(props.url, { ref: 'semble_page' });

  return (
    <Tooltip label={getDomain(props.url)}>
      <LinkCard
        href={href}
        onNavigate={
          sembleNavigation
            ? (e) => {
                e.preventDefault();
                sembleNavigation.navigate(href);
              }
            : undefined
        }
        radius={'md'}
        px={7}
        py={5}
        className={styles.root}
      >
        <Group gap={6} wrap="nowrap">
          {props.imageUrl && (
            <Image
              src={props.imageUrl}
              alt={`${props.imageUrl} social preview image`}
              w={16}
              h={16}
              fit="cover"
              radius={'sm'}
            />
          )}
          <Text size="xs" fw={600}>
            {truncateText(props.title || 'Card', 18)}
          </Text>
        </Group>
      </LinkCard>
    </Tooltip>
  );
}
