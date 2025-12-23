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

  public static create(props: UrlMetadataProps): Result<UrlMetadata, Error> {
    if (!props.url || props.url.trim().length === 0) {
      return err(new Error('URL is required for metadata'));
    }

    return ok(
      new UrlMetadata({
        ...props,
        retrievedAt: props.retrievedAt || new Date(),
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
