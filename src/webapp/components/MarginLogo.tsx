import { Anchor, Box, Tooltip } from '@mantine/core';
import { MouseEvent } from 'react';

interface Props {
  size?: number;
  marginUrl?: string | null;
  tooltipText?: string;
}

export default function MarginLogo({
  size = 16,
  marginUrl,
  tooltipText = 'View on Margin',
}: Props) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const logo = (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 265 231"
      fill="#027bff"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
      <path d="M215 214.224 V230 H264.5 V0 H215 V16.2242 H248.5 V214.224 H215 Z" />
    </Box>
  );

  if (!marginUrl) {
    return logo;
  }

  return (
    <Tooltip label={tooltipText}>
      <Anchor
        href={marginUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
      >
        {logo}
      </Anchor>
    </Tooltip>
  );
}
