import type { IconType } from 'react-icons/lib';
import { isValidElement } from 'react';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  href: string;
  openInNewTab?: boolean;
  icon: IconType | React.ReactElement;
  children: React.ReactNode;
}
export default function SettingItem(props: Props) {
  const renderIcon = () => {
    if (isValidElement(props.icon)) return props.icon;

    const IconComponent = props.icon as IconType;
    return <IconComponent size={26} />;
  };

  return (
    <LinkButton
      href={props.href}
      target={props.openInNewTab ? '_blank' : '_self'}
      variant="light"
      size="md"
      justify="start"
      radius={'lg'}
      color="gray"
      leftSection={renderIcon()}
      my={1}
    >
      {props.children}
    </LinkButton>
  );
}
