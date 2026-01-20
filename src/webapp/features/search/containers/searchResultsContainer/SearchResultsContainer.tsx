import {
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
    <Container p={'xs'} size={'xl'} >
      <Stack gap={'xs'}>
        <Text fw={500} c={'gray'}>
          Search results for:{' '}
          <Text fw={600} c={'dark'} span>
            {props.query}
          </Text>
        </Text>
        <Tabs defaultValue={'cards'}>
          <TabsList>
            <TabsTab value="cards">Cards</TabsTab>
            <TabsTab value="collections">Collections</TabsTab>
            <TabsTab value="profiles">Profiles</TabsTab>
          </TabsList>
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
