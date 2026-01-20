import { useState, useEffect } from 'react';
import { Title, Text, Transition, Box } from '@mantine/core';

const words = ['creators', 'writers', 'designers', 'thinkers', 'researchers'];

export default function AnimatedTitle() {
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(true);
  const CHANGE_EVERY_MS = 3000;

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
    <Title order={1} fw={600} fz="3rem">
      A social knowledge network for{' '}
      <Box
        component="span"
        style={{
          display: 'inline-block',
          minWidth: '250px',
          textAlign: 'left',
        }}
      >
        <Transition
          mounted={opened}
          transition="slide-up"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <Text
              fw={600}
              fz="3rem"
              style={{
                ...styles,
              }}
              c={'grape'}
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
