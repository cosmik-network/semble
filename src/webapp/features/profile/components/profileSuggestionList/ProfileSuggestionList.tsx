import { SimpleGrid, Stack, Text } from '@mantine/core';
import ProfileSuggestionCard, {
  SuggestedUser,
} from '../profileSuggestionCard/ProfileSuggestionCard';
import ExploreScroller from '@/features/explore/components/exploreScroller/ExploreScroller';

interface Props {
  users: SuggestedUser[];
  emptyMessage: string;
  /** `scroller` for the explore shelf, `grid` for the full page. */
  layout: 'scroller' | 'grid';
}

export default function ProfileSuggestionList(props: Props) {
  if (props.users.length === 0) {
    return (
      <Stack align="center" gap="xs">
        <Text fz="h3" fw={600} c="gray">
          {props.emptyMessage}
        </Text>
      </Stack>
    );
  }

  const cards = props.users.map((user) => (
    <ProfileSuggestionCard key={user.id} user={user} />
  ));

  if (props.layout === 'grid') {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
        {cards}
      </SimpleGrid>
    );
  }

  return <ExploreScroller>{cards}</ExploreScroller>;
}
