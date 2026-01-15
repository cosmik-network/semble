import HomeContainer from '@/features/home/containers/homeContainer/HomeContainer';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  return <HomeContainer />;
}
