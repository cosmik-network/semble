import { notifications } from '@mantine/notifications';
import { BsExclamation } from 'react-icons/bs';

export function showCanvasError(message: string) {
  notifications.show({
    message,
    position: 'top-center',
    color: 'red',
    title: 'Error',
    autoClose: false,
    withCloseButton: true,
    icon: <BsExclamation />,
  });
}
