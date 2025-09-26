import { BG_IMAGE_BASE_64, loadGoogleFont } from '@/lib/utils/og';
import { truncateText } from '@/lib/utils/text';
import { ImageResponse } from 'next/og';

interface Props {
  children: React.ReactElement;
}

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function OpenGraphCard(props: Props) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${BG_IMAGE_BASE_64})`,
          backgroundSize: `${size.width} ${size.height}`,
          backgroundPosition: 'top left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '30px',
          fontFamily: 'Hanken Grotesk',
        }}
      >
        <svg
          width="70"
          height="97.5"
          viewBox="0 0 32 43"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M31.0164 33.1306C31.0164 38.581 25.7882 42.9994 15.8607 42.9994C5.93311 42.9994 0 37.5236 0 32.0732C0 26.6228 5.93311 23.2617 15.8607 23.2617C25.7882 23.2617 31.0164 27.6802 31.0164 33.1306Z"
            fill="#FF6400"
          />
          <path
            d="M25.7295 19.3862C25.7295 22.5007 20.7964 22.2058 15.1558 22.2058C9.51511 22.2058 4.93445 22.1482 4.93445 19.0337C4.93445 15.9192 9.71537 12.6895 15.356 12.6895C20.9967 12.6895 25.7295 16.2717 25.7295 19.3862Z"
            fill="#FF6400"
          />
          <path
            d="M25.0246 10.9256C25.0246 14.0401 20.7964 11.9829 15.1557 11.9829C9.51506 11.9829 6.34424 13.6876 6.34424 10.5731C6.34424 7.45857 9.51506 5.63867 15.1557 5.63867C20.7964 5.63867 25.0246 7.81103 25.0246 10.9256Z"
            fill="#FF6400"
          />
          <path
            d="M20.4426 3.5755C20.4426 5.8323 18.2088 4.22951 15.2288 4.22951C12.2489 4.22951 10.5737 5.8323 10.5737 3.5755C10.5737 1.31871 12.2489 0 15.2288 0C18.2088 0 20.4426 1.31871 20.4426 3.5755Z"
            fill="#FF6400"
          />
        </svg>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {props.children}
          <p
            style={{
              fontSize: '40px',
              lineHeight: '20px',
              color: '#1F6144',
            }}
          >
            semble.so
          </p>
        </div>
      </div>
    ),
    {
      fonts: [
        {
          name: 'Hanken Grotesk',
          data: await loadGoogleFont('Hanken Grotesk'),
          style: 'normal',
        },
      ],
    },
  );
}
