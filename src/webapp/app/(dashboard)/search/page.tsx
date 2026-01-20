import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import SearchContainer from '@/features/search/containers/searchContainer/SearchContainer';
import { Fragment } from 'react';

interface Props {
  searchParams: Promise<{ query: string | undefined }>;
}

export default async function Page(props: Props) {
  const { query } = await props.searchParams;

  return (
    <Fragment>
      <Header title="Search">
        <BackButton href="/home">Home</BackButton>
      </Header>
      <SearchContainer query={query} />
    </Fragment>
  );
}
