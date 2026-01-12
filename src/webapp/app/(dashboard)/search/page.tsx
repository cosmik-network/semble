import SearchContainer from '@/features/search/containers/searchContainer/SearchContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  return <SearchContainer />;
}
