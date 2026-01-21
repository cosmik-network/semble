import {
  Box,
  Container,
  Group,
  ScrollAreaAutosize,
  Stack,
  Tabs,
  TabsList,
  TabsPanel,
} from '@mantine/core';
import CardSearchResultsContainer from '../cardSearchResultsContainer/CardSearchResultsContainer';
import ProfileSearchResultsContainer from '../profileSearchResultsContainer/ProfileSearchResultsContainer';
import SearchBar from '../../components/searchBar/SearchBar';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import CollectionSearchResultsContainer from '../collectionSearchResultsContainer/CollectionSearchResultsContainer';
import CollectionSearchResultsContainerSkeleton from '../collectionSearchResultsContainer/Skeleton.CollectionSearchResultsContainer';
import CardSearchResultsContainerSkeleton from '../cardSearchResultsContainer/Skeleton.CardSearchresultsContainerSkeleton';
import ProfileSearchResultsContainerSkeleton from '../profileSearchResultsContainer/Skeleton.ProfileSearchResultsContainer';
import SearchTabItem from '../../components/searchTabItem/SearchTabItem';
import { Suspense } from 'react';
import { UrlType } from '@semble/types';

interface Props {
  query: string;
  handle?: string;
  urlType?: UrlType;
}

export default function SearchResultsContainer(props: Props) {
  return (
    <Container p={'xs'} pt={0} size={'sm'}>
      <Tabs defaultValue={'cards'} keepMounted={false}>
        <Box
          style={{
            position: 'sticky',
            top: 55,
            zIndex: 1,
          }}
          pt={'xs'}
          bg={'var(--mantine-color-body'}
        >
          <Stack gap={'xs'}>
            <SearchBar variant="compact" query={props.query} />

            <ScrollAreaAutosize type="scroll">
              <TabsList>
                <Group gap={0} wrap="nowrap">
                  <SearchTabItem
                    value="cards"
                    label="Cards"
                    icon={<FaRegNoteSticky />}
                  />

                  <SearchTabItem
                    value="collections"
                    label="Collections"
                    icon={<BiCollection />}
                  />

                  <SearchTabItem
                    value="profiles"
                    label="Profiles"
                    icon={<MdOutlinePeopleAlt />}
                  />
                </Group>
              </TabsList>
            </ScrollAreaAutosize>
          </Stack>
        </Box>

        <TabsPanel value="cards">
          <Container py="xs" px={0} size="xl">
            <Suspense
              fallback={<CardSearchResultsContainerSkeleton />}
              key={props.query}
            >
              <CardSearchResultsContainer
                query={props.query}
                handle={props.handle}
                urlType={props.urlType}
              />
            </Suspense>
          </Container>
        </TabsPanel>
        <TabsPanel value="collections">
          <Container py={'xs'} px={0} size={'xl'}>
            <Suspense
              fallback={<CollectionSearchResultsContainerSkeleton />}
              key={props.query}
            >
              <CollectionSearchResultsContainer query={props.query} />
            </Suspense>
          </Container>
        </TabsPanel>
        <TabsPanel value="profiles">
          <Container py={'xs'} px={0} size={'xl'}>
            <Suspense
              fallback={<ProfileSearchResultsContainerSkeleton />}
              key={props.query}
            >
              <ProfileSearchResultsContainer query={props.query} />
            </Suspense>
          </Container>
        </TabsPanel>
      </Tabs>
    </Container>
  );
}
