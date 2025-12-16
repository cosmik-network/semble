import { URL } from '../../../domain/value-objects/URL';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { ICardRepository } from '../../../domain/ICardRepository';
import { UseCase } from 'src/shared/core/UseCase';
import { err, ok, Result } from 'src/shared/core/Result';
import { UrlMetadata } from 'src/modules/cards/domain/value-objects/UrlMetadata';

export interface GetUrlMetadataQuery {
  url: string;
}

export interface GetUrlMetadataResult {
  metadata: {
    url: string;
    title?: string;
    description?: string;
    author?: string;
    siteName?: string;
    imageUrl?: string;
    type?: string;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetUrlMetadataUseCase
  implements UseCase<GetUrlMetadataQuery, Result<GetUrlMetadataResult>>
{
  constructor(
    private metadataService: IMetadataService,
    private cardRepository: ICardRepository,
  ) {}

  async execute(
    query: GetUrlMetadataQuery,
  ): Promise<Result<GetUrlMetadataResult>> {
    // Validate and create URL value object
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }
    const url = urlResult.value;

    try {
      // Fetch metadata from external service
      let metadataResult = await this.metadataService.fetchMetadata(url);
      if (metadataResult.isErr()) {
        metadataResult = UrlMetadata.create({ url: url.value });
        if (metadataResult.isErr()) {
          return err(
            new Error(
              `Failed to fetch metadata: ${metadataResult.error instanceof Error ? metadataResult.error.message : 'Unknown error'}`,
            ),
          );
        }
      }

      const metadata = metadataResult.value;

      return ok({
        metadata: {
          url: url.value,
          title: metadata.title,
          description: metadata.description,
          author: metadata.author,
          siteName: metadata.siteName,
          imageUrl: metadata.imageUrl,
          type: metadata.type,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to get URL metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
