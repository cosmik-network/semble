interface Props {
  url: string;
}

export default function UrlAddedBySummary(props: Props) {
  return <>{props.url} Added by summary</>;
}
