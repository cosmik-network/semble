import OpenGraphCard from './OpenGraphCard';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';

interface Props {
  name: string;
  linkCount: number;
  author: {
    name: string;
    handle?: string | null;
    avatarUrl?: string | null;
  } | null;
  // The board's saved thumbnail, as a data URL
  thumbnail: string | null;
}

// The board's thumbnail, framed like the collection collage's tiles. Satori
// needs explicit dimensions; objectFit keeps any board's aspect in frame.
const THUMB_WIDTH = 470;
const THUMB_HEIGHT = 410;

export default async function CanvasOpenGraph(props: Props) {
  const metadata = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* label */}
      <p
        style={{
          fontSize: 28,
          lineHeight: 1.2,
          color: '#e803ff',
          margin: 0,
        }}
      >
        Canvas
      </p>

      {/* canvas name */}
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
        {props.name}
      </p>

      {props.linkCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 30,
          }}
        >
          {/* MdLink icon */}
          <svg
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="#15aabf"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
          </svg>
          <p
            style={{
              fontSize: 28,
              lineHeight: 1,
              color: '#495057',
              margin: 0,
            }}
          >
            {abbreviateNumber(props.linkCount)}
          </p>
          <p
            style={{
              fontSize: 28,
              lineHeight: 1,
              color: '#868e96',
              margin: 0,
            }}
          >
            {props.linkCount > 1 ? 'links' : 'link'}
          </p>
        </div>
      )}

      {/* Author Info */}
      {props.author && (
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          {props.author.avatarUrl && (
            <img
              src={props.author.avatarUrl + '@jpeg'}
              width={50}
              height={50}
              alt={`${props.author.handle}'s avatar`}
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
            {props.author.handle
              ? `@${truncateText(props.author.handle, 35)}`
              : truncateText(props.author.name, 35)}
          </p>
        </div>
      )}
    </div>
  );

  return await OpenGraphCard({
    children:
      props.thumbnail !== null ? (
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
            <img
              src={props.thumbnail}
              alt=""
              width={THUMB_WIDTH}
              height={THUMB_HEIGHT}
              style={{
                width: THUMB_WIDTH,
                height: THUMB_HEIGHT,
                objectFit: 'cover',
                borderRadius: 16,
                border: '3px solid #ffffff',
                boxShadow:
                  '0 0 0 1px rgba(15, 23, 42, 0.08), 0 10px 28px rgba(15, 23, 42, 0.28)',
              }}
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
