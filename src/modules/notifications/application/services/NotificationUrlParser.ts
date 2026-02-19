import { Result, ok, err } from '../../../../shared/core/Result';

export interface BlueskyPostUrlParts {
  type: 'BLUESKY_POST';
  handleOrDid: string;
  postId: string;
}

export interface SembleCollectionUrlParts {
  type: 'SEMBLE_COLLECTION';
  handleOrDid: string;
  rkey: string;
}

export type ParsedUrlParts = BlueskyPostUrlParts | SembleCollectionUrlParts;

export class NotificationUrlParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationUrlParserError';
  }
}

export class NotificationUrlParser {
  private static readonly BLUESKY_POST_PATTERN =
    /^https:\/\/bsky\.app\/profile\/([^\/]+)\/post\/([^\/]+)$/;
  private static readonly BLACKSKY_POST_PATTERN =
    /^https:\/\/blacksky\.community\/profile\/([^\/]+)\/post\/([^\/]+)$/;
  private static readonly SEMBLE_COLLECTION_PATTERN_TEMPLATE = (
    appUrl: string,
  ) =>
    new RegExp(
      `^${appUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/profile\\/([^\\/]+)\\/collections\\/([^\\/]+)$`,
    );

  /**
   * Parse a Bluesky post URL
   * Example: https://bsky.app/profile/alice.bsky.social/post/3mfaast5u2k24
   */
  public static parseBlueskyPostUrl(
    url: string,
  ): Result<BlueskyPostUrlParts, NotificationUrlParserError> {
    const match = url.match(this.BLUESKY_POST_PATTERN);
    if (!match) {
      return err(
        new NotificationUrlParserError(
          'URL does not match Bluesky post pattern',
        ),
      );
    }

    return ok({
      type: 'BLUESKY_POST',
      handleOrDid: match[1]!,
      postId: match[2]!,
    });
  }

  /**
   * Parse a Blacksky post URL
   * Example: https://blacksky.community/profile/did:plc:lehcqqkwzcwvjvw66uthu5oq/post/3mfaast5u2k24
   */
  public static parseBlackskyPostUrl(
    url: string,
  ): Result<BlueskyPostUrlParts, NotificationUrlParserError> {
    const match = url.match(this.BLACKSKY_POST_PATTERN);
    if (!match) {
      return err(
        new NotificationUrlParserError(
          'URL does not match Blacksky post pattern',
        ),
      );
    }

    return ok({
      type: 'BLUESKY_POST',
      handleOrDid: match[1]!,
      postId: match[2]!,
    });
  }

  /**
   * Parse a Semble collection URL
   * Example: https://semble.so/profile/chrisshank.com/collections/3memb5r6q3r2y
   * Returns the handle/DID and rkey (record key), not the collection ID
   */
  public static parseSembleCollectionUrl(
    url: string,
    appUrl: string,
  ): Result<SembleCollectionUrlParts, NotificationUrlParserError> {
    const pattern = this.SEMBLE_COLLECTION_PATTERN_TEMPLATE(appUrl);
    const match = url.match(pattern);

    if (!match) {
      return err(
        new NotificationUrlParserError(
          'URL does not match Semble collection pattern',
        ),
      );
    }

    return ok({
      type: 'SEMBLE_COLLECTION',
      handleOrDid: match[1]!,
      rkey: match[2]!,
    });
  }

  /**
   * Main method that tries all parsers to extract mentioned entity from URL
   * Returns null if URL doesn't match any known pattern
   */
  public static extractMentionedEntityFromUrl(
    url: string,
    appUrl: string,
  ): ParsedUrlParts | null {
    // Try Bluesky post
    const blueskyResult = this.parseBlueskyPostUrl(url);
    if (blueskyResult.isOk()) {
      return blueskyResult.value;
    }

    // Try Blacksky post
    const blackskyResult = this.parseBlackskyPostUrl(url);
    if (blackskyResult.isOk()) {
      return blackskyResult.value;
    }

    // Try Semble collection
    const collectionResult = this.parseSembleCollectionUrl(url, appUrl);
    if (collectionResult.isOk()) {
      return collectionResult.value;
    }

    // No pattern matched
    return null;
  }
}
