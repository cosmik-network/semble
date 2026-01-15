import {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyGraphDefs,
} from '@atproto/api';

import ImageEmbed from '../imageEmbed/ImageEmbed';
import ExternalEmbed from '../externalEmbed/ExternalEmbed';
import VideoEmbed from '../videoEmbed/VideoEmbed';
import ListEmbed from '../listEmbed/ListEmbed';
import StarterPackEmbed from '../starterPackEmbed/StarterPackEmbed';
import FeedEmbed from '../feedEmbed/FeedEmbed';
import RecordEmbed from '../recordEmbed/RecordEmbed';

interface Props {
  embed: AppBskyFeedDefs.PostView['embed'];
}

export default function PostEmbed(props: Props) {
  switch (true) {
    case AppBskyEmbedImages.isView(props.embed):
      return <ImageEmbed images={props.embed.images} />;

    case AppBskyEmbedExternal.isView(props.embed):
      return <ExternalEmbed embed={props.embed} />;

    case AppBskyEmbedVideo.isView(props.embed):
      return <VideoEmbed embed={props.embed} />;

    // check for Record first before accessing embed.record
    case AppBskyEmbedRecord.isView(props.embed): {
      const record = props.embed.record;

      if (AppBskyGraphDefs.isStarterPackViewBasic(record)) {
        return <StarterPackEmbed embed={record} />;
      }

      if (AppBskyFeedDefs.isGeneratorView(record)) {
        return <FeedEmbed feed={record} />;
      }

      if (AppBskyGraphDefs.isListView(record)) {
        return <ListEmbed list={record} />;
      }

      return <RecordEmbed embed={record} />;
    }

    case AppBskyEmbedRecordWithMedia.isView(props.embed):
      return (
        <RecordEmbed
          embed={props.embed.record.record}
          media={props.embed.media}
        />
      );

    default:
      return null;
  }
}
