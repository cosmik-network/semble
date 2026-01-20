import BackButton from '@/components/navigation/backButton/BackButton';
import Header from '@/components/navigation/header/Header';
import SearchBar from '@/features/search/components/searchBar/SearchBar';
import SearchContainer from '@/features/search/containers/searchContainer/SearchContainer';
import SearchResultsContainer from '@/features/search/containers/searchResultsContainer/SearchResultsContainer';
import { Grid, GridCol, Paper } from '@mantine/core';
import { Fragment } from 'react';

interface Props {
  searchParams: Promise<{ query: string | undefined }>;
}

export default async function Page(props: Props) {
  const { query } = await props.searchParams;

  if (query) {
    return <SearchResultsContainer query={query} />;
  }

  return <SearchContainer />;
}
