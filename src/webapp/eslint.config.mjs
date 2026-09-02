import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  {
    extends: [...nextCoreWebVitals],
  },
  {
    // OG images render through next/og's ImageResponse (satori), which only
    // understands plain <img> — next/image cannot run there.
    files: [
      'app/api/opengraph/**',
      'app/**/opengraph-image.tsx',
      'features/openGraph/**',
    ],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
]);
