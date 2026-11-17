import { BG_IMAGE_BASE_64, loadGoogleFont } from '../../lib/utils';
import { ImageResponse } from 'next/og';
import { SembleLogoFull } from './SembleLogo';

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
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <SembleLogoFull width={170} />
      </div>

      {props.children}
    </div>,
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
