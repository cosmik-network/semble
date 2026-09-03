'use client';

import {
  Combobox,
  Textarea,
  type TextareaProps,
  useCombobox,
} from '@mantine/core';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { findActiveToken, type ActiveToken } from '@semble/types';
import { getCaretCoordinates } from '@/lib/utils/caret';
import useSuggestions from './useSuggestions';
import SuggestionsDropdown from './SuggestionsDropdown';

interface Props extends Omit<TextareaProps, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

export default function NoteTextarea({ value, onValueChange, ...rest }: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const [caret, setCaret] = useState(0);
  const token = findActiveToken(value, caret);

  const suggestions = useSuggestions(token);

  // Pin the dropdown anchor to the trigger character (# or @) so it stays
  // put while the query grows.
  const positionAnchor = () => {
    const el = textareaRef.current;
    const wrapper = wrapperRef.current;
    const anchor = anchorRef.current;
    if (!token || !el || !wrapper || !anchor) return;
    const pos = getCaretCoordinates(el, token.start);
    const elRect = el.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    anchor.style.top = `${elRect.top - wrapRect.top + pos.top - el.scrollTop}px`;
    anchor.style.left = `${elRect.left - wrapRect.left + pos.left - el.scrollLeft}px`;
    anchor.style.height = `${pos.height}px`;
  };

  // Effect event: reads the latest combobox store without making the effect
  // re-run when the store's open/close callbacks change identity.
  const syncDropdown = useEffectEvent((activeToken: ActiveToken | null) => {
    if (!activeToken) {
      combobox.closeDropdown();
      return;
    }
    positionAnchor();
    combobox.openDropdown();
  });

  useLayoutEffect(() => {
    syncDropdown(token);
  }, [token]);

  const { selectFirstOption } = combobox;

  useEffect(() => {
    if (suggestions.tags.length > 0 || suggestions.actors.length > 0) {
      selectFirstOption();
    }
  }, [suggestions.tags, suggestions.actors, selectFirstOption]);

  const handleOptionSubmit = (inserted: string) => {
    if (!token) return;
    const replacement = `${inserted} `;
    onValueChange(
      value.slice(0, token.start) + replacement + value.slice(caret),
    );
    const next = token.start + replacement.length;
    // The trailing space ends the token, so the dropdown closes by derivation
    setCaret(next);
    // Restore focus and caret after React re-renders with the new value
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(next, next);
    });
  };

  return (
    <Combobox
      shadow="sm"
      radius="md"
      store={combobox}
      width={280}
      position="bottom-start"
      offset={4}
      onOptionSubmit={handleOptionSubmit}
    >
      <div ref={wrapperRef} style={{ position: 'relative' }}>
        <Combobox.EventsTarget>
          <Textarea
            {...rest}
            ref={textareaRef}
            value={value}
            onChange={(e) => onValueChange(e.currentTarget.value)}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onScroll={positionAnchor}
            onBlur={() => combobox.closeDropdown()}
          />
        </Combobox.EventsTarget>
        <Combobox.DropdownTarget>
          <div
            ref={anchorRef}
            style={{ position: 'absolute', width: 0, pointerEvents: 'none' }}
          />
        </Combobox.DropdownTarget>
      </div>

      <SuggestionsDropdown
        token={token}
        tags={suggestions.tags}
        actors={suggestions.actors}
        isSearching={suggestions.isSearching}
      />
    </Combobox>
  );
}
