import { getRelativeTime } from '@/lib/utils/time';
import { Card, Spoiler, Text } from '@mantine/core';

interface Props {
  id: string;
  note: string;
  updatedAt: string;
  authorId: string;
}

export default function NoteCard(props: Props) {
  const time = getRelativeTime(props.updatedAt);
  const relativeUpdateDate =
    time === 'just now' ? `Updated ${time}` : `Updated ${time} ago`;

  return (
    <Card p={'sm'} withBorder>
      <Spoiler showLabel={'Read more'} hideLabel={'See less'} maxHeight={200}>
        <Text fz={'sm'}>{props.note}</Text>
        <Text fz={'sm'} c={'gray'}>
          {relativeUpdateDate}
        </Text>
      </Spoiler>
    </Card>
  );
}
