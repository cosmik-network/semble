import OpenGraphCard from '@/features/openGraph/components/openGraphCard/OpenGraphCard';
import { getProfile } from '@/features/profile/lib/dal.server';
import { abbreviateNumber, truncateText } from '@/lib/utils/text';

interface Props {
  params: Promise<{ handle: string }>;
}

export const contentType = 'image/png';
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image(props: Props) {
  const { handle } = await props.params;
  const profile = await getProfile(handle, true);

  return await OpenGraphCard({
    children: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          flexGrow: 1,
        }}
      >
        {profile.avatarUrl && (
          <img
            src={profile.avatarUrl + '@jpeg'}
            width={140}
            height={140}
            alt={`${handle}'s avatar`}
            style={{ borderRadius: '20px' }}
          />
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            marginTop: '35px',
          }}
        >
          <p
            style={{
              fontSize: 50,
              lineHeight: 1.1,
              display: 'block',
              lineClamp: 2,
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '900',
              wordBreak: 'break-word',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {truncateText(profile.name, 20)}
          </p>
          <p
            style={{
              fontSize: 40,
              lineHeight: 1.2,
              color: '#23AFED',
              margin: 0,
            }}
          >
            @{truncateText(truncateText(profile.handle), 35)}
          </p>

          {/* stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 40,
              marginTop: 40,
            }}
          >
            {profile.urlCardCount !== undefined && (
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
                  {abbreviateNumber(profile.urlCardCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.urlCardCount === 1 ? 'card' : 'cards'}
                </p>
              </div>
            )}
            {profile.collectionCount !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* BiCollection icon */}
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  fill="#15aabf"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19 10H5c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2zM5 20v-8h14l.002 8H5zM5 6h14v2H5zm2-4h10v2H7z" />
                </svg>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#495057',
                    margin: 0,
                  }}
                >
                  {abbreviateNumber(profile.collectionCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.collectionCount === 1 ? 'collection' : 'collections'}
                </p>
              </div>
            )}
            {profile.connectionCount !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* BiLink icon */}
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  fill="#15aabf"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M8.465 11.293c1.133-1.133 3.109-1.133 4.242 0l.707.707 1.414-1.414-.707-.707c-.943-.944-2.199-1.465-3.535-1.465s-2.592.521-3.535 1.465L4.929 12a5.008 5.008 0 0 0 0 7.071 4.983 4.983 0 0 0 3.535 1.462A4.982 4.982 0 0 0 12 19.071l.707-.707-1.414-1.414-.707.707a3.007 3.007 0 0 1-4.243 0 3.005 3.005 0 0 1 0-4.243l2.122-2.121z" />
                  <path d="m12 4.929-.707.707 1.414 1.414.707-.707a3.007 3.007 0 0 1 4.243 0 3.005 3.005 0 0 1 0 4.243l-2.122 2.121c-1.133 1.133-3.109 1.133-4.242 0L10.586 12l-1.414 1.414.707.707c.943.944 2.199 1.465 3.535 1.465s2.592-.521 3.535-1.465L19.071 12a5.008 5.008 0 0 0 0-7.071 5.006 5.006 0 0 0-7.071 0z" />
                </svg>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#495057',
                    margin: 0,
                  }}
                >
                  {abbreviateNumber(profile.connectionCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.connectionCount === 1 ? 'connection' : 'connections'}
                </p>
              </div>
            )}
            {profile.followerCount !== undefined && (
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
                  {abbreviateNumber(profile.followerCount)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: '#868e96',
                    margin: 0,
                  }}
                >
                  {profile.followerCount === 1 ? 'follower' : 'followers'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
  });
}
