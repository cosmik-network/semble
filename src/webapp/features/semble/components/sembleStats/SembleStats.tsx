import { CardSortField, SortOrder } from '@semble/types';
import { getLibrariesForUrl } from '../../lib/dal';
import { STAT_CHIP_PREVIEW_LIMIT } from '@/components/statChip/constants';
import { sanitizeText } from '@/lib/utils/text';
import SembleStatChip from './SembleStatChip';

interface Props {
  url: string;
}

export default async function SembleStats(props: Props) {
  const libraries = await getLibrariesForUrl(props.url, {
    limit: STAT_CHIP_PREVIEW_LIMIT,
    sortBy: CardSortField.CREATED_AT,
    sortOrder: SortOrder.ASC,
  }).catch(() => null);
  const items = libraries?.libraries ?? [];
  const first = items[0];

  if (!first) return null;

  return (
    <SembleStatChip
      url={props.url}
      name={sanitizeText(first.user.name) || first.user.handle}
      addedAt={first.card.createdAt}
      avatars={items.map((item) => ({
        key: item.user.id,
        src: item.user.avatarUrl,
        alt: `${item.user.name}'s avatar`,
      }))}
    />
  );
}
