'use client';

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { ReaderLink } from './utils/readerLink';

export type ReaderLinkModal = 'add' | 'connect';

export interface ReaderLinkState {
  activeId: number | null;
  /** Last opened link. Its modals mount closed from here so they animate in later. */
  preparedLink: ReaderLink | null;
  modal: ReaderLinkModal | null;
}

export type ReaderLinkAction =
  | { type: 'open'; id: number; link: ReaderLink }
  | { type: 'close'; id: number }
  | { type: 'dismiss' }
  | { type: 'request'; modal: ReaderLinkModal; link: ReaderLink }
  | { type: 'closeModal' }
  | { type: 'reset' };

export const initialReaderLinkState: ReaderLinkState = {
  activeId: null,
  preparedLink: null,
  modal: null,
};

export function readerLinkReducer(
  state: ReaderLinkState,
  action: ReaderLinkAction,
): ReaderLinkState {
  switch (action.type) {
    case 'open':
      return { ...state, activeId: action.id, preparedLink: action.link };
    case 'close':
      // Stale close from a link that already lost the popover
      return state.activeId === action.id
        ? { ...state, activeId: null }
        : state;
    case 'dismiss':
      return state.activeId === null ? state : { ...state, activeId: null };
    case 'request':
      return {
        activeId: null,
        preparedLink: action.link,
        modal: action.modal,
      };
    case 'closeModal':
      return { ...state, modal: null };
    case 'reset':
      return initialReaderLinkState;
  }
}

export function isReaderLinkOverlayOpen(state: ReaderLinkState): boolean {
  return state.activeId !== null || state.modal !== null;
}

export function useReaderLinkReducer() {
  return useReducer(readerLinkReducer, initialReaderLinkState);
}

const StateContext = createContext<ReaderLinkState | null>(null);
const DispatchContext = createContext<Dispatch<ReaderLinkAction> | null>(null);

interface ProviderProps {
  state: ReaderLinkState;
  dispatch: Dispatch<ReaderLinkAction>;
  children: ReactNode;
}

// The reader root owns the reducer: the drawer derives Escape handling from it
export function ReaderLinkProvider(props: ProviderProps) {
  return (
    <StateContext value={props.state}>
      <DispatchContext value={props.dispatch}>{props.children}</DispatchContext>
    </StateContext>
  );
}

export function useReaderLinkState(): ReaderLinkState {
  const state = useContext(StateContext);
  if (!state) {
    throw new Error(
      'useReaderLinkState must be used within ReaderLinkProvider',
    );
  }
  return state;
}

export function useReaderLinkDispatch(): Dispatch<ReaderLinkAction> {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) {
    throw new Error(
      'useReaderLinkDispatch must be used within ReaderLinkProvider',
    );
  }
  return dispatch;
}
