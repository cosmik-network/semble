import {
  Anchor,
  Avatar,
  Card,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  ScrollArea,
  Spoiler,
  Stack,
  Text,
} from '@mantine/core';
import { FeedItem, Collection } from '@/api-client';
import { Fragment } from 'react';
import Link from 'next/link';
import styles from './FeedActivityStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { getRecordKey } from '@/lib/utils/atproto';
import { sanitizeText } from '@/lib/utils/text';

interface Props {
  user: FeedItem['user'];
  collections?: FeedItem['collections'];
  createdAt: Date;
  note?: string;
}

export default function FeedActivityStatus(props: Props) {
  const MAX_DISPLAYED = 2;
  const time = getRelativeTime(props.createdAt.toString());
  const relativeCreatedDate = time === 'just now' ? `Now` : `${time} ago`;

  const renderActivityText = () => {
    const collections = props.collections ?? [];
    const displayedCollections = collections.slice(0, MAX_DISPLAYED);
    const remainingCollections = collections.slice(
      MAX_DISPLAYED,
      collections.length,
    );
    const remainingCount = collections.length - MAX_DISPLAYED;

    return (
      <Text fw={500}>
        <Text
          component={Link}
          href={`/profile/${props.user.handle}`}
          fw={600}
          c={'bright'}
        >
          {sanitizeText(props.user.name)}
        </Text>{' '}
        {collections.length === 0 ? (
          <Text span>added to library</Text>
        ) : (
          <Fragment>
            <Text span>added to </Text>
            {displayedCollections.map(
              (collection: Collection, index: number) => (
                <span key={collection.id}>
                  <Anchor
                    component={Link}
                    href={`/profile/${collection.author.handle}/collections/${getRecordKey(collection.uri!)}`}
                    c="grape"
                    fw={500}
                  >
                    {collection.name}
                  </Anchor>
                  {index < displayedCollections.length - 1 ? ', ' : ''}
                </span>
              ),
            )}
            {remainingCount > 0 && <Text span>{' and '}</Text>}
            {remainingCount > 0 && (
              <Menu shadow="sm">
                <MenuTarget>
                  <Text
                    fw={600}
                    c={'blue'}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    span
                  >
                    {remainingCount} other collection
                    {remainingCount > 1 ? 's' : ''}
                  </Text>
                </MenuTarget>
                <MenuDropdown maw={380}>
                  <ScrollArea.Autosize mah={150} type="auto">
                    {remainingCollections.map((c) => (
                      <MenuItem
                        key={c.id}
                        component={Link}
                        href={`/profile/${c.author.handle}/collections/${getRecordKey(c.uri!)}`}
                        target="_blank"
                        c="grape"
                        fw={600}
                      >
                        {c.name}
                      </MenuItem>
                    ))}
                  </ScrollArea.Autosize>
                </MenuDropdown>
              </Menu>
            )}
          </Fragment>
        )}
        <Text fz={'sm'} fw={600} c={'gray'} span display={'block'}>
          {relativeCreatedDate}
        </Text>
      </Text>
    );
  };

  return (
    <Card p={0} className={styles.root} radius={'lg'}>
      <Stack gap={'xs'} p={'xs'}>
        <Group gap={'xs'} wrap="nowrap" align="center">
          <Avatar
            component={Link}
            href={`/profile/${props.user.handle}`}
            src={props.user.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.user.name}'s' avatar`}
          />
          {renderActivityText()}
        </Group>
        {props.note && (
          <Spoiler
            showLabel={'Read more'}
            hideLabel={'See less'}
            maxHeight={100}
          >
            <Text fw={500} fs={'italic'} c={'gray'}>
              {props.note}
            </Text>
          </Spoiler>
        )}
      </Stack>
    </Card>
  );
}
