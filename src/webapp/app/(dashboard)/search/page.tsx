import SearchContainer from '@/features/search/containers/searchContainer/SearchContainer';
import SearchResultsContainer from '@/features/search/containers/searchResultsContainer/SearchResultsContainer';

interface Props {
  searchParams: Promise<{
    query?: string;
    handle?: string;
  }>;
}

export default async function Page(props: Props) {
  const { query, handle } = await props.searchParams;

  if (query) {
    return <SearchResultsContainer query={query} handle={handle} />;
  }

  return <SearchContainer />;
}
