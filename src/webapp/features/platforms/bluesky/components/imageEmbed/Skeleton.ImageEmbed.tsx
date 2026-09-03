import { Box, Skeleton } from '@mantine/core';
import styles from './ImageEmbed.module.css';

export default function ImageEmbedSkeleton() {
  return (
    <Box className={styles.frame} w="100%">
      <Skeleton className={styles.gallery} w="100%" h="auto" radius="md" />
    </Box>
  );
}
