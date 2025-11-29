import { IconType } from 'react-icons/lib';
import { ActionIcon, Anchor, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { ReactElement, isValidElement } from 'react';
import { usePathname } from 'next/navigation';
import { useNavbarContext } from '@/providers/navbar';

interface Props {
  href: string;
  title?: string;
  icon: IconType | ReactElement;
}

export default function BottomBarItem(props: Props) {
  const pathname = usePathname();
  const isActive = pathname === props.href;
  const { toggleMobile, mobileOpened } = useNavbarContext();

  const renderIcon = () => {
    // If the icon is already a React element, just return it
    if (isValidElement(props.icon)) return props.icon;

    // Otherwise, it's an IconType component, so render it manually
    const IconComponent = props.icon as IconType;
    return <IconComponent size={22} />;
  };

  return (
    <Anchor component={Link} href={props.href} underline="never">
      <Stack gap={0} align="center">
        <ActionIcon
          variant={isActive ? 'light' : 'transparent'}
          size={'lg'}
          color="gray"
          onClick={() => {
            if (mobileOpened) {
              toggleMobile();
            }
          }}
        >
          {renderIcon()}
        </ActionIcon>
        {props.title && (
          <Text fz={'sm'} fw={600} c={isActive ? 'bright' : 'gray'}>
            {props.title}
          </Text>
        )}
      </Stack>
    </Anchor>
  );
}
