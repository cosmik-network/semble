'use client';

import {
  AspectRatio,
  Box,
  Card,
  Center,
  Group,
  Image,
  Stack,
  Text,
} from '@mantine/core';
import Link from 'next/link';
import { BsEasel } from 'react-icons/bs';
import { getRelativeTime } from '@/lib/utils/time';
import { canvasHref } from '../../lib/constants';
import type { CanvasSummary } from '../../storage/canvasStorage';
import CanvasCardActions from '../canvasCardActions/CanvasCardActions';
import styles from './CanvasCard.module.css';

interface Props {
  canvas: CanvasSummary;
}

export default function CanvasCard(props: Props) {
  const linkCount = props.canvas.linkCount;

  return (
    <Card withBorder radius={'lg'} p={'sm'} className={styles.root} h={'100%'}>
      <Link
        href={canvasHref(props.canvas.id)}
        className={styles.link}
        aria-label={props.canvas.name}
      />
      <Stack gap={'sm'}>
        <AspectRatio ratio={16 / 10}>
          {props.canvas.thumbnail ? (
            <Image
              src={props.canvas.thumbnail}
              alt=""
              radius={'md'}
              fit="contain"
              bg="var(--mantine-color-gray-light)"
            />
          ) : (
            <Center
              bg="var(--mantine-color-gray-light)"
              c="gray"
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
            >
              <BsEasel size={32} />
            </Center>
          )}
        </AspectRatio>
        <Group justify="space-between" gap={'xs'} wrap="nowrap">
          <Box miw={0}>
            <Text fw={500} lineClamp={1}>
              {props.canvas.name}
            </Text>
            <Text c="gray" fz="sm" lineClamp={1}>
              {linkCount} {linkCount === 1 ? 'link' : 'links'}
              {' · '}
              {getRelativeTime(props.canvas.updatedAt)}
            </Text>
          </Box>
          <CanvasCardActions canvas={props.canvas} />
        </Group>
      </Stack>
    </Card>
  );
}
