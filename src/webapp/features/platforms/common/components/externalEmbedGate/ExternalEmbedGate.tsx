'use client';

import { Box, Group, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { useMounted } from '@mantine/hooks';
import { usePathname } from 'next/navigation';
import { FaPlay } from 'react-icons/fa6';
import { useSettings } from '@/providers/settings';
import {
  EMBED_SOURCES,
  EmbedSource,
} from '@/features/platforms/common/lib/externalEmbeds';
import EmbedConsentModal from '../embedConsentModal/EmbedConsentModal';

interface Props {
  source: EmbedSource;
  /** Rendered behind the play button, filling the box. */
  preview?: React.ReactNode;
  /** Preview height when the caller doesn't size the box itself (e.g. AspectRatio). */
  height?: number | string;
  /** Opened instead of asking when rendered inside a third-party embed. */
  sourceUrl?: string;
  children: React.ReactNode;
}

export default function ExternalEmbedGate(props: Props) {
  const { settings, updateSetting, isHydrated } = useSettings();
  const [allowedOnce, setAllowedOnce] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mounted = useMounted();
  const pathname = usePathname();
  // Inside a third-party iframe the modal is cramped and storage is
  // partitioned, so the preview links out instead of asking.
  const isThirdPartyEmbed =
    pathname.startsWith('/embed/') || pathname.startsWith('/page-parts-embed/');

  // `mounted` holds the server's preview for the first render of a streamed
  // boundary, which hydrates after the provider has already read storage.
  const isAllowed =
    allowedOnce ||
    (!isThirdPartyEmbed &&
      mounted &&
      isHydrated &&
      settings.externalEmbeds[props.source]);

  if (isAllowed) return props.children;

  const { label, icon: SourceIcon } = EMBED_SOURCES[props.source];
  const linksOut = isThirdPartyEmbed && !!props.sourceUrl;

  return (
    <>
      <UnstyledButton
        {...(linksOut
          ? {
              component: 'a' as const,
              href: props.sourceUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              'aria-label': `Open on ${label}`,
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
            }
          : {
              'aria-label': `Load ${label} embed`,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                setIsModalOpen(true);
              },
            })}
        w="100%"
        h={props.height ?? '100%'}
        pos="relative"
        display="block"
        bg="var(--mantine-color-default-hover)"
        style={{ overflow: 'hidden' }}
      >
        <Box pos="absolute" inset={0}>
          {props.preview}
        </Box>
        <Box
          pos="absolute"
          inset={0}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          <ThemeIcon size={48} radius="xl" color="dark" variant="filled">
            <FaPlay size={18} />
          </ThemeIcon>
        </Box>
        <Group
          gap={6}
          pos="absolute"
          bottom={8}
          left={8}
          px={8}
          py={2}
          wrap="nowrap"
          style={{
            borderRadius: 'var(--mantine-radius-xl)',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
          }}
        >
          <SourceIcon size={12} />
          <Text fz="xs" fw={500} c="white">
            {label}
          </Text>
        </Group>
      </UnstyledButton>
      <EmbedConsentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source={props.source}
        onAllowOnce={() => {
          setAllowedOnce(true);
          setIsModalOpen(false);
        }}
        onAllowAlways={() => {
          updateSetting('externalEmbeds', {
            ...settings.externalEmbeds,
            [props.source]: true,
          });
          setAllowedOnce(true);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
