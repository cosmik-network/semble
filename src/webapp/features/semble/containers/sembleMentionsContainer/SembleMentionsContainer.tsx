import useSearchBlueskyPosts from '@/features/platforms/bluesky/lib/queries/useSearchBlueskyPosts';

interface Props {
  url: string;
}

export default function SembleMentionsContainer(props: Props) {
  const { data } = useSearchBlueskyPosts({ query: props.url });
  console.log(data);
  return <>{props.url}</>;
}
