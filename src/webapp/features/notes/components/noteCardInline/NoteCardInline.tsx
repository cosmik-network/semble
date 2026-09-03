'use client';

import { Anchor, Card, Group, Stack } from '@mantine/core';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import type { UrlCard, User } from '@/api-client';
import { LinkAvatar } from '@/components/link/MantineLink';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import styles from './NoteCardInline.module.css';

interface Props {
  note: UrlCard['note'];
  cardAuthor?: User;
}

export default function NoteCardInline(props: Props) {
  return (
    <Card
      className={styles.root}
      radius="md"
      p="xs"
      onClick={(e) => e.stopPropagation()}
    >
      <Stack gap={'xs'}>
        <Group justify="space-between" wrap="nowrap">
          {props.cardAuthor ? (
            <Group gap={'5'}>
              <LinkAvatar
                href={`/profile/${props.cardAuthor.handle}`}
                src={props.cardAuthor.avatarUrl?.replace(
                  'avatar',
                  'avatar_thumbnail',
                )}
                alt={`${props.cardAuthor.handle}'s avatar`}
                size={'xs'}
                radius={'sm'}
              />
              <Anchor
                href={`/profile/${props.cardAuthor.handle}`}
                fz={'xs'}
                fw={600}
                c={'bright'}
                underline="never"
                onClick={(e) => e.stopPropagation()}
              >
                {props.cardAuthor.name || `@${props.cardAuthor.handle}`}
              </Anchor>
              {isBotAccount(props.cardAuthor) && <BotLabel />}
            </Group>
          ) : (
            <span />
          )}
        </Group>

        {props.note && (
          <RichTextRenderer
            text={props.note.text}
            textProps={{ fw: 500, fz: 'sm', fs: 'italic', c: 'gray' }}
          />
        )}
      </Stack>
    </Card>
  );
}
