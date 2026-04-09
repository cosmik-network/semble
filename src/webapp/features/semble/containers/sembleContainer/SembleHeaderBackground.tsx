import BG from '@/assets/semble-header-bg.webp';
import DarkBG from '@/assets/semble-header-bg-dark.webp';
import { Box, Image } from '@mantine/core';
import { ReactNode } from 'react';

interface Props {
  height?: number;
  children?: ReactNode;
}

export default function SembleHeaderBackground(props: Props) {
  const height = props.height ?? 60;

  return (
    <Box style={{ position: 'relative', width: '100%' }}>
      <Image
        src={DarkBG.src}
        alt="bg"
        fit="cover"
        w="100%"
        h={height}
        lightHidden
      />

      <Image src={BG.src} alt="bg" fit="cover" w="100%" h={height} darkHidden />

      {/* White gradient overlay */}
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%', // fade height
          background:
            'linear-gradient(to top, var(--mantine-color-body), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Content overlay */}
      {props.children && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {props.children}
        </Box>
      )}
    </Box>
  );
}
