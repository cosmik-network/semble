import ProfileActivityContainer from '@/features/feeds/containers/profileActivityContainer/ProfileActivityContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <ProfileActivityContainer handle={handle} />;
}
