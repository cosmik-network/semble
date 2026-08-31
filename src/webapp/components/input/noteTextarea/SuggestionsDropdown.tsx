import {
  Avatar,
  Combobox,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import type { ActiveToken, ProfileView, TagSummary } from '@semble/types';

interface Props {
  token: ActiveToken | null;
  tags: TagSummary[];
  actors: ProfileView[];
  isSearching: boolean;
}

export default function SuggestionsDropdown(props: Props) {
  const showEmptyMentionHint =
    props.token?.type === 'mention' && props.token.query.trim().length === 0;

  const options =
    props.token?.type === 'tag'
      ? props.tags.map((t) => (
          <Combobox.Option key={t.tag} value={`#${t.tag}`} p={5}>
            <Text fw={500} c="blue">
              #{t.tag}
            </Text>
          </Combobox.Option>
        ))
      : props.actors.map((actor) => (
          <Combobox.Option key={actor.did} value={`@${actor.handle}`} p={5}>
            <Group gap="xs" align="center" wrap="nowrap">
              <Avatar
                src={actor.avatar?.replace('avatar', 'avatar_thumbnail')}
                alt={`${actor.handle}'s avatar`}
              />
              <Stack gap={0}>
                <Text fw={500} c="bright" lineClamp={1}>
                  {actor.displayName || actor.handle}
                </Text>
                <Text fw={500} c="gray" lineClamp={1}>
                  @{actor.handle}
                </Text>
              </Stack>
            </Group>
          </Combobox.Option>
        ));

  return (
    <Combobox.Dropdown hidden={!props.token}>
      <Combobox.Options>
        <ScrollArea.Autosize type="scroll" mah={200}>
          {showEmptyMentionHint ? (
            <Text size="sm" c="dimmed" py="xs" px={5}>
              Keep typing to search for people
            </Text>
          ) : props.isSearching ? (
            <Group justify="center" p="xs">
              <Loader size="xs" />
            </Group>
          ) : options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>
              {props.token?.type !== 'tag'
                ? 'No matching accounts'
                : props.token.query
                  ? 'No matching tags'
                  : 'No tags yet'}
            </Combobox.Empty>
          )}
        </ScrollArea.Autosize>
      </Combobox.Options>
    </Combobox.Dropdown>
  );
}
