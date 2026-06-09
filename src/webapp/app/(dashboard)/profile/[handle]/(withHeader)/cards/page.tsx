import CardsContainer from '@/features/cards/containers/cardsContainer/CardsContainer';

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function Page(props: Props) {
  const { handle } = await props.params;

  return <CardsContainer handle={handle} />;
}
