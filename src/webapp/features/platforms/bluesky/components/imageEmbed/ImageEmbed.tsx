'use client';

import { AppBskyEmbedImages } from '@atproto/api';
import { Box, Image, UnstyledButton } from '@mantine/core';
import { Lightbox } from '@mantine/lightbox';
import { useState } from 'react';
import styles from './ImageEmbed.module.css';

interface Props {
  images: AppBskyEmbedImages.ViewImage[];
}

export default function ImageEmbed(props: Props) {
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = props.images.slice(0, 4);
  const single = images.length === 1 ? images[0].aspectRatio : undefined;
  const ratio = single ? single.width / single.height : undefined;

  const openLightbox = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setLightboxIndex(index);
    setLightboxOpened(true);
  };

  return (
    <>
      <Box className={styles.frame} w="100%">
        <Box
          className={styles.gallery}
          data-layout={images.length}
          w="100%"
          bdrs="md"
          style={{ overflow: 'hidden', '--gallery-ratio': ratio }}
        >
          {images.map((img, i) => (
            <UnstyledButton
              key={i}
              pos="relative"
              miw={0}
              mih={0}
              bg="var(--mantine-color-default-hover)"
              aria-label={img.alt || 'Open image'}
              onClick={(e) => openLightbox(e, i)}
            >
              <Image
                src={img.thumb}
                alt={img.alt}
                pos="absolute"
                inset={0}
                w="100%"
                h="100%"
                fit="cover"
              />
            </UnstyledButton>
          ))}
        </Box>
      </Box>
      {/* The lightbox portals out of the DOM tree but React events still bubble
          to this component's ancestors, so stop them reaching the card's onClick. */}
      <div onClick={(e) => e.stopPropagation()}>
        <Lightbox
          opened={lightboxOpened}
          onClose={() => setLightboxOpened(false)}
          slides={images.map((img) => ({ src: img.fullsize, alt: img.alt }))}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
        />
      </div>
    </>
  );
}
