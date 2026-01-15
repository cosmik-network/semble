import { AppBskyFeedDefs, AppBskyGraphDefs, AtUri } from '@atproto/api';

export const getStarterPackImage = (
  starterPack: AppBskyGraphDefs.StarterPackViewBasic,
) => {
  const rkey = new AtUri(starterPack.uri).rkey;
  return `https://ogcard.cdn.bsky.app/start/${starterPack.creator.did}/${rkey}`;
};

export const getStarterPackLink = (
  starterPack: AppBskyGraphDefs.StarterPackViewBasic,
) => {
  const rkey = new AtUri(starterPack.uri).rkey;
  const handleOrDid = starterPack.creator.handle || starterPack.creator.did;

  return `https://bsky.app/starter-pack/${handleOrDid}/${rkey}`;
};

export const getFeedLink = (feed: AppBskyFeedDefs.GeneratorView) => {
  const rkey = new AtUri(feed.uri).rkey;
  const handleOrDid = feed.creator.handle || feed.creator.did;

  return `https://bsky.app/profile/${handleOrDid}/feed/${rkey}`;
};

export const getListLink = (list: AppBskyGraphDefs.ListView) => {
  const rkey = new AtUri(list.uri).rkey;
  const handleOrDid = list.creator.handle || list.creator.did;

  return `https://bsky.app/profile/${handleOrDid}/lists/${rkey}`;
};

export const getPostRkeyFromUri = (uri: string) => {
  const URI = new AtUri(uri);

  return URI.rkey;
};
