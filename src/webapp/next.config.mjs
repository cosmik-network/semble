import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['jsdom', '@mozilla/readability', 'dompurify'],
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    optimizePackageImports: [
      '@mantine/core',
      '@mantine/hooks',
      'react-icons',
      'react-icons/md',
      'react-icons/fi',
      'react-icons/fa6',
      'react-icons/bi',
      'react-icons/lu',
      'react-icons/tb',
      'react-icons/io5',
    ],
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

// Merge MDX config with Next.js config
export default withMDX(nextConfig);
