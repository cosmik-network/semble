import { Image } from '@mantine/core';
import { FaBluesky } from 'react-icons/fa6';
import BlackskyLogo from '@/assets/icons/blacksky-logo.svg';
import BlackskyLogoWhite from '@/assets/icons/blacksky-logo-white.svg';
import { SupportedPlatform } from '@/lib/utils/link';

interface Props {
  platform: SupportedPlatform;
  size?: number;
}

export default function BlueskyPlatformIcon({ platform, size = 18 }: Props) {
  if (platform === SupportedPlatform.BLUESKY_POST) {
    return <FaBluesky fill="#0085ff" size={size} />;
  }

  if (platform !== SupportedPlatform.BLACKSKY_POST) {
    return null;
  }

  return (
    <>
      <Image
        src={BlackskyLogo.src}
        alt="Blacksky logo"
        w={size}
        h={'auto'}
        darkHidden
      />
      <Image
        src={BlackskyLogoWhite.src}
        alt="Blacksky logo"
        w={size}
        h={'auto'}
        lightHidden
      />
    </>
  );
}
