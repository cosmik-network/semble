import { Alert } from '@mantine/core';
import { ReactNode } from 'react';
import { IoAlertCircleOutline } from 'react-icons/io5';

interface Props {
  message: string;
  /** Rendered under the message — a way out, like a link back. */
  action?: ReactNode;
}

export default function ErrorState(props: Props) {
  return (
    <Alert
      color="red"
      title={props.message}
      icon={<IoAlertCircleOutline size={20} />}
    >
      {props.action}
    </Alert>
  );
}
