import type { IconType } from 'react-icons/lib';
import { IoMdCode } from 'react-icons/io';
import { MdOutlineTag } from 'react-icons/md';
import {
  TbAffiliate,
  TbBrain,
  TbBuildingBank,
  TbChartLine,
  TbFeather,
  TbFlask,
  TbLeaf,
  TbMusic,
  TbNetwork,
  TbNotebook,
  TbSparkles,
  TbStack2,
  TbTool,
  TbUsersGroup,
} from 'react-icons/tb';
import type { TopicId } from '../../lib/topics';

/** One accent for every tile. Swap this one value to change the whole grid. */
export const TOPIC_COLOR = 'tangerine';

/**
 * Kept out of `lib/topics.ts` so the registry stays free of React. A Record
 * keyed by TopicId rather than a lookup with a fallback: adding a topic id is a
 * type error until it has an icon.
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
  pkm: TbBrain,
  politics: TbBuildingBank,
  curation: TbStack2,
  'product-building': TbTool,
  business: TbChartLine,
  nature: TbLeaf,
};

/** Custom topics have no authored icon, so they all wear the generic tag. */
export const CUSTOM_TOPIC_ICON = MdOutlineTag;
