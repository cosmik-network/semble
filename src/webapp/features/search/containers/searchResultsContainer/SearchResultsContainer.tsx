import {
  Box,
  Container,
  Stack,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Text,
} from '@mantine/core';
import CardSearchResultsContainer from '../cardSearchResultsContainer/CardSearchResultsContainer';

interface Props {
  query: string;
}

export default function SearchResultsContainer(props: Props) {
  return (
    <Container p={'xs'} pt={0} size={'xl'}>
      <Stack gap={'xs'}>
        <Tabs defaultValue={'cards'}>
          <Box
            style={{
              position: 'sticky',
              top: 55,
              zIndex: 1,
            }}
          >
            <TabsList justify="center" bg={'var(--mantine-color-body'} grow>
              <TabsTab value="cards">Cards</TabsTab>
              <TabsTab value="collections">Collections</TabsTab>
              <TabsTab value="profiles">Profiles</TabsTab>
            </TabsList>
          </Box>
          <TabsPanel value="cards">
            <Container py="xs" px={0} size="xl">
              <CardSearchResultsContainer query={props.query} />
            </Container>
          </TabsPanel>
        </Tabs>
      </Stack>
    </Container>
  );
}
