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
  'software-development': IoMdCode,
  community: TbUsersGroup,
  atproto: TbAffiliate,
  'social-networks': TbNetwork,
  music: TbMusic,
  writing: TbFeather,
  'note-taking': TbNotebook,
  politics: TbBuildingBank,
  curation: TbStack2,
  'product-building': TbTool,
  design: TbPalette,
  film: TbMovie,
  games: TbDeviceGamepad2,
  nature: TbLeaf,
};

export const CUSTOM_TOPIC_ICON = MdOutlineTag;
