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
  content?: string;
}

export default function SearchResultsContainer(props: Props) {
  const activeTab = props.content || 'cards';

  // build search params for each tab
  const buildTabHref = (tabValue: string) => {
    const params = new URLSearchParams();
    if (props.query) params.set('query', props.query);
    if (props.handle) params.set('handle', props.handle);
    if (props.urlType) params.set('urlType', props.urlType);

    const route = tabValue === 'cards' ? '/search' : `/search/${tabValue}`;
    const queryString = params.toString();
    return queryString ? `${route}?${queryString}` : route;
  };

  return (
    <Container p={'xs'} pt={0} size={'sm'}>
      <Tabs value={activeTab}>
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
                    href={buildTabHref('cards')}
                  />

                  <SearchTabItem
                    value="collections"
                    label="Collections"
                    icon={<BiCollection />}
                    href={buildTabHref('collections')}
                  />

                  <SearchTabItem
                    value="profiles"
                    label="Profiles"
                    icon={<MdOutlinePeopleAlt />}
                    href={buildTabHref('profiles')}
                  />
                </Group>
              </TabsList>
            </ScrollAreaAutosize>
          </Stack>
        </Box>

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
