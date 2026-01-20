import {
  Box,
  Container,
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

interface Props {
  query: string;
}

export default function SearchResultsContainer(props: Props) {
  return (
    <Container p={'xs'} pt={0} size={'xl'}>
      <Tabs defaultValue={'cards'} radius={'xl'}>
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
            <SearchBar variant="compact" />

            <TabsList>
              <TabsTab value="cards">Cards</TabsTab>
              <TabsTab value="collections">Collections</TabsTab>
              <TabsTab value="profiles">Profiles</TabsTab>
            </TabsList>
          </Stack>
        </Box>

        <TabsPanel value="cards">
          <Container py="xs" px={0} size="xl">
            <CardSearchResultsContainer query={props.query} />
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
