'use client';

import {
  Avatar,
  Combobox,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  type TextareaProps,
  useCombobox,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { findActiveToken, type ActiveToken } from '@semble/types';
import useTags from '@/features/tags/lib/queries/useTags';
import { searchAtProtoAccounts } from '@/features/search/lib/dal';

interface Props extends Omit<TextareaProps, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Textarea with #tag and @mention autocomplete. Typing `#` opens recent
 * tags (prefix-filtered as you type); typing `@` opens profile search.
 * Selecting an option replaces the in-progress token. The text stays a
 * plain string — tokens render as links wherever notes are displayed.
 */
export default function NoteTextarea({ value, onValueChange, ...rest }: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeToken, setActiveToken] = useState<ActiveToken | null>(null);
  const [caretPos, setCaretPos] = useState(0);

  const [debouncedQuery] = useDebouncedValue(activeToken?.query ?? '', 200);

  const tagQuery = useTags({
    q: activeToken?.type === 'tag' ? debouncedQuery : undefined,
    limit: 8,
    enabled: activeToken?.type === 'tag',
  });

  const mentionQuery = useQuery({
    queryKey: ['mention-autocomplete', debouncedQuery],
    queryFn: () => searchAtProtoAccounts(debouncedQuery, { limit: 8 }),
    enabled:
      activeToken?.type === 'mention' && debouncedQuery.trim().length > 0,
    staleTime: 30_000,
  });

  const syncToken = (text: string, caret: number) => {
    setCaretPos(caret);
    const token = findActiveToken(text, caret);
    setActiveToken(token);
    if (token) {
      combobox.openDropdown();
    } else {
      combobox.closeDropdown();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(e.currentTarget.value);
    syncToken(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
  };

  const handleCaretMove = () => {
    const el = textareaRef.current;
    if (!el) return;
    syncToken(el.value, el.selectionStart ?? 0);
  };

  const handleOptionSubmit = (inserted: string) => {
    if (!activeToken) return;
    const replacement = `${inserted} `;
    const newValue =
      value.slice(0, activeToken.start) + replacement + value.slice(caretPos);
    onValueChange(newValue);
    combobox.closeDropdown();
    setActiveToken(null);

    const newCaret = activeToken.start + replacement.length;
    // Restore focus and caret after React re-renders with the new value
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
      }
    });
  };

  const tags = tagQuery.data?.tags ?? [];
  const actors = mentionQuery.data?.actors ?? [];
  const isLoading =
    activeToken?.type === 'tag' ? tagQuery.isFetching : mentionQuery.isFetching;

  const options =
    activeToken?.type === 'tag'
      ? tags.map((t) => (
          <Combobox.Option key={t.tag} value={`#${t.tag}`} p={5}>
            <Text fw={500} c="blue" size="sm">
              #{t.tag}
            </Text>
          </Combobox.Option>
        ))
      : actors.map((actor) => (
          <Combobox.Option key={actor.did} value={`@${actor.handle}`} p={5}>
            <Group gap="xs" align="center" wrap="nowrap">
              <Avatar
                src={actor.avatar?.replace('avatar', 'avatar_thumbnail')}
                alt={`${actor.handle}'s avatar`}
                size="sm"
              />
              <Stack gap={0}>
                <Text fw={500} c="bright" lineClamp={1} size="sm">
                  {actor.displayName || actor.handle}
                </Text>
                <Text c="gray" lineClamp={1} size="xs">
                  @{actor.handle}
                </Text>
              </Stack>
            </Group>
          </Combobox.Option>
        ));

  const showEmptyMentionHint =
    activeToken?.type === 'mention' &&
    debouncedQuery.trim().length === 0 &&
    actors.length === 0;

  return (
    <Combobox
      shadow="sm"
      radius="md"
      store={combobox}
      position="bottom-start"
      onOptionSubmit={handleOptionSubmit}
    >
      <Combobox.Target>
        <Textarea
          {...rest}
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onClick={handleCaretMove}
          onKeyUp={handleCaretMove}
        />
      </Combobox.Target>

      <Combobox.Dropdown hidden={!activeToken}>
        <Combobox.Options>
          <ScrollArea.Autosize type="scroll" mah={200} offsetScrollbars>
            {isLoading && (
              <Group justify="center" p="xs">
                <Loader size="xs" />
              </Group>
            )}
            {!isLoading && showEmptyMentionHint && (
              <Text size="sm" c="dimmed" py="xs" px={5}>
                Type a handle to mention someone
              </Text>
            )}
            {!isLoading && !showEmptyMentionHint && options.length === 0 && (
              <Combobox.Empty>
                {activeToken?.type === 'tag'
                  ? 'No tags yet'
                  : 'No matching accounts'}
              </Combobox.Empty>
            )}
            {options}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
