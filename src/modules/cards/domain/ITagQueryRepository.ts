import { PaginatedQueryResult } from './ICardQueryRepository';
import { ConnectionForUserDTO } from './IConnectionQueryRepository';
import { CollectionQueryResultDTO } from './ICollectionQueryRepository';

export interface TagQueryOptions {
  page: number;
  limit: number;
  /** When provided, only items authored/curated by this DID are returned. */
  userDid?: string;
}

/** A recent free-text blob (note, annotation note, connection note, or collection description). */
export interface RecentTextDTO {
  text: string;
  createdAt: Date;
}

/**
 * A NOTE or ANNOTATION card whose note text contains the tag. Notes surface
 * as their parent URL card; annotations surface as the annotation card
 * itself. The card is hydrated separately via ICardQueryRepository.
 */
export interface TaggedCardResultDTO {
  kind: 'note' | 'annotation';
  /**
   * The card id to render: the parent URL card id for notes, the annotation
   * card's own id for annotations.
   */
  cardId: string;
  /** When the tagging note was created (reverse-chron sort key). */
  noteCreatedAt: Date;
}

export interface ITagQueryRepository {
  /**
   * Bounded window of recent texts for tag extraction (getTags). When
   * userDid is set, only that user's notes/annotation notes/connection
   * notes/collection descriptions are returned; otherwise a global recent
   * window.
   */
  getRecentTexts(options: {
    userDid?: string;
    limitPerSource: number;
  }): Promise<RecentTextDTO[]>;

  /**
   * URL cards whose attached note contains the tag (as their parent URL
   * card) plus ANNOTATION cards whose note contains the tag (as
   * themselves), newest note first. Matching is word-boundary-correct
   * (#tag never matches #tagfoo).
   */
  getTaggedCards(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<TaggedCardResultDTO>>;

  /** Connections whose note contains the tag, newest first. */
  getTaggedConnections(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<ConnectionForUserDTO>>;

  /** Collections whose description contains the tag, newest first. */
  getTaggedCollections(
    tag: string,
    options: TagQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>>;
}
