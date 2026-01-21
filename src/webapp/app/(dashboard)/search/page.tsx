import SearchContainer from '@/features/search/containers/searchContainer/SearchContainer';
import SearchResultsContainer from '@/features/search/containers/searchResultsContainer/SearchResultsContainer';
import { UrlType } from '@semble/types';

interface Props {
  searchParams: Promise<{
    query?: string;
    handle?: string;
    urlType?: UrlType;
  }>;
}

export default async function Page(props: Props) {
  const { query, handle, urlType } = await props.searchParams;

  if (query) {
    return (
      <SearchResultsContainer query={query} handle={handle} urlType={urlType} />
    );
  }

  return <SearchContainer />;
}
