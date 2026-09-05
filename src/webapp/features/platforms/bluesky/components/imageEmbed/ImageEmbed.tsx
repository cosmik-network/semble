'use client';

import { AppBskyEmbedImages } from '@atproto/api';
import { Box, Image, UnstyledButton } from '@mantine/core';
import { Lightbox } from '@mantine/lightbox';
import { useState } from 'react';
import AltTextCaption from './AltTextCaption';
import styles from './ImageEmbed.module.css';

interface Props {
  images: AppBskyEmbedImages.ViewImage[];
}

interface DotsProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}

function Dots(props: DotsProps) {
  return (
    <Box className={styles.dots}>
      {Array.from({ length: props.count }, (_, i) => (
        <UnstyledButton
          key={i}
          className={styles.dot}
          aria-label={`Go to image ${i + 1} of ${props.count}`}
          data-active={i === props.activeIndex || undefined}
          onClick={() => props.onSelect(i)}
        />
      ))}
    </Box>
  );
}

export default function ImageEmbed(props: Props) {
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = props.images.slice(0, 4);
  const slides = images.map((img) => ({
    src: img.fullsize,
    alt: img.alt,
    caption: img.alt || undefined,
  }));
  const currentCaption = slides[lightboxIndex]?.caption;
  const single = images.length === 1;
  const aspect = single ? images[0].aspectRatio : undefined;
  const ratio = aspect ? aspect.width / aspect.height : undefined;

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
              className={styles.tile}
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
                fit={single ? 'contain' : 'cover'}
              />
            </UnstyledButton>
          ))}
        </Box>
      </Box>
      {/* Lightbox is portaled, but React events still bubble to the card's onClick. */}
      <div onClick={(e) => e.stopPropagation()}>
        <Lightbox
          opened={lightboxOpened}
          onClose={() => setLightboxOpened(false)}
          slides={slides}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
        >
          <Lightbox.Toolbar />
          <Lightbox.Slides>
            {slides.map((slide, i) => (
              <Lightbox.Slide
                key={i}
                slide={slide}
                index={i}
                onClick={() => setLightboxOpened(false)}
              />
            ))}
          </Lightbox.Slides>
          {slides.length > 1 && (
            <>
              <Lightbox.Navigation />
              <Dots
                count={slides.length}
                activeIndex={lightboxIndex}
                onSelect={setLightboxIndex}
              />
            </>
          )}
          {currentCaption && (
            <Lightbox.Caption>
              <AltTextCaption key={lightboxIndex} text={currentCaption} />
            </Lightbox.Caption>
          )}
        </Lightbox>
      </div>
    </>
  );
}
