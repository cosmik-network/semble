'use client';

import { AppBskyEmbedImages } from '@atproto/api';
import {
  AspectRatio,
  SimpleGrid,
  Image,
  Anchor,
  Spoiler,
  Button,
} from '@mantine/core';
import styles from './ImageEmbed.module.css';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  images: AppBskyEmbedImages.ViewImage[];
}

export default function ImageEmbed(props: Props) {
  const { settings } = useUserSettings();

  if (settings.cardView === 'grid') {
    return (
      <SimpleGrid cols={props.images.length > 1 ? 2 : 1} spacing="xs">
        {props.images.map((img, i) => {
          const ratio =
            props.images.length === 1
              ? img?.aspectRatio
                ? img.aspectRatio.width / img.aspectRatio.height
                : 16 / 9
              : img?.aspectRatio
                ? img.aspectRatio.width / img.aspectRatio.height
                : 1 / 1;

          return (
            <AspectRatio ratio={ratio} key={i}>
              <Image
                src={img.thumb}
                alt={img.alt}
                radius="sm"
                h={'100%'}
                w={'100%'}
                mah={props.images.length === 1 ? 200 : 150}
              />
            </AspectRatio>
          );
        })}
      </SimpleGrid>
    );
  }

  return (
    <Spoiler
      classNames={styles}
      showLabel={
        <Button
          component="span"
          size="xs"
          variant="light"
          color="gray"
          radius={'sm'}
          fullWidth
        >
          Expand image
        </Button>
      }
      hideLabel={
        <Button
          component="span"
          size="xs"
          variant="light"
          color="gray"
          radius={'sm'}
          fullWidth
        >
          Collape image
        </Button>
      }
      maxHeight={280}
    >
      <SimpleGrid cols={props.images.length > 1 ? 2 : 1} spacing="xs">
        {props.images.map((img, i) => {
          const ratio =
            props.images.length === 1
              ? img?.aspectRatio
                ? img.aspectRatio.width / img.aspectRatio.height
                : 16 / 9
              : img?.aspectRatio
                ? img.aspectRatio.width / img.aspectRatio.height
                : 1 / 1;

          return (
            <AspectRatio ratio={ratio} key={i}>
              <Anchor href={img.fullsize} target="_blank">
                <Image
                  src={img.thumb}
                  alt={img.alt}
                  radius="sm"
                  h={'100%'}
                  w={'100%'}
                />
              </Anchor>
            </AspectRatio>
          );
        })}
      </SimpleGrid>
    </Spoiler>
  );
}
