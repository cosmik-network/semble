'use client';

import { ReactNode } from 'react';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';
import LinkTab from '@/components/navigation/linkTab/LinkTab';

interface Props {
  icon: ReactNode;
  value: string;
  label: string;
  href: string;
}

export default function SearchTabItem(props: Props) {
  return (
    <LinkTab
      value={props.value}
      href={props.href}
      leftSection={props.icon}
      onClick={() => {
        track(`Search: ${props.value} tab clicked`);
        posthog.capture(`Search: ${props.value} tab clicked`);
      }}
    >
      {props.label}
    </LinkTab>
  );
}
