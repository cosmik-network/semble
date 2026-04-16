import LoginForm from '@/features/auth/components/loginForm/LoginForm';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { sanitizeReturnTo } from '@/lib/auth/returnTo';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page(props: PageProps) {
  const params = await props.searchParams;
  const returnTo = sanitizeReturnTo(params.returnTo);

  const session = await verifySessionOnServer();

  if (session) redirect(returnTo ?? '/home');

  return <LoginForm returnTo={returnTo ?? undefined} />;
}
