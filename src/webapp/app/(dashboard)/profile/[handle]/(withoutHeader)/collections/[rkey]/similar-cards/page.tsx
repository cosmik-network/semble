import SimilarCardsContainer from '@/features/cards/containers/similarCardsContainer/SimilarCardsContainer';
import { Container } from '@mantine/core';

interface Props {
  params: Promise<{ handle: string; rkey: string }>;
}

export default async function Page({ params }: Props) {
  const { handle, rkey } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:4000';
  const url = `${appUrl}/profile/${handle}/collections/${rkey}`;

  return (
    <Container p="xs" size="xl">
      <SimilarCardsContainer url={url} />
    </Container>
  );
}
