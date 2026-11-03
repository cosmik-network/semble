import { UrlAggregateStats } from '@semble/types';
import { UrlStats } from '../../domain/ICardQueryRepository';

type ConnectionStatsDTO = UrlAggregateStats['connections']['all'];

/**
 * UrlStatsMapper - Maps canonical repository UrlStats to the API's
 * UrlAggregateStats shape (connection Maps → all/incoming/outgoing objects).
 */
export class UrlStatsMapper {
  static toAggregateStats(stats: UrlStats): UrlAggregateStats {
    const { forwardTotal, backwardTotal, forwardByType, backwardByType } =
      stats.connections;

    const outgoing: ConnectionStatsDTO = { total: forwardTotal };
    const incoming: ConnectionStatsDTO = { total: backwardTotal };
    const all: ConnectionStatsDTO = { total: forwardTotal + backwardTotal };

    forwardByType.forEach((count, type) => {
      outgoing[type] = count;
      all[type] = (all[type] ?? 0) + count;
    });
    backwardByType.forEach((count, type) => {
      incoming[type] = count;
      all[type] = (all[type] ?? 0) + count;
    });

    return {
      libraryCount: stats.libraryCount,
      noteCount: stats.noteCount,
      collectionCount: stats.collectionCount,
      connections: { all, incoming, outgoing },
    };
  }
}
