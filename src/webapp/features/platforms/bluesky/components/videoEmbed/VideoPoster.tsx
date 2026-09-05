import { Image, ThemeIcon, UnstyledButton } from '@mantine/core';
import { FaPlay } from 'react-icons/fa6';
import classes from './VideoPoster.module.css';

interface Props {
  thumbnail?: string;
  onPlay: () => void;
}

export default function VideoPoster(props: Props) {
  return (
    <UnstyledButton
      className={classes.root}
      aria-label="Play video"
      onClick={(e) => {
        e.stopPropagation();
        props.onPlay();
      }}
    >
      {props.thumbnail && (
        <Image
          src={props.thumbnail}
          alt=""
          fit="contain"
          className={classes.thumbnail}
        />
      )}
      <span className={classes.control}>
        <ThemeIcon variant="white" color="dark" size={48} radius="xl">
          <FaPlay />
        </ThemeIcon>
      </span>
    </UnstyledButton>
  );
}
