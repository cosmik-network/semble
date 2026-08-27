import { Paper } from '@mantine/core';
import FeedControls from './FeedControls';

const MASK_IMAGE =
  'linear-gradient(to bottom, black 0%, black calc(100% - 50px), rgba(0,0,0,0.5) calc(100% - 25px), transparent 100%), linear-gradient(to right, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%)';

export default function FeedControlsBar() {
  return (
    <Paper
      pos={'sticky'}
      top={55}
      style={{
        zIndex: 1,
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        background:
          'color-mix(in srgb, var(--mantine-color-body) 100%, transparent)',
        maskImage: MASK_IMAGE,
        maskComposite: 'intersect',
        WebkitMaskImage: MASK_IMAGE,
        WebkitMaskComposite: 'destination-in',
      }}
      maw={620}
      p={'xs'}
      pb={50}
      radius={0}
      mx={'auto'}
    >
      <FeedControls />
    </Paper>
  );
}
