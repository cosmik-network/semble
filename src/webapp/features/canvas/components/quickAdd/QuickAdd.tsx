import {
  Combobox,
  Loader,
  Modal,
  Stack,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useState } from 'react';
import { BiSearch } from 'react-icons/bi';
import { useValue } from 'tldraw';
import UrlOptionRow from '@/features/cards/components/urlOptionRow/UrlOptionRow';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import type { QuickAdd as QuickAddController } from '../../controller/quickAdd';
import useLibrarySearch from '../../lib/queries/useLibrarySearch';
import { linkKey } from '../../model/linkCards';

const PROMPT = 'Paste a link or search your library';

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
  const [input, setInput] = useState('');
  const [query] = useDebouncedValue(input.trim(), 200);
  const search = useLibrarySearch(query);
  const links = search.data ?? [];
  const isLink = linkKey(input) !== null;

  const emptyMessage = () => {
    if (search.isError) return "Couldn't search your library";
    if (isLink) return 'Press Enter to place this link';
    if (query) return 'No links in your library match';
    return PROMPT;
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(url) => props.quickAdd.place(url)}
    >
      <Stack gap="xs">
        <Combobox.EventsTarget>
          <TextInput
            aria-label={PROMPT}
            placeholder={PROMPT}
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
