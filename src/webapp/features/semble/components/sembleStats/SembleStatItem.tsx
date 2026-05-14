'use client';

import { UnstyledButton } from '@mantine/core';
import { ReactNode } from 'react';

export const SEMBLE_TAB_CHANGE_EVENT = 'semble:tab-change';

export type SembleStatTab = 'notes' | 'collections' | 'addedBy' | 'connections';

interface Props {
  tab: SembleStatTab;
  children: ReactNode;
}

export default function SembleStatItem(props: Props) {
  const handleClick = () => {
    const params = new URLSearchParams(window.location.search);
    const queryParts: string[] = [];
    let foundTab = false;
    params.forEach((value, key) => {
      if (key === 'sembleTab') {
        queryParts.push(`sembleTab=${props.tab}`);
        foundTab = true;
      } else {
        queryParts.push(`${key}=${value}`);
      }
    });
    if (!foundTab) {
      queryParts.push(`sembleTab=${props.tab}`);
    }
    window.history.replaceState(null, '', `?${queryParts.join('&')}`);
    window.dispatchEvent(
      new CustomEvent<SembleStatTab>(SEMBLE_TAB_CHANGE_EVENT, {
        detail: props.tab,
      }),
    );
  };

  return (
    <UnstyledButton onClick={handleClick} style={{ cursor: 'pointer' }}>
      {props.children}
    </UnstyledButton>
  );
}
