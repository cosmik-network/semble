'use client';

import { useState, useEffect } from 'react';
import { Title, Text, Transition, Box } from '@mantine/core';

const words = [
  'creators',
  'thinkers',
  'researchers',
  'learners',
  'writers',
  'you',
];

export default function AnimatedTitle() {
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(true);
  const CHANGE_EVERY_MS = 2600;

  useEffect(() => {
    const interval = setInterval(() => {
      // start exit animation
      setOpened(false);

      // wait for exit animation to finish to swap words
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setOpened(true);
      }, 400);
    }, CHANGE_EVERY_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <Title order={1} fw={700} fz="2.6rem" ta={'center'}>
      A social knowledge network for{' '}
      <Box
        component="span"
        style={{
          display: 'inline-block',
          minWidth: '250px',
          textAlign: 'center',
        }}
      >
        <Transition
          mounted={opened}
          transition="fade"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <Text
              fw={700}
              fz="2.6rem"
              style={{
                ...styles,
              }}
              ta={'center'}
              span
            >
              {words[index]}
            </Text>
          )}
        </Transition>
      </Box>
    </Title>
  );
}
