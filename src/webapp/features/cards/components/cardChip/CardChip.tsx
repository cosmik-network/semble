import { Card, Image, Avatar, Group, Text } from '@mantine/core';
import Link from 'next/link';
import { truncateText } from '@/lib/utils/text';
import styles from './CardChip.module.css';

interface CardChipProps {
  url: string;
  title?: string;
  imageUrl?: string;
}

export default function CardChip(props: CardChipProps) {
  return (
    <Card
      component={Link}
      href={`/url?id=${encodeURIComponent(props.url)}`}
      radius={'md'}
      px={7}
      py={5}
      className={styles.root}
    >
      <Group gap={6} wrap="nowrap">
        {props.imageUrl ? (
          <Image
            src={props.imageUrl}
            alt={`${props.imageUrl} social preview image`}
            w={16}
            h={16}
            fit="cover"
            radius={'sm'}
          />
        ) : (
          <Avatar size={16} radius={'sm'} />
        )}
        <Text size="xs" fw={600}>
          {truncateText(props.title || 'Card', 10)}
        </Text>
      </Group>
    </Card>
  );
}
