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

      <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
        {collection.cardCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* FaRegNoteSticky icon (navbar "Cards"); 448x512 viewBox, so
                width is scaled to keep the aspect ratio at 36px tall */}
            <svg
              viewBox="0 0 448 512"
              width="31.5"
              height="36"
              fill="#15aabf"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M64 80c-8.8 0-16 7.2-16 16l0 320c0 8.8 7.2 16 16 16l224 0 0-80c0-17.7 14.3-32 32-32l80 0 0-224c0-8.8-7.2-16-16-16L64 80zM288 480L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l320 0c35.3 0 64 28.7 64 64l0 224 0 5.5c0 17-6.7 33.3-18.7 45.3l-90.5 90.5c-12 12-28.3 18.7-45.3 18.7l-5.5 0z" />
            </svg>
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

        {collection.followerCount !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* MdOutlinePeopleAlt icon */}
            <svg
              viewBox="0 0 24 24"
              width="36"
              height="36"
              fill="#15aabf"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path d="M16.67 13.13C18.04 14.06 19 15.32 19 17v3h4v-3c0-2.18-3.57-3.47-6.33-3.87zM15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4c-.47 0-.91.1-1.33.24a5.98 5.98 0 0 1 0 7.52c.42.14.86.24 1.33.24zM9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM9 13c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H3v-.99C3.2 16.29 6.3 15 9 15s5.8 1.29 6 2v1z" />
            </svg>
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
              {collection.followerCount === 1 ? 'follower' : 'followers'}
            </p>
          </div>
        )}
      </div>

      {/* Author Info */}
      <div
        style={{
          marginTop: 40,
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
              justifyContent: 'flex-end',
            }}
          >
            <CollectionCollage
              tiles={tiles}
              totalCount={collection.cardCount}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {metadata}
        </div>
      ),
  });
}
