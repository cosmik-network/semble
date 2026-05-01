import UrlEmbedContainer from '@/features/url/containers/urlEmbedContainer/UrlEmbedContainer';
import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ id: string | undefined }>;
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const url = searchParams.id
    ? decodeURIComponent(searchParams.id)
    : searchParams.id;

  if (!url) {
    redirect('/');
  }

  return <UrlEmbedContainer url={url} />;
}
