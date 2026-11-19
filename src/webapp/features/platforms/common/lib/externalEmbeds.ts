import type { IconType } from 'react-icons/lib';
import {
  FaBandcamp,
  FaMusic,
  FaSoundcloud,
  FaSpotify,
  FaYoutube,
} from 'react-icons/fa6';
import { SupportedPlatform } from '@/lib/utils/link';

export type EmbedSource =
  | 'youtube'
  | 'spotify'
  | 'soundcloud'
  | 'bandcamp'
  | 'plyrfm';

export const EMBED_SOURCES: Record<
  EmbedSource,
  { label: string; icon: IconType }
> = {
  youtube: { label: 'YouTube', icon: FaYoutube },
  spotify: { label: 'Spotify', icon: FaSpotify },
  soundcloud: { label: 'SoundCloud', icon: FaSoundcloud },
  bandcamp: { label: 'Bandcamp', icon: FaBandcamp },
  plyrfm: { label: 'plyr.fm', icon: FaMusic },
};

export function getEmbedSource(type: SupportedPlatform): EmbedSource | null {
  switch (type) {
    case SupportedPlatform.YOUTUBE_VIDEO:
      return 'youtube';
    case SupportedPlatform.SPOTIFY:
      return 'spotify';
    case SupportedPlatform.SOUNDCLOUD_TRACK:
    case SupportedPlatform.SOUNDCLOUD_SET:
      return 'soundcloud';
    case SupportedPlatform.BANDCAMP_ALBUM:
    case SupportedPlatform.BANDCAMP_TRACK:
      return 'bandcamp';
    case SupportedPlatform.PLYRFM_TRACK:
      return 'plyrfm';
    default:
      return null;
  }
}
