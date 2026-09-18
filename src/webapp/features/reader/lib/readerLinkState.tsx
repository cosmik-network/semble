'use client';

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

export interface ReaderLinkState {
  activeId: number | null;
  /** Last opened link; its card stays mounted so its modals outlive the popover */
  preparedId: number | null;
}

export type ReaderLinkAction =
  | { type: 'open'; id: number }
  | { type: 'close'; id: number }
  | { type: 'dismiss' }
  | { type: 'reset' };

export const initialReaderLinkState: ReaderLinkState = {
  activeId: null,
  preparedId: null,
};

export function readerLinkReducer(
  state: ReaderLinkState,
  action: ReaderLinkAction,
): ReaderLinkState {
  switch (action.type) {
    case 'open':
      return { activeId: action.id, preparedId: action.id };
    case 'close':
      // Stale close from a link that already lost the popover
      return state.activeId === action.id
        ? { ...state, activeId: null }
        : state;
    case 'dismiss':
      return state.activeId === null ? state : { ...state, activeId: null };
    case 'reset':
      return initialReaderLinkState;
  }
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
