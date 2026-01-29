import { Box } from '@mantine/core';

interface Props {
  size?: number;
}

export default function MarginLogo({ size = 16 }: Props) {
  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 265 231"
      fill="#6366f1"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z" />
      <path d="M215 214.224 V230 H264.5 V0 H215.07 V16.2242 H248.5 V214.224 H215 Z" />
    </Box>
  );
}
