'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Accordion, Anchor, Text } from '@mantine/core';
import { FiPlus, FiMinus } from 'react-icons/fi';

const FAQS: {
  value: string;
  question: string;
  answer: ReactNode;
}[] = [
  {
    value: 'what-is-semble',
    question: 'What is Semble?',
    answer: (
      <>
        Semble is a social app for saving, connecting, and curating content. You
        save links, group them into collections, and draw connections between
        related ones. Because other people are doing the same, every link you
        save opens onto what others have saved and connected around it.{' '}
        <Anchor
          href="https://docs.cosmik.network/semble"
          target="_blank"
          c="blue"
        >
          See a quick intro video
        </Anchor>
        .
      </>
    ),
  },
  {
    value: 'content-types',
    question: 'What types of content can I share on Semble?',
    answer:
      "Any link! Some link types are better supported than others right now: for example, you can save links to PDFs and images, but metadata and in-app viewing for them are still on the roadmap. If there's a format you'd like better supported, add a request to our public board.",
  },
  // {
  //   value: 'for-researchers',
  //   question: 'Is Semble for researchers?',
  //   answer:
  //     "We get asked this a lot, probably because Semble has a research-y feel and some research-specific features. We do love research and think Semble has an important role to play in the next evolution of open science. But at the same time, we mean \"research\" in a broad sense: the everyday work of making sense of things. It belongs to everyone, and it's something we're better at together. Whenever you follow a question, save what you find, and connect it to what others have gathered, you're taking part. Semble is for all sensemakers, whatever we're trying to understand.",
  // },
  {
    value: 'open-social',
    question: 'What is open social?',
    answer: (
      <>
        Open social means Semble is built on an open protocol (
        <Anchor href="https://atproto.com/" target="_blank" c="blue">
          AT Protocol
        </Anchor>
        , the protocol Bluesky is built on) rather than a closed platform. Your
        data and social connections live in a store you control instead of
        inside one company's app, so they stay yours and can move with you
        across other apps built on the same protocol. It's why you can join
        Semble with an account you already have and bring your existing
        connections along. The ecosystem of apps built on the AT Protocol is
        called the ATmosphere, it’s a wonderful and active community building a
        new open web.
      </>
    ),
  },
  {
    value: 'private-data',
    question: 'Is there private data on Semble?',
    answer:
      "Not yet. Right now everything on the AT Protocol is public, so anything you save to Semble is visible to others. Private data is an active area of development across the protocol, and we plan to support it as soon as it's ready, hopefully later in 2026.",
  },
  {
    value: 'mobile-app',
    question: 'Is there a mobile app?',
    answer:
      'Not yet, but you can install Semble on your phone as a progressive web app (PWA), which gives the best mobile experience for now. See our docs for the installation guide.',
  },
  {
    value: 'is-free',
    question: 'Is Semble free?',
    answer:
      "Yes, Semble is free to use today. We're big advocates of open source and open science, and we think knowledge tools like Semble should be as widely available as possible (think Wikipedia!). We also need Semble to be sustainable so we can keep improving it, so down the line we plan to add an optional paid tier with premium features. Either way, because your data lives on an open protocol, it stays yours. Even if Semble went away tomorrow, your library and connections wouldn't go with it.",
  },
];

export default function FAQ() {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (FAQS.some((faq) => faq.value === hash)) {
        setValue(hash);
      }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  return (
    <Accordion
      value={value}
      onChange={setValue}
      variant="separated"
      chevronPosition="right"
      disableChevronRotation
      radius="lg"
      w="100%"
      maw={560}
      styles={{
        item: {
          backgroundColor:
            'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-4))',
          border: 'none',
          marginTop: 'var(--mantine-spacing-xxs)',
        },
        control: { paddingBlock: 'var(--mantine-spacing-xxs)' },
        label: { fontWeight: 600 },
        chevron: { color: 'var(--mantine-color-tangerine-6)' },
      }}
    >
      {FAQS.map((faq) => (
        <Accordion.Item
          key={faq.value}
          value={faq.value}
          id={faq.value}
          style={{ scrollMarginTop: '1rem' }}
        >
          <Accordion.Control
            chevron={
              value === faq.value ? <FiMinus size={22} /> : <FiPlus size={22} />
            }
          >
            {faq.question}
          </Accordion.Control>
          <Accordion.Panel>
            <Text c="dimmed">{faq.answer}</Text>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
