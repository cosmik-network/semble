'use client';

import { Button, Center } from '@mantine/core';
import Link from 'next/link';
import { MdArrowBack } from 'react-icons/md';

export default function GuideFooter() {
  return (
    <Center>
      <Button
        component={Link}
        href="/home"
        variant="light"
        color="gray"
        leftSection={<MdArrowBack size={18} />}
      >
        Back to Semble
      </Button>
    </Center>
  );
}
