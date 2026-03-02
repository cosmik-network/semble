import { Container } from '@mantine/core';
import ProfileConnectionsContainer from '@/features/profile/containers/profileConnectionsContainer/ProfileConnectionsContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return (
    <Container p={'xs'} size={'xl'}>
      <ProfileConnectionsContainer identifier={handle} />
    </Container>
  );
}
