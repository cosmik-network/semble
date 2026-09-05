import { Image, Loader, ThemeIcon, UnstyledButton } from '@mantine/core';
import { FaPlay } from 'react-icons/fa6';
import classes from './VideoPoster.module.css';

interface Props {
  thumbnail?: string;
  isLoading?: boolean;
  onPlay?: () => void;
}

export default function VideoPoster(props: Props) {
  return (
    <UnstyledButton
      className={classes.root}
      aria-label="Play video"
      disabled={props.isLoading}
      onClick={(e) => {
        e.stopPropagation();
        props.onPlay?.();
      }}
    >
      {props.thumbnail && (
        <Image src={props.thumbnail} alt="" className={classes.thumbnail} />
      )}
      <span className={classes.control}>
        {props.isLoading ? (
          <Loader color="white" size="md" />
        ) : (
          <ThemeIcon variant="white" color="dark" size={48} radius="xl">
            <FaPlay />
          </ThemeIcon>
        )}
      </span>
    </UnstyledButton>
  );
}
