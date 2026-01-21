import { BackgroundImage, Center, Loader, Stack } from '@mantine/core';
import BG from '@/assets/semble-bg.webp';
import DarkBG from '@/assets/semble-bg-dark.png';

export default function SearchContainerSkeleton() {
  return (
    <>
      <BackgroundImage src={BG.src} darkHidden h="75svh" top={0} left={0}>
        <Center h={'75svh'} p={'sm'}>
          <Stack align="center">
            <Loader type="dots" />
          </Stack>
        </Center>
      </BackgroundImage>
      <BackgroundImage src={DarkBG.src} lightHidden h="75svh" top={0} left={0}>
        <Center h={'75svh'} p={'sm'}>
          <Stack align="center">
            <Loader type="dots" />
          </Stack>
        </Center>
      </BackgroundImage>
    </>
  );
}
