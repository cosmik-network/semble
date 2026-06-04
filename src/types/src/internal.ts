import { z } from 'zod';
import { UserSchema } from './entities/user';

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const UserDTOSchema = z.object({
  did: z.string(),
  handle: z.string().optional(),
  linkedAt: z.date(),
  lastLoginAt: z.date(),
});
export interface UserDTO {
  did: string;
  handle?: string;
  linkedAt: Date;
  lastLoginAt: Date;
}

export const OAuthCallbackDTOSchema = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string(),
});
export interface OAuthCallbackDTO {
  code: string;
  state: string;
  iss: string;
}

export const NoteCardDTOSchema = z.object({
  id: z.string(),
  note: z.string(),
  author: UserSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export interface NoteCardDTO {
  id: string;
  note: string;
  author: import('./entities/user').User;
  createdAt: string;
  updatedAt: string;
}

export type { LoginWithAppPasswordRequest as LoginWithAppPasswordDTO } from './api/users/login';
export type { Collection as CollectionDTO } from './entities/collection';
export type { UrlCard as UrlCardDTO } from './entities/card';
export type { Pagination as PaginationDTO } from './entities/common';
export type { CardSorting as CardSortingDTO } from './entities/common';
export type { CollectionSorting as CollectionSortingDTO } from './entities/common';
