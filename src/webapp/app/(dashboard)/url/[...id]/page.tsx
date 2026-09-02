import { getSembleHref, getUrlFromSlug } from '@/lib/utils/link';
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string[] }>;
}
export default async function Page(props: Props) {
  const { id } = await props.params;
  const url = getUrlFromSlug(id);

  redirect(getSembleHref(url));
}
