import SembleContaier from '@/features/semble/containers/sembleContainer/SembleContainer';
import { getUrlFromSlug } from '@/lib/utils/link';

interface Props {
  params: Promise<{ url: string[] }>;
}

export default async function Page(props: Props) {
  const { url } = await props.params;

  return <SembleContaier url={getUrlFromSlug(url)} />;
}
