import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Avatar, Card, Group, Skeleton, Stack } from '@mantine/core';
import styles from '../../../feeds/components/feedActivityStatus/FeedActivityStatus.module.css';

export default function NotificationItemSkeleton() {
  return (
    <Stack gap={'xs'} align="stretch">
      {/* Notification activity status*/}
      <Card p={0} className={styles.root} radius={'lg'}>
        <Stack gap={'xs'} align="stretch" w={'100%'}>
          <Group gap={'xs'} wrap="nowrap" align="center" p={'xs'}>
            <Avatar />
            <Stack gap={'sm'} align="stretch" w={'100%'}>
              <Skeleton w={'100%'} h={21} />
              <Skeleton w={'20%'} h={13} />
            </Stack>
          </Group>
        </Stack>
      </Card>

      <UrlCardSkeleton />
    </Stack>
  );
}
