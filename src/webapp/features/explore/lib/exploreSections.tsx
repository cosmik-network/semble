import { ReactNode } from 'react';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { HiOutlineUsers } from 'react-icons/hi';
import { EXPLORE_ROUTES } from './exploreRoutes';

export type ExploreSection = keyof typeof EXPLORE_SECTIONS;

interface Section {
  icon: ReactNode;
  title: string;
  subtitle: string;
  viewAllHref: string;
}

export const EXPLORE_SECTIONS = {
  cards: {
    icon: <FaRegNoteSticky size={22} />,
    title: 'Cards',
    subtitle: 'Recommended for you',
    viewAllHref: EXPLORE_ROUTES.cards,
  },
  collections: {
    icon: <BiCollection size={22} />,
    title: 'Collections',
    subtitle: 'Recommended for you',
    viewAllHref: EXPLORE_ROUTES.collections,
  },
  profiles: {
    icon: <HiOutlineUsers size={22} />,
    title: 'Profiles',
    subtitle: 'People you might want to follow',
    viewAllHref: EXPLORE_ROUTES.profiles,
  },
} satisfies Record<string, Section>;
