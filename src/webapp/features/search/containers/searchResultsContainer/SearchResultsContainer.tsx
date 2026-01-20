import {
  Box,
  Container,
  Group,
  ScrollAreaAutosize,
  Stack,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Text,
} from '@mantine/core';
import CardSearchResultsContainer from '../cardSearchResultsContainer/CardSearchResultsContainer';
import ProfileSearchResultsContainer from '../profileSearchResultsContainer/ProfileSearchResultsContainer';
import SearchBar from '../../components/searchBar/SearchBar';
import { BiCollection } from 'react-icons/bi';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { MdOutlinePeopleAlt } from 'react-icons/md';
import CollectionSearchResultsContainer from '../collectionSearchResultsContainer/CollectionSearchResultsContainer';

interface Props {
  query: string;
}

export default function SearchResultsContainer(props: Props) {
  return (
    <Container p={'xs'} pt={0} size={'sm'}>
      <Tabs defaultValue={'cards'}>
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
                  <TabsTab value="cards" leftSection={<FaRegNoteSticky />}>
                    Cards
                  </TabsTab>
                  <TabsTab value="collections" leftSection={<BiCollection />}>
                    Collections
                  </TabsTab>
                  <TabsTab
                    value="profiles"
                    leftSection={<MdOutlinePeopleAlt />}
                  >
                    Profiles
                  </TabsTab>
                </Group>
              </TabsList>
            </ScrollAreaAutosize>
          </Stack>
        </Box>

        <TabsPanel value="cards">
          <Container py="xs" px={0} size="xl">
            <CardSearchResultsContainer query={props.query} />
          </Container>
        </TabsPanel>
        <TabsPanel value="collections">
          <Container py={'xs'} px={0} size={'xl'}>
            <CollectionSearchResultsContainer query={props.query} />
          </Container>
        </TabsPanel>
        <TabsPanel value="profiles">
          <Container py={'xs'} px={0} size={'xl'}>
            <ProfileSearchResultsContainer query={props.query} />
          </Container>
        </TabsPanel>
      </Tabs>
    </Container>
  );
}
