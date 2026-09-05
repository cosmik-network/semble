import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Result, ok, err } from '../../../../shared/core/Result';
import { UrlType } from './UrlType';

export interface UrlMetadataProps {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: Date;
  siteName?: string;
  imageUrl?: string;
  type?: UrlType;
  retrievedAt?: Date;
  doi?: string;
  isbn?: string;
}

/**
 * Input accepted by `create`. Dates may arrive as Date objects (from a metadata
 * service) or as ISO strings (from JSONB, a cache, or a vector store). `create`
 * normalizes both to Date so consumers can safely call `.toISOString()`.
 */
export type UrlMetadataInput = Omit<
  UrlMetadataProps,
  'publishedDate' | 'retrievedAt'
> & {
  publishedDate?: Date | string;
  retrievedAt?: Date | string;
};

/**
 * Coerce to a valid Date, or undefined. Returning undefined rather than an
 * Invalid Date keeps `.toISOString()` and date arithmetic from throwing/NaN-ing
 * downstream — partial dates (e.g. Citoid's "2023") land here as unparseable.
 */
function coerceDate(value: Date | string | undefined): Date | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

export class UrlMetadata extends ValueObject<UrlMetadataProps> {
  get url(): string {
    return this.props.url;
  }

  get title(): string | undefined {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get author(): string | undefined {
    return this.props.author;
  }

  get publishedDate(): Date | undefined {
    return this.props.publishedDate;
  }

  get siteName(): string | undefined {
    return this.props.siteName;
  }

  get imageUrl(): string | undefined {
    return this.props.imageUrl;
  }

  get type(): UrlType | undefined {
    return this.props.type;
  }

  get retrievedAt(): Date | undefined {
    return this.props.retrievedAt;
  }

  get doi(): string | undefined {
    return this.props.doi;
  }

  get isbn(): string | undefined {
    return this.props.isbn;
  }

  private constructor(props: UrlMetadataProps) {
    super(props);
  }

  public static create(props: UrlMetadataInput): Result<UrlMetadata, Error> {
    if (!props.url || props.url.trim().length === 0) {
      return err(new Error('URL is required for metadata'));
    }

    // Normalize date-ish inputs so publishedDate/retrievedAt are always real
    // Date objects (or absent) regardless of whether they came from a metadata
    // service, JSONB, or a cache.
    return ok(
      new UrlMetadata({
        ...props,
        publishedDate: coerceDate(props.publishedDate),
        retrievedAt: coerceDate(props.retrievedAt) || new Date(),
      }),
    );
  }

  /**
   * Pick between two metadata versions using the composite-service rules:
   * a specific (non-LINK) type beats LINK, and when both are specific but
   * disagree the specialist (Citoid / slow fetch) wins; otherwise the
   * generalist (Iframely / existing) is kept.
   *
   * Single source of truth shared by CompositeMetadataService.selectBestMetadata
   * and computeEnrichment.
   */
  public static selectBest(
    generalist: UrlMetadata,
    specialist: UrlMetadata,
  ): UrlMetadata {
    const generalistType = generalist.type || UrlType.LINK;
    const specialistType = specialist.type || UrlType.LINK;

    // If one returns 'link' (generic) and the other returns something more specific
    if (generalistType === UrlType.LINK && specialistType !== UrlType.LINK) {
      return specialist;
    }

    if (specialistType === UrlType.LINK && generalistType !== UrlType.LINK) {
      return generalist;
    }

    // If both return different types, prefer the specialist (scholarly content)
    if (specialistType !== generalistType) {
      return specialist;
    }

    // Default to the generalist
    return generalist;
  }

  /** Merge two versions: primary values win, the fallback fills the gaps. */
  public static merge(
    primary: UrlMetadata,
    fallback: UrlMetadata,
  ): UrlMetadata {
    // We know this will succeed since both primary and fallback are valid
    return UrlMetadata.create({
      url: primary.url, // URL should always be the same
      title: primary.title || fallback.title,
      description: primary.description || fallback.description,
      author: primary.author || fallback.author,
      publishedDate: primary.publishedDate || fallback.publishedDate,
      siteName: primary.siteName || fallback.siteName,
      imageUrl: primary.imageUrl || fallback.imageUrl,
      type: primary.type || fallback.type,
      retrievedAt: primary.retrievedAt || fallback.retrievedAt,
      doi: primary.doi || fallback.doi,
      isbn: primary.isbn || fallback.isbn,
    }).unwrap();
  }

  /** Field-wise equality of the content fields (retrievedAt excluded — it's bookkeeping). */
  private static contentEquals(a: UrlMetadata, b: UrlMetadata): boolean {
    return (
      a.title === b.title &&
      a.description === b.description &&
      a.author === b.author &&
      a.publishedDate?.getTime() === b.publishedDate?.getTime() &&
      a.siteName === b.siteName &&
      a.imageUrl === b.imageUrl &&
      a.type === b.type &&
      a.doi === b.doi &&
      a.isbn === b.isbn
    );
  }

  /**
   * Decide whether `candidate` (a full/slow metadata fetch) enriches `current`
   * (typically a fast fetch stored on a card), and compute the merged result.
   *
   * Uses exactly the same selection + merge logic as CompositeMetadataService:
   * selectBest picks the winner (candidate plays the specialist role), merge
   * fills its gaps from the loser. shouldUpdate is true when the outcome
   * differs from the current content, so re-runs converge instead of
   * flip-flopping. The merged result always carries the candidate's
   * retrievedAt since it is the fresher fetch.
   */
  public static computeEnrichment(
    current: UrlMetadata | undefined,
    candidate: UrlMetadata,
  ): { shouldUpdate: boolean; merged: UrlMetadata } {
    if (!current) {
      return { shouldUpdate: true, merged: candidate };
    }

    const selected = UrlMetadata.selectBest(current, candidate);
    const other = selected === current ? candidate : current;
    const mergedContent = UrlMetadata.merge(selected, other);

    const merged = UrlMetadata.create({
      ...mergedContent.props,
      retrievedAt: candidate.retrievedAt || mergedContent.retrievedAt,
    }).unwrap();

    return {
      shouldUpdate: !UrlMetadata.contentEquals(mergedContent, current),
      merged,
    };
  }

  public isStale(maxAgeHours: number = 24): boolean {
    if (!this.retrievedAt) {
      return true; // If no retrievedAt, consider it stale
    }
    const ageInHours =
      (Date.now() - this.retrievedAt.getTime()) / (1000 * 60 * 60);
    return ageInHours > maxAgeHours;
  }
}
