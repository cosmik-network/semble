import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import SearchContainer from '@/features/search/containers/searchContainer/SearchContainer';
import { Fragment } from 'react';

export default async function Page() {
  return (
    <Fragment>
      <Header title="Search">
        <BackButton href="/home">Home</BackButton>
      </Header>
      <SearchContainer />
    </Fragment>
  );
}
