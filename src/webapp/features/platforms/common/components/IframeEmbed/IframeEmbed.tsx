import { getDomain } from '@/lib/utils/link';
import {
  Anchor,
  Text,
  Card,
  Stack,
  Tooltip,
  AspectRatio,
  MantineRadius,
} from '@mantine/core';
import { UrlCard } from '@semble/types';

import { Fragment } from 'react';
import { EmbedSource } from '@/features/platforms/common/lib/externalEmbeds';
import ExternalEmbedGate from '../externalEmbedGate/ExternalEmbedGate';
import EmbedPreviewImage from '../embedPreviewImage/EmbedPreviewImage';

interface IframeEmbedProps {
  url: string;
  source: EmbedSource;
  cardContent: UrlCard['cardContent'];
  height?: number | string;
  aspectRatio?: number;
  radius?: MantineRadius;
}

export default function IframeEmbed(props: IframeEmbedProps) {
  const domain = getDomain(props.url);
  const height = props.height ?? 200;

  const iframeElement = (
    <Card p={0} radius={props.radius ?? 'md'}>
      <ExternalEmbedGate
        source={props.source}
        sourceUrl={props.cardContent.url}
        preview={<EmbedPreviewImage src={props.cardContent.imageUrl} />}
        height={props.aspectRatio ? '100%' : height}
      >
        <iframe
          src={props.url}
          height={props.aspectRatio ? '100%' : height}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 0 }}
        />
      </ExternalEmbedGate>
    </Card>
  );

  return (
    <Fragment>
      <Stack gap={0} flex={1}>
        <Tooltip label={props.cardContent.url}>
          <Anchor
            onClick={(e) => e.stopPropagation()}
            href={props.cardContent.url}
            target="_blank"
            c={'gray'}
            fz={'sm'}
            lineClamp={1}
            w={'fit-content'}
          >
            {domain}
          </Anchor>
        </Tooltip>
        {props.cardContent.title && (
          <Text c={'bright'} lineClamp={2} fw={500}>
            {props.cardContent.title}
          </Text>
        )}
      </Stack>

      {props.aspectRatio ? (
        <AspectRatio ratio={props.aspectRatio}>{iframeElement}</AspectRatio>
      ) : (
        iframeElement
      )}
    </Fragment>
  );
}
