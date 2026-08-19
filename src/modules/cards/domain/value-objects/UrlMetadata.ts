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

  public isStale(maxAgeHours: number = 24): boolean {
    if (!this.retrievedAt) {
      return true; // If no retrievedAt, consider it stale
    }
    const ageInHours =
      (Date.now() - this.retrievedAt.getTime()) / (1000 * 60 * 60);
    return ageInHours > maxAgeHours;
  }
}
