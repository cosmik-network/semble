import LoginForm from '@/features/auth/components/loginForm/LoginForm';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await verifySessionOnServer();

  if (session) redirect('/home');

  return <LoginForm />;
}
