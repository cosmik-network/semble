import { ok, err, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { extractTags, normalizeTag, TagSummary } from '@semble/types';
import {
  ITagQueryRepository,
  RecentTextDTO,
} from '../../../domain/ITagQueryRepository';

export interface GetTagsQuery {
  callingUserId?: string;
  q?: string;
  limit?: number;
}

export interface GetTagsResult {
  tags: TagSummary[];
}

// How many recent rows per source (notes / connection notes / collection
// descriptions) are scanned for tags. Keeps the regex-at-query-time approach
// bounded.
const RECENT_WINDOW_PER_SOURCE = 200;

export class GetTagsUseCase implements UseCase<
  GetTagsQuery,
  Result<GetTagsResult>
> {
  constructor(private tagQueryRepo: ITagQueryRepository) {}

  async execute(query: GetTagsQuery): Promise<Result<GetTagsResult>> {
    const limit = Math.min(query.limit || 20, 50);
    const prefix = query.q ? normalizeTag(query.q) : '';

    try {
      let texts: RecentTextDTO[] = [];
      if (query.callingUserId) {
        texts = await this.tagQueryRepo.getRecentTexts({
          userDid: query.callingUserId,
          limitPerSource: RECENT_WINDOW_PER_SOURCE,
        });
      }

      let tags = this.collectTags(texts);
      if (tags.length === 0) {
        const globalTexts = await this.tagQueryRepo.getRecentTexts({
          limitPerSource: RECENT_WINDOW_PER_SOURCE,
        });
        tags = this.collectTags(globalTexts);
      }

      const filtered = prefix
        ? tags.filter((t) => t.tag.startsWith(prefix))
        : tags;

      return ok({ tags: filtered.slice(0, limit) });
    } catch (error) {
      return err(
        new Error(
          `Failed to get tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  private collectTags(texts: RecentTextDTO[]): TagSummary[] {
    const lastUsed = new Map<string, Date>();
    for (const { text, createdAt } of texts) {
      for (const tag of extractTags(text)) {
        const existing = lastUsed.get(tag);
        if (!existing || createdAt > existing) {
          lastUsed.set(tag, createdAt);
        }
      }
    }
    return Array.from(lastUsed.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([tag, date]) => ({ tag, lastUsed: date.toISOString() }));
  }
}
