import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import SearchBar from '@/features/search/components/searchBar/SearchBar';
import SearchTabItem from '@/features/search/components/searchTabItem/SearchTabItem';
import SearchTabs from '@/features/search/components/searchTabs/SearchTabs';
import {
  Box,
  Container,
  Group,
  ScrollAreaAutosize,
  Stack,
  Tabs,
  TabsList,
} from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { MdOutlinePeopleAlt } from 'react-icons/md';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for cards, collections, and more',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Container p={'xs'} pt={0} size={'sm'}>
        <SearchTabs />
        <Container py={'xs'} px={0} size={'xl'}>
          {props.children}
        </Container>
      </Container>
    </Fragment>
  );
}
