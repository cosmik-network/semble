import { Result, ok, err } from '../../../../shared/core/Result';
import { URL } from '../../../cards/domain/value-objects/URL';
import { IMetadataService } from '../../../cards/domain/services/IMetadataService';
import {
  ICardQueryRepository,
  AnnotationCardView,
} from '../../../cards/domain/ICardQueryRepository';
import {
  IVectorDatabase,
  SemanticSearchCardsParams,
  CardSearchResult,
} from '../IVectorDatabase';
import { UrlView } from '@semble/types';
import {
  UrlMetadata,
  UrlMetadataProps,
} from 'src/modules/cards/domain/value-objects/UrlMetadata';
import { Chunk } from '../value-objects/Chunk';
import { AnnotationPassage } from '../value-objects/AnnotationPassage';
import { UrlType } from 'src/modules/cards/domain/value-objects/UrlType';
import { CardTypeEnum } from 'src/modules/cards/domain/value-objects/CardType';
import { annotationPassageKey } from 'src/modules/cards/domain/value-objects/selectors/normalizeQuotedText';

// Candidate pool for user-filtered searches: the index is network-wide, so
// over-fetch in one query and filter down to the user's URLs in memory
const USER_FILTER_CANDIDATE_POOL = 200;

/**
 * A hydrated search hit. URL hits carry a UrlView (library counts and
 * connection context enriched); annotation hits carry the most recently
 * updated card sharing the passage (its view already holds entity-level
 * counts, selectors and note).
 */
export type CardViewSearchResult =
  | {
      cardType: typeof CardTypeEnum.URL;
      url: string;
      similarity: number;
      view: UrlView;
    }
  | {
      cardType: typeof CardTypeEnum.ANNOTATION;
      url: string;
      exactNormalized: string;
      similarity: number;
      view: AnnotationCardView;
    };

export class SearchService {
  constructor(
    private vectorDatabase: IVectorDatabase,
    private metadataService: IMetadataService,
    private cardQueryRepository: ICardQueryRepository,
  ) {}

  async indexUrl(url: URL): Promise<Result<void>> {
    try {
      // 1. Get metadata for the URL
      const metadataResult = await this.metadataService.fetchMetadata(url);
      if (metadataResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch metadata: ${metadataResult.error.message}`,
          ),
        );
      }

      const metadata = metadataResult.value;

      // 2. Check if content meets minimum length for indexing
      const chunk = Chunk.create(metadata);
      if (!chunk.meetsMinLength()) {
        // Skip indexing silently - content too short
        return ok(undefined);
      }

      // 3. Index in vector database
      const indexResult = await this.vectorDatabase.indexUrl({
        url: url.value,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        publishedDate: metadata.publishedDate,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        type: metadata.type,
      });

      if (indexResult.isErr()) {
        return err(
          new Error(`Failed to index URL: ${indexResult.error.message}`),
        );
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Index an annotation passage. Idempotent — a second user highlighting the
   * same passage on the same URL upserts the same vector. Passages below the
   * min-length floor are skipped silently, mirroring the URL chunk gate.
   */
  async indexAnnotation(
    url: URL,
    exact: string,
    exactNormalized: string,
  ): Promise<Result<void>> {
    try {
      // 1. Check the passage meets the minimum length for indexing
      const passage = AnnotationPassage.create(exact, exactNormalized);
      if (!passage.meetsMinLength()) {
        // Skip indexing silently - passage too short
        return ok(undefined);
      }

      // 2. Annotation cards carry no urlType of their own — resolve it from
      // the URL's cards so the urlType search filter keeps working
      const urlTypes = await this.cardQueryRepository.getUrlTypes([url.value]);
      const urlType = urlTypes.get(url.value);

      // 3. Index in the annotations namespace
      const indexResult = await this.vectorDatabase.indexAnnotation({
        url: url.value,
        exactNormalized,
        passage: exact,
        urlType,
      });

      if (indexResult.isErr()) {
        return err(
          new Error(`Failed to index annotation: ${indexResult.error.message}`),
        );
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async findSimilarCards(
    url: URL,
    options: {
      limit: number;
      threshold?: number;
      urlType?: UrlType;
      cardType?: CardTypeEnum;
      callingUserId?: string;
    },
  ): Promise<Result<CardViewSearchResult[]>> {
    try {
      // 1. Get metadata for the URL to extract title + description. Fast
      // mode: this only feeds the vector query text, so don't block the
      // request on the slow citation service.
      const metadataResult = await this.metadataService.fetchMetadata(
        url,
        false,
        'fast',
      );
      if (metadataResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch metadata for similarity search: ${metadataResult.error.message}`,
          ),
        );
      }

