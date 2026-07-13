import { Collection } from '@semble/types';
import OpenGraphCard from './OpenGraphCard';
import CollectionCollage from './CollectionCollage';
import { CollageTile } from '../../lib/utils/collage';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';
import { CollectionAccessType } from '@semble/types';

interface Props {
  collection: Collection;
  tiles: CollageTile[];
}

export default async function CollectionOpenGraph(props: Props) {
  const { collection, tiles } = props;

  const metadata = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {collection.accessType === CollectionAccessType.OPEN && (
          <svg
            stroke="#40c057"
            fill="#40c057"
            stroke-width="0"
            viewBox="0 0 512 512"
            height="24px"
            width="24px"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M512 32c0 113.6-84.6 207.5-194.2 222c-7.1-53.4-30.6-101.6-65.3-139.3C290.8 46.3 364 0 448 0l32 0c17.7 0 32 14.3 32 32zM0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 32 0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z"></path>
          </svg>
        )}
        <p
          style={{
            fontSize: 28,
            lineHeight: 1.2,
            color:
              collection.accessType === CollectionAccessType.OPEN
                ? '#40c057'
                : '#e803ff',
            margin: 0,
          }}
        >
          Collection
        </p>
      </div>

      {/* collection name */}
      <p
        style={{
          fontSize: 42,
          lineHeight: 1.1,
          display: 'block',
          lineClamp: 2,
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          maxWidth: '900',
          wordBreak: 'break-word',
          margin: 0,
        }}
      >
        {collection.name}
      </p>

      {/* collection description */}
      {collection.description && (
        <p
          style={{
            fontSize: 28,
            lineHeight: 1.2,
            color: '#868e96',
            marginTop: 16,
            display: 'block',
            WebkitLineClamp: 1,
            lineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxWidth: '900',
            wordBreak: 'break-word',
          }}
        >
          {collection.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 25 }}>
        {collection.cardCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p
              style={{
                fontSize: 28,
                lineHeight: 1,
                color: '#495057',
                margin: 0,
              }}
            >
              {abbreviateNumber(collection.cardCount)}
            </p>
            <p
              style={{
                fontSize: 28,
                lineHeight: 1,
                color: '#868e96',
                margin: 0,
              }}
            >
              {collection.cardCount > 1 ? 'cards' : 'card'}
            </p>
          </div>
        )}

        {collection.followerCount && collection.followerCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p
              style={{
                fontSize: 28,
                lineHeight: 1,
                color: '#495057',
                margin: 0,
              }}
            >
              {abbreviateNumber(collection.followerCount)}
            </p>
            <p
              style={{
                fontSize: 28,
                lineHeight: 1,
                color: '#868e96',
                margin: 0,
              }}
            >
              {collection.followerCount > 1 ? 'followers' : 'follower'}
            </p>
          </div>
        ) : null}
      </div>

      {/* Author Info */}
      <div
        style={{
          marginTop: 32,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {collection.author.avatarUrl && (
          <img
            src={collection.author.avatarUrl + '@jpeg'}
            width={50}
            height={50}
            alt={`${collection.author.handle}'s avatar`}
            style={{ borderRadius: '16px' }}
          />
        )}
        <p
          style={{
            color: '#23AFED',
            fontSize: 32,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          @{truncateText(collection.author.handle, 35)}
        </p>
      </div>
    </div>
  );

  return await OpenGraphCard({
    children:
      tiles.length > 0 ? (
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 40,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: 620 }}>
            {metadata}
          </div>
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CollectionCollage tiles={tiles} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {metadata}
        </div>
      ),
  });
}
