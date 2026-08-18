import type { IconType } from 'react-icons/lib';
import { IoMdCode } from 'react-icons/io';
import { MdOutlineTag } from 'react-icons/md';
import {
  TbAffiliate,
  TbBuildingBank,
  TbDeviceGamepad2,
  TbFeather,
  TbFlask,
  TbLeaf,
  TbMovie,
  TbMusic,
  TbNetwork,
  TbNotebook,
  TbPalette,
  TbSparkles,
  TbStack2,
  TbTool,
  TbUsersGroup,
} from 'react-icons/tb';
import type { TopicId } from '../../lib/topics';

export const TOPIC_COLOR = 'tangerine';

/**
 * Kept out of `lib/topics.ts` so the registry stays free of React. Keyed by
 * TopicId, so adding a topic is a type error until it has an icon.
 */
export const TOPIC_ICONS: Record<TopicId, IconType> = {
  science: TbFlask,
  ai: TbSparkles,
  design: TbPalette,
  music: TbMusic,
  'social-networks': TbNetwork,
  film: TbMovie,
  writing: TbFeather,
  games: TbDeviceGamepad2,
  community: TbUsersGroup,
  nature: TbLeaf,
  'software-development': IoMdCode,
  politics: TbBuildingBank,
  curation: TbStack2,
  'note-taking': TbNotebook,
  'product-building': TbTool,
  atproto: TbAffiliate,
};

export const CUSTOM_TOPIC_ICON = MdOutlineTag;
