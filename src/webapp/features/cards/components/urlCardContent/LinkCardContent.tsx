'use client';

import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { getDomain } from '@/lib/utils/link';
import {
  Anchor,
  Group,
  Stack,
  Text,
  Tooltip,
  AspectRatio,
  Image,
  Card,
} from '@mantine/core';
import { UrlCard } from '@semble/types';

import { useState } from 'react';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';

interface Props {
  cardContent: UrlCard['cardContent'];
  uri?: string;
  authorHandle?: string;
  /**
   * Renders the domain as plain text instead of a link, for places where the
   * card itself is the control — onboarding's card picker.
   */
  staticDomain?: boolean;
}

export default function LinkCardContent(props: Props) {
  const domain = getDomain(props.cardContent.url);
  const [imageError, setImageError] = useState(false);
  const { settings } = useUserSettings();
  const marginUrl = getMarginUrl(props.uri, props.authorHandle);

  return (
    <Group justify="space-between" align="start" gap={'lg'}>
      <Stack gap={0} flex={1}>
        <Group gap={4}>
          {props.staticDomain ? (
            // No Tooltip either: it reveals the full URL before you follow it,
            // and there is nothing to follow here.
            <Text c={'gray'} lineClamp={1} w={'fit-content'} fz={'sm'}>
              {domain}
            </Text>
          ) : (
            <Tooltip label={props.cardContent.url}>
              <Anchor
                onClick={(e) => e.stopPropagation()}
                href={props.cardContent.url}
                target="_blank"
                c={'gray'}
                lineClamp={1}
                w={'fit-content'}
                fz={'sm'}
              >
                {domain}
              </Anchor>
            </Tooltip>
          )}
          {isMarginUri(props.uri) && (
            <MarginLogo size={12} marginUrl={marginUrl} />
          )}
        </Group>
        {props.cardContent.title && (
          <Text c={'bright'} lineClamp={2} fw={500}>
            {props.cardContent.title}
          </Text>
        )}
        {props.cardContent.description && settings.cardView === 'grid' && (
          <Text c={'gray'} fz={'sm'} mt={'xs'} lineClamp={3}>
            {props.cardContent.description}
          </Text>
        )}
      </Stack>
      {props.cardContent.imageUrl && !imageError && (
        <AspectRatio ratio={1 / 1}>
          <Card
            p={0}
            radius={'md'}
            withBorder
            w={settings.cardView === 'grid' ? 75 : 45}
            h={settings.cardView === 'grid' ? 75 : 45}
            style={{ flexShrink: 0 }}
          >
            <Image
              src={props.cardContent.imageUrl}
              alt={`${props.cardContent.url} social preview image`}
              w={'100%'}
              h={'100%'}
              fit="cover"
              onError={() => setImageError(true)}
            />
          </Card>
        </AspectRatio>
      )}
    </Group>
  );
}
