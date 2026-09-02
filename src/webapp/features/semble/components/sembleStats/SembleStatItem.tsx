'use client';

import { UnstyledButton } from '@mantine/core';
import { ReactNode } from 'react';
import { buildSembleQuery } from '@/lib/utils/link';

export const SEMBLE_TAB_CHANGE_EVENT = 'semble:tab-change';

export type SembleStatTab = 'notes' | 'collections' | 'addedBy' | 'connections';

interface Props {
  tab: SembleStatTab;
  children: ReactNode;
}

export default function SembleStatItem(props: Props) {
  const handleClick = () => {
    const params = new URLSearchParams(window.location.search);
    window.history.replaceState(
      null,
      '',
      buildSembleQuery(params, { set: { sembleTab: props.tab } }),
    );
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
