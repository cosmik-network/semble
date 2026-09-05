'use client';

import { Stack, Text, UnstyledButton } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import styles from './ImageEmbed.module.css';

interface Props {
  text: string;
}

const COLLAPSED_LINES = 2;

export default function AltTextCaption(props: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Only measure while collapsed; once expanded the control must stay visible.
  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  const showControl = overflows || expanded;
  const toggle = () => setExpanded((value) => !value);

  return (
    <Stack gap="xxs" align="flex-start">
      <Text
        ref={textRef}
        className={styles.altText}
        data-clickable={showControl || undefined}
        data-expanded={expanded || undefined}
        lineClamp={expanded ? undefined : COLLAPSED_LINES}
        onClick={showControl ? toggle : undefined}
      >
        {props.text}
      </Text>
      {showControl && (
        <UnstyledButton
          className={styles.altTextControl}
          aria-expanded={expanded}
          onClick={toggle}
        >
          {expanded ? 'Show less' : 'Show more'}
        </UnstyledButton>
      )}
    </Stack>
  );
}
