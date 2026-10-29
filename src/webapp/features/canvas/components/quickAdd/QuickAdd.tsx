import {
  Combobox,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useRef, useState } from 'react';
import { BiSearch } from 'react-icons/bi';
import { useValue } from 'tldraw';
import UrlOptionRow from '@/features/cards/components/urlOptionRow/UrlOptionRow';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import type { QuickAdd as QuickAddController } from '../../controller/quickAdd';
import useLinkSearch from '../../lib/queries/useLinkSearch';
import type { SearchScope } from '../../server/canvasServer';
import { linkKey } from '../../model/linkCards';

const SCOPES: { value: SearchScope; label: string }[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'everyone', label: 'Everyone' },
];

const MESSAGES: Record<
  SearchScope,
  { prompt: string; failed: string; noMatch: string }
> = {
  mine: {
    prompt: 'Paste a link or search your library',
    failed: "Couldn't search your library",
    noMatch: 'No links in your library match',
  },
  everyone: {
    prompt: 'Paste a link or search all of Semble',
    failed: "Couldn't search Semble",
    noMatch: 'No links on Semble match',
  },
};

interface Props {
  quickAdd: QuickAddController;
}

export default function QuickAdd(props: Props) {
  const isOpen = useValue(
    'quick-add open',
    () => props.quickAdd.placeAt.get() !== null,
    [props.quickAdd],
  );

  return (
    <Modal
      opened={isOpen}
      onClose={props.quickAdd.close}
      withCloseButton={false}
      overlayProps={UPDATE_OVERLAY_PROPS}
      padding="xs"
    >
      <QuickAddSearch quickAdd={props.quickAdd} />
    </Modal>
  );
}

function QuickAddSearch(props: Props) {
  const combobox = useCombobox();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [query] = useDebouncedValue(input.trim(), 200);
  const scope = useValue(props.quickAdd.scope);
  const search = useLinkSearch(scope, query);
  const links = search.data ?? [];
  const isLink = linkKey(input) !== null;
  const messages = MESSAGES[scope];

  const emptyMessage = () => {
    if (search.isError) return messages.failed;
    if (isLink) return 'Press Enter to place this link';
    if (search.isPending) return 'Searching…';
    if (query) return messages.noMatch;
    return messages.prompt;
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(url) => props.quickAdd.place(url)}
    >
      <Stack gap="xs">
        <Combobox.EventsTarget>
          <TextInput
            ref={inputRef}
            aria-label={messages.prompt}
            placeholder={messages.prompt}
            variant="filled"
            size="md"
            leftSection={<BiSearch />}
            rightSection={search.isFetching && <Loader size="xs" />}
            data-autofocus
            value={input}
            onChange={(e) => {
              setInput(e.currentTarget.value);
              combobox.resetSelectedOption();
            }}
            onKeyDown={(e) => {
              // The combobox keeps the first Escape for itself once an arrow
              // key has moved through the results
              if (e.key === 'Escape') props.quickAdd.close();
              if (e.key !== 'Enter' || combobox.getSelectedOptionIndex() !== -1)
                return;
              e.preventDefault();
              props.quickAdd.place(input);
            }}
          />
        </Combobox.EventsTarget>

        <SegmentedControl
          value={scope}
          onChange={(value) => {
            props.quickAdd.setScope(value);
            combobox.resetSelectedOption();
            // Back to the search box, so typing and arrow keys carry on
            inputRef.current?.focus();
          }}
          data={SCOPES}
          size="xs"
        />

        <Combobox.Options>
          {links.length === 0 || isLink ? (
            <Combobox.Empty>{emptyMessage()}</Combobox.Empty>
          ) : (
            links.map((link) => (
              <Combobox.Option key={link.url} value={link.url} p={5}>
                <UrlOptionRow
                  url={link.url}
                  title={link.title}
                  imageUrl={link.imageUrl}
                />
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Stack>
    </Combobox>
  );
}