      // 2. Create chunk from metadata to get searchable content
      const chunk = Chunk.create(metadataResult.value);
      const searchQuery = chunk.value || url.value; // Fallback to URL if no content

      // 3. Find similar cards using the content as query
      const searchParams: SemanticSearchCardsParams = {
        query: searchQuery,
        limit: options.limit * 2, // Get more results to account for filtering
        threshold: options.threshold,
        urlType: options.urlType,
        cardType: options.cardType,
      };

      return await this.processCardSearchResults(searchParams, {
        ...options,
        excludeUrl: url.value,
      });
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Finds URLs similar to the given URL and partitions them into everything
   * that matched and the subset already saved by the given user.
   *
   * Callers that need both views (e.g. recommending both the user's own
   * collections and open collections) should use this rather than calling
   * findSimilarUrls twice: it casts a single wide net against the vector
   * index and derives both sets from it, so the metadata fetch, the vector
   * query and the library-context enrichment each happen once.
   *
   * `savedByUser` is a subset of `all`, both ordered by similarity.
   */
  async findSimilarUrlsPartitionedByUser(
    url: URL,
    options: {
      limit: number;
      userId: string;
      threshold?: number;
      urlType?: UrlType;
      callingUserId?: string;
    },
  ): Promise<Result<{ all: UrlView[]; savedByUser: UrlView[] }>> {
    try {
      // 1. Metadata -> chunk -> search query (fetched once for both views).
      // Fast mode: only feeds the vector query text.
      const metadataResult = await this.metadataService.fetchMetadata(
        url,
        false,
        'fast',
      );
      if (metadataResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch metadata for similarity search: ${metadataResult.error.message}`,
          ),
        );
      }
      const chunk = Chunk.create(metadataResult.value);
      const searchQuery = chunk.value || url.value;

      // 2. One wide query against the index. Repeat queries return the same
      // top candidates, so a single pool serves both partitions.
      const searchResult = await this.vectorDatabase.semanticSearchUrls({
        query: searchQuery,
        limit: USER_FILTER_CANDIDATE_POOL,
        topK: USER_FILTER_CANDIDATE_POOL,
        threshold: options.threshold,
        urlType: options.urlType,
      });
      if (searchResult.isErr()) {
        return err(
          new Error(`Vector search failed: ${searchResult.error.message}`),
        );
      }

      const candidates = searchResult.value.filter((result) =>
        this.isUsableCandidate(result, url.value),
      );

      // 3. Partition. Best-effort: either side may return fewer than limit.
      const userUrlSet = await this.cardQueryRepository.getUrlsSavedByUser(
        options.userId,
        candidates.map((result) => result.url),
      );

      const all = candidates.slice(0, options.limit);
      const savedByUser = candidates
        .filter((result) => userUrlSet.has(result.url))
        .slice(0, options.limit);

      // 4. Enrich both partitions in one batch over their union
      const unionByUrl = new Map(
        [...all, ...savedByUser].map((result) => [result.url, result]),
      );
      const enriched = await this.enrichUrlsWithContext(
        Array.from(unionByUrl.values()),
        options.callingUserId,
      );
      const enrichedByUrl = new Map(enriched.map((view) => [view.url, view]));
      const toViews = (results: typeof candidates) =>
        results
          .map((result) => enrichedByUrl.get(result.url))
          .filter((view): view is UrlView => view !== undefined);

      return ok({ all: toViews(all), savedByUser: toViews(savedByUser) });
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async semanticSearchCards(
    query: string,
    options: {
      limit: number;
      threshold?: number;
      urlType?: UrlType;
      cardType?: CardTypeEnum;
      callingUserId?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<CardViewSearchResult[]>> {
    try {
      const searchParams: SemanticSearchCardsParams = {
        query,
        limit: options.limit * 2, // Get more results to account for filtering
        threshold: options.threshold,
        urlType: options.urlType,
        cardType: options.cardType,
      };

      return await this.processCardSearchResults(searchParams, options);
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async healthCheck(): Promise<Result<boolean>> {
    return await this.vectorDatabase.healthCheck();
  }

  /**
   * Delete an annotation passage vector. Callers must first verify no other
   * annotation card shares the passage — the vector is passage-shared.
   */
  async deleteAnnotation(
    url: URL,
    exactNormalized: string,
  ): Promise<Result<void>> {
    try {
      const deleteResult = await this.vectorDatabase.deleteAnnotation(
        url.value,
        exactNormalized,
      );
      if (deleteResult.isErr()) {
        return err(
          new Error(
            `Failed to delete annotation: ${deleteResult.error.message}`,
          ),
        );
      }
      return ok(undefined);
    } catch (error) {
      return err(
        new Error(
          `Search service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private async processCardSearchResults(
    searchParams: SemanticSearchCardsParams,
    options: {
      limit: number;
      callingUserId?: string;
      excludeUrl?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<CardViewSearchResult[]>> {
    if (options.filterByUserId) {
      return await this.processCardSearchWithUserFilter(searchParams, options);
    }

    // Standard processing without user filtering
    const searchResult =
      await this.vectorDatabase.semanticSearchCards(searchParams);
    if (searchResult.isErr()) {
      return err(
        new Error(`Vector search failed: ${searchResult.error.message}`),
      );
    }

    // Filter out excluded URL and URL results with insufficient content.
    // Annotation hits have no metadata to gate on — orphans (passages whose
    // cards are all deleted) are dropped at hydration instead.
    const filteredResults = searchResult.value.filter(
      (result) =>
        result.cardType === CardTypeEnum.ANNOTATION ||
        this.isUsableCandidate(result, options.excludeUrl),
    );

    // Limit to requested amount after filtering
    const limitedResults = filteredResults.slice(0, options.limit);

    return await this.hydrateCardResults(limitedResults, options.callingUserId);
  }

  private async processCardSearchWithUserFilter(
    searchParams: SemanticSearchCardsParams,
    options: {
      limit: number;
      callingUserId?: string;
      excludeUrl?: string;
      filterByUserId?: string;
    },
  ): Promise<Result<CardViewSearchResult[]>> {
    // Single wide query per namespace: repeat queries against the index return
    // the same top candidates, so cast one wide net and filter in memory.
    // Best-effort — may return fewer than options.limit results.
    const searchResult = await this.vectorDatabase.semanticSearchCards({
      ...searchParams,
      limit: USER_FILTER_CANDIDATE_POOL,
      topK: USER_FILTER_CANDIDATE_POOL,
    });
    if (searchResult.isErr()) {
      return err(
        new Error(`Vector search failed: ${searchResult.error.message}`),
      );
    }

    const results = searchResult.value;

    // "Saved by user" per type: URLs the user saved as URL cards, passages
    // the user annotated (any matching card authored by them)
    const userUrlSet = await this.cardQueryRepository.getUrlsSavedByUser(
      options.filterByUserId!,
      results
        .filter((result) => result.cardType === CardTypeEnum.URL)
        .map((result) => result.url),
    );
    const annotationCardsByPassage =
      await this.cardQueryRepository.getAnnotationCardsByPassages(
        results
          .filter((result) => result.cardType === CardTypeEnum.ANNOTATION)
          .map((result) => ({
            url: result.url,
            exactNormalized: result.exactNormalized,
          })),
      );

    const filteredResults = results
      .filter((result) => {
        if (result.cardType === CardTypeEnum.ANNOTATION) {
          return (
            result.url !== options.excludeUrl &&
            (
              annotationCardsByPassage.get(
                annotationPassageKey(result.url, result.exactNormalized),
              ) ?? []
            ).some((card) => card.authorId === options.filterByUserId)
          );
        }
        return (
          userUrlSet.has(result.url) &&
          this.isUsableCandidate(result, options.excludeUrl)
        );
      })
      .slice(0, options.limit);

    return await this.hydrateCardResults(
      filteredResults,
      options.callingUserId,
    );
  }

  /**
   * Resolve vector hits to domain views, preserving similarity order. URL
   * hits are enriched with library/connection context; annotation hits
   * resolve to the most recently updated card sharing the passage, and are
   * dropped when the passage no longer resolves to any card.
   */
  private async hydrateCardResults(
    results: CardSearchResult[],
    callingUserId?: string,
  ): Promise<Result<CardViewSearchResult[]>> {
    const urlHits = results.filter(
      (
        result,
      ): result is Extract<
        CardSearchResult,
        { cardType: typeof CardTypeEnum.URL }
      > => result.cardType === CardTypeEnum.URL,
    );
    const annotationHits = results.filter(
      (
        result,
      ): result is Extract<
        CardSearchResult,
        { cardType: typeof CardTypeEnum.ANNOTATION }
      > => result.cardType === CardTypeEnum.ANNOTATION,
    );

    const annotationCardsByPassage =
      await this.cardQueryRepository.getAnnotationCardsByPassages(
        annotationHits.map((hit) => ({
          url: hit.url,
          exactNormalized: hit.exactNormalized,
        })),
      );

    const enrichedUrls = await this.enrichUrlsWithContext(
      urlHits,
      callingUserId,
    );
    const enrichedByUrl = new Map(enrichedUrls.map((view) => [view.url, view]));

    const hydrated: CardViewSearchResult[] = [];
    for (const result of results) {
      if (result.cardType === CardTypeEnum.URL) {
        const view = enrichedByUrl.get(result.url);
        if (view) {
          hydrated.push({
            cardType: CardTypeEnum.URL,
            url: result.url,
            similarity: result.similarity,
            view,
          });
        }
      } else {
        const cards =
          annotationCardsByPassage.get(
            annotationPassageKey(result.url, result.exactNormalized),
          ) ?? [];
        const representative = [...cards].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        )[0];
        if (representative) {
          hydrated.push({
            cardType: CardTypeEnum.ANNOTATION,
            url: result.url,
            exactNormalized: result.exactNormalized,
            similarity: result.similarity,
            view: representative,
          });
        }
      }
    }

    return ok(hydrated);
  }

  /**
   * A candidate is usable if it isn't the URL we searched from and still has
   * enough indexed content to be worth showing.
   */
  private isUsableCandidate(
    result: { url: string; metadata: UrlMetadataProps },
    excludeUrl?: string,
  ): boolean {
    if (excludeUrl && result.url === excludeUrl) {
      return false;
    }
    const metadataResult = UrlMetadata.create(result.metadata);
    if (metadataResult.isErr()) {
      return false;
    }
    return Chunk.create(metadataResult.value).meetsMinLength();
  }

  private async enrichUrlsWithContext(
    searchResults: Array<{
      url: string;
      similarity: number;
      metadata: UrlMetadataProps;
    }>,
    callingUserId?: string,
  ): Promise<UrlView[]> {
    // Extract all URLs
    const urls = searchResults.map((result) => result.url);

    // Batch fetch library info for all URLs
    const urlLibraryInfoMap =
      await this.cardQueryRepository.getBatchUrlLibraryInfo(
        urls,
        callingUserId,
      );

    // Enrich each URL with library context
    const enrichedResults = searchResults.map((result) => {
      const libraryInfo = urlLibraryInfoMap.get(result.url);

      return {
        url: result.url,
        metadata: {
          url: result.url,
          title: result.metadata.title,
          description: result.metadata.description,
          author: result.metadata.author,
          siteName: result.metadata.siteName,
          imageUrl: result.metadata.imageUrl,
          type: result.metadata.type,
          retrievedAt: result.metadata.retrievedAt?.toISOString(),
          doi: result.metadata.doi,
          isbn: result.metadata.isbn,
        },
        urlLibraryCount: libraryInfo?.urlLibraryCount || 0,
        urlInLibrary: libraryInfo?.urlInLibrary,
        urlConnectionCount: libraryInfo?.urlConnectionCount,
        urlIsConnected: libraryInfo?.urlIsConnected,
      };
    });

    return enrichedResults;
  }
}
