'use client';

import { Image } from '@mantine/core';
import { useState } from 'react';

interface Props {
  src?: string;
}

export default function EmbedPreviewImage(props: Props) {
  const [hasError, setHasError] = useState(false);

  if (!props.src || hasError) return null;

  return (
    <Image
      src={props.src}
      alt=""
      loading="lazy"
      decoding="async"
      w="100%"
      h="100%"
      fit="cover"
      onError={() => setHasError(true)}
    />
  );
}
