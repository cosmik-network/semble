import { AvatarGroup, Group, Text, Anchor } from '@mantine/core';
import { getLibrariesForUrl } from '../../lib/dal';
import { sanitizeText } from '@/lib/utils/text';
import { LinkAvatar } from '@/components/link/MantineLink';

interface Props {
  url: string;
}

export default async function UrlAddedBySummary(props: Props) {
  const data = await getLibrariesForUrl(props.url);

  const MAX_PROFILES_TO_SHOW = 3;
  const shownUsers = data.libraries.slice(0, MAX_PROFILES_TO_SHOW);
  const hasMore = data.libraries.length > MAX_PROFILES_TO_SHOW;

  if (data.libraries.length === 0) {
    return null;
  }

  return (
    <Group gap={'xs'}>
      <AvatarGroup>
        {shownUsers.map((p, i) => (
          <LinkAvatar
            key={i}
            href={`/profile/${p.user.handle}`}
            src={p.user.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={p.user.handle}
            name={p.user.handle}
            size={'sm'}
          />
        ))}
      </AvatarGroup>

      <Text fz="sm" fw={500} c={'gray'}>
        {'Added by '}
        {shownUsers.map((p, i) => (
          <Anchor
            key={p.user.handle}
            href={`/profile/${p.user.handle}`}
            fz={'sm'}
            fw={600}
            c={'bright'}
          >
            {sanitizeText(p.user.name)}
            {i < shownUsers.length - 1 ? ', ' : ''}
          </Anchor>
        ))}
        {hasMore && ', and others'}
      </Text>
    </Group>
  );
}
