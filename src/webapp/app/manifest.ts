import type { MetadataRoute } from 'next';
import { theme } from '@/styles/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Semble',
    short_name: 'Semble',
    description: 'A social knowledge network for researchers',
    start_url: '/home',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: theme.colors?.orange?.[6],
    icons: [
      {
        src: '/assets/semble-icon-192x192.png',
        sizes: '192x192',
        type: 'image/x-icon',
      },
      {
        src: '/assets/semble-icon-512x512.png',
        sizes: '512x512',
        type: 'image/x-icon',
      },
    ],
  };
}
