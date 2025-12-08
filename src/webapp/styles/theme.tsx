'use client';
import classes from './global.module.css';

import {
  createTheme,
  Avatar,
  Button,
  CheckboxIndicator,
  MenuItem,
  Modal,
  NavLink,
  Spoiler,
  TabsTab,
  Tooltip,
  Text,
  Combobox,
} from '@mantine/core';

export const theme = createTheme({
  primaryShade: {
    light: 6,
    dark: 6,
  },
  primaryColor: 'tangerine',
  colors: {
    tangerine: [
      '#fff1e2',
      '#ffe1cc',
      '#ffc29a',
      '#ffa164',
      '#fe8537',
      '#fe731a',
      '#ff6400',
      '#e45800',
      '#cb4d00',
      '#b14000',
    ],
    stone: [
      '#fafaf9',
      '#f5f5f4',
      '#e7e5e4',
      '#d6d3d1',
      '#a8a29e',
      '#78716c',
      '#57534e',
      '#44403c',
      '#292524',
      '#0c0a09',
    ],
    blue: [
      '#e3faff',
      '#cff0fe',
      '#a2dff8',
      '#72cdf3',
      '#4cbdef',
      '#35b4ed',
      '#23afed',
      '#109eda',
      '#0088be',
      '#0076a8',
    ],
    grape: [
      '#ffe8ff',
      '#fdceff',
      '#f79bff',
      '#f164ff',
      '#ec36ff',
      '#ea25ff',
      '#e803ff',
      '#ce00e4',
      '#b800cc',
      '#a000b3',
    ],
  },
  fontFamily:
    'Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
  defaultRadius: 'md',
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: 'xl',
      },
    }),
    NavLink: NavLink.extend({
      styles: (theme) => ({
        root: { borderRadius: theme.radius.md },
        label: {
          fontSize: theme.fontSizes.md,
          fontWeight: 600,
        },
      }),
    }),
    Avatar: Avatar.extend({
      defaultProps: {
        radius: 'md',
      },
    }),
    MenuItem: MenuItem.extend({
      defaultProps: {
        fz: 'md',
        fw: 600,
      },
    }),
    CheckboxIndicator: CheckboxIndicator.extend({
      defaultProps: {
        radius: 'xl',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: 'lg',
        transitionProps: { transition: 'pop' },
      },
    }),
    Spoiler: Spoiler.extend({
      styles: {
        control: {
          color: 'gray',
          fontWeight: 600,
        },
      },
    }),
    TabsTab: TabsTab.extend({
      defaultProps: {
        fw: 500,
        fz: 'md',
      },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: {
        position: 'top-start',
      },
    }),
    Title: Text.extend({
      styles: {
        root: {
          wordBreak: 'break-word',
        },
      },
    }),
    Text: Text.extend({
      styles: {
        root: {
          wordBreak: 'break-word',
        },
      },
    }),
    Combobox: Combobox.extend({
      defaultProps: {
        classNames: {
          option: classes.option,
        },
      },
    }),
  },
});
