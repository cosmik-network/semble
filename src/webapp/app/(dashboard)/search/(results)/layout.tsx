import { FaRegNoteSticky } from 'react-icons/fa6';
import { Tabs, TabsList, TabsTab } from '@mantine/core';
import type { Metadata } from 'next';
import { Fragment } from 'react';
import Header from '@/components/navigation/header/Header';
import BackButton from '@/components/navigation/backButton/BackButton';
import { BsPerson } from 'react-icons/bs';

export const metadata: Metadata = {
  title: 'Search results',
  description: 'Search results',
};

interface Props {
  children: React.ReactNode;
}

export default function Layout(props: Props) {
  return (
    <Fragment>
      <Header title="Search results">
        <BackButton href="/search">Search</BackButton>
      </Header>
      <Tabs defaultValue={'cards'}>
        <TabsList>
          <TabsTab value="cards" leftSection={<FaRegNoteSticky />}>
            Cards
          </TabsTab>
          <TabsTab value="people" leftSection={<BsPerson />}>
            People
          </TabsTab>
        </TabsList>
      </Tabs>
      {props.children}
    </Fragment>
  );
}
