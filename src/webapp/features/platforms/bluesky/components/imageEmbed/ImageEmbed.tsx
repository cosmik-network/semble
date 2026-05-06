'use client';

import { AppBskyEmbedImages } from '@atproto/api';
import { Lightbox } from '@mantine-bites/lightbox';
import { AspectRatio, SimpleGrid, Image, Spoiler, Button } from '@mantine/core';
import { useState } from 'react';
import styles from './ImageEmbed.module.css';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  images: AppBskyEmbedImages.ViewImage[];
}

export default function ImageEmbed(props: Props) {
  const { settings } = useUserSettings();
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [initialSlide, setInitialSlide] = useState(0);

  const lightboxImages = props.images.map((img) => ({
    src: img.fullsize,
    alt: img.alt,
  }));

  const openLightbox = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setInitialSlide(index);
    setLightboxOpened(true);
  };

  const lightbox = (
    <div onClick={(e) => e.stopPropagation()}>
      <Lightbox.Root
        opened={lightboxOpened}
        onClose={() => setLightboxOpened(false)}
        initialSlide={initialSlide}
      >
        <Lightbox.Toolbar>
          <Lightbox.CloseButton />
        </Lightbox.Toolbar>
        <Lightbox.Controls />
        <Lightbox.Counter />
        <Lightbox.Slides>
          {lightboxImages.map((img) => (
            <Lightbox.Slide key={img.src}>
              <img src={img.src} alt={img.alt} />
            </Lightbox.Slide>
          ))}
        </Lightbox.Slides>
      </Lightbox.Root>
    </div>
  );

  if (settings.cardView === 'grid') {
    if (props.images.length === 3) {
      return (
        <>
          <SimpleGrid cols={2} spacing="xs">
            <AspectRatio
              ratio={
                props.images[0]?.aspectRatio
                  ? props.images[0].aspectRatio.width /
                    props.images[0].aspectRatio.height
                  : 1 / 1
              }
            >
              <Image
                src={props.images[0].thumb}
                alt={props.images[0].alt}
                radius="sm"
                h={'100%'}
                w={'100%'}
                mah={160}
                style={{ cursor: 'pointer' }}
                onClick={(e) => openLightbox(e, 0)}
              />
            </AspectRatio>
            <SimpleGrid cols={1} spacing="xs">
              {props.images.slice(1).map((img, i) => {
                const ratio = img?.aspectRatio
                  ? img.aspectRatio.width / img.aspectRatio.height
                  : 1 / 1;

                return (
                  <AspectRatio ratio={ratio} key={i + 1}>
                    <Image
                      src={img.thumb}
                      alt={img.alt}
                      radius="sm"
                      h={'100%'}
                      w={'100%'}
                      mah={75}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => openLightbox(e, i + 1)}
                    />
                  </AspectRatio>
                );
              })}
            </SimpleGrid>
          </SimpleGrid>
          {lightbox}
        </>
      );
    }

    return (
      <>
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
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => openLightbox(e, i)}
                />
              </AspectRatio>
            );
          })}
        </SimpleGrid>
        {lightbox}
      </>
    );
  }

  return (
    <>
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
        {props.images.length === 3 ? (
          <SimpleGrid cols={2} spacing="xs">
            <AspectRatio
              ratio={
                props.images[0]?.aspectRatio
                  ? props.images[0].aspectRatio.width /
                    props.images[0].aspectRatio.height
                  : 1 / 1
              }
            >
              <Image
                src={props.images[0].thumb}
                alt={props.images[0].alt}
                radius="sm"
                h={'100%'}
                w={'100%'}
                style={{ cursor: 'pointer' }}
                onClick={(e) => openLightbox(e, 0)}
              />
            </AspectRatio>
            <SimpleGrid cols={1} spacing="xs">
              {props.images.slice(1).map((img, i) => {
                const ratio = img?.aspectRatio
                  ? img.aspectRatio.width / img.aspectRatio.height
                  : 1 / 1;

                return (
                  <AspectRatio ratio={ratio} key={i + 1}>
                    <Image
                      src={img.thumb}
                      alt={img.alt}
                      radius="sm"
                      h={'100%'}
                      w={'100%'}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => openLightbox(e, i + 1)}
                    />
                  </AspectRatio>
                );
              })}
            </SimpleGrid>
          </SimpleGrid>
        ) : (
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
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => openLightbox(e, i)}
                  />
                </AspectRatio>
              );
            })}
          </SimpleGrid>
        )}
      </Spoiler>
      {lightbox}
    </>
  );
}
