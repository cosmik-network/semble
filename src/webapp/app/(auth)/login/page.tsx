import LoginForm from '@/features/auth/components/loginForm/LoginForm';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const redirectPath = sanitizeRedirectPath(searchParams.redirect);

  const session = await verifySessionOnServer();

  if (session) redirect(redirectPath ?? '/home');

  return <LoginForm redirectPath={redirectPath} />;
}
