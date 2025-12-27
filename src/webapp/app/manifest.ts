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
        src: '/semble-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/semble-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/semble-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    share_target: {
      action: '/home',
      method: 'GET',
      params: {
        url: 'addUrl',
      },
    },
  };
}
