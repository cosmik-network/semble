import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export default async function Page() {
  // Without this the redirect is prerendered and every board shares one id
  await connection();
  redirect(`/canvas/${crypto.randomUUID()}`);
}
