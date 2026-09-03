import { getUrlMetadata } from '@/features/cards/lib/dal';
import { getLibrariesForUrl } from '../../lib/dal';
import { STAT_CHIP_PREVIEW_LIMIT } from '@/components/statChip/constants';
import { sanitizeText } from '@/lib/utils/text';
import SembleStatChip from './SembleStatChip';

interface Props {
  url: string;
}

export default async function SembleStats(props: Props) {
  const [{ stats }, libraries] = await Promise.all([
    getUrlMetadata({ url: props.url, includeStats: true }),
    getLibrariesForUrl(props.url, { limit: STAT_CHIP_PREVIEW_LIMIT }).catch(
      () => null,
    ),
  ]);
  const users = libraries?.libraries.map((item) => item.user) ?? [];
  const total = stats?.libraryCount ?? users.length;

  if (total === 0 || users.length === 0) return null;

  return (
    <SembleStatChip
      url={props.url}
      total={total}
      names={users.map((user) => sanitizeText(user.name) || user.handle)}
      avatars={users.map((user) => ({
        key: user.id,
        src: user.avatarUrl,
        alt: `${user.name}'s avatar`,
      }))}
    />
  );
}
