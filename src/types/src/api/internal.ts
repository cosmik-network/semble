// Internal types used by backend application layer
// These are not exposed via HTTP API but used internally

import type { User } from './common';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserDTO {
  did: string;
  handle?: string;
  linkedAt: Date;
  lastLoginAt: Date;
}

export interface OAuthCallbackDTO {
  code: string;
  state: string;
  iss: string;
}

// LoginWithAppPasswordDTO is the same as LoginWithAppPasswordRequest
// We re-export it here for consistency with backend naming
export type { LoginWithAppPasswordRequest as LoginWithAppPasswordDTO } from './requests';

// Type aliases for backend DTO naming conventions
export type { Collection as CollectionDTO } from './responses';
export type { UrlCard as UrlCardDTO } from './responses';
export type { Pagination as PaginationDTO } from './common';
export type { CardSorting as CardSortingDTO } from './common';
export type { CollectionSorting as CollectionSortingDTO } from './common';

// Note card interface for backend use
export interface NoteCardDTO {
  id: string;
  note: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}
