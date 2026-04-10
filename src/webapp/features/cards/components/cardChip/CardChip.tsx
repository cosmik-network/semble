import { Image, Group, Text, Tooltip } from '@mantine/core';
import { truncateText } from '@/lib/utils/text';
import { getDomain } from '@/lib/utils/link';
import { LinkCard } from '@/components/link/MantineLink';
import styles from './CardChip.module.css';

interface Props {
  url: string;
  title?: string;
  imageUrl?: string;
}

export default function CardChip(props: Props) {
  return (
    <Tooltip label={getDomain(props.url)}>
      <LinkCard
        href={`/url?id=${encodeURIComponent(props.url)}`}
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
