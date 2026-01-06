import { IMetadataService } from '../domain/services/IMetadataService';
import { UrlMetadata } from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { UrlType } from '../domain/value-objects/UrlType';
import { Result, ok, err } from '../../../shared/core/Result';

export enum DefaultServicePreference {
  IFRAMELY = 'iframely',
  CITOID = 'citoid',
}

export interface CompositeMetadataServiceConfig {
  defaultService: DefaultServicePreference;
}

export class CompositeMetadataService implements IMetadataService {
  private readonly iframelyService: IMetadataService;
  private readonly citoidService: IMetadataService;
  private readonly config: CompositeMetadataServiceConfig;

  constructor(
    iframelyService: IMetadataService,
    citoidService: IMetadataService,
    config: CompositeMetadataServiceConfig = {
      defaultService: DefaultServicePreference.IFRAMELY,
    },
  ) {
    this.iframelyService = iframelyService;
    this.citoidService = citoidService;
    this.config = config;
  }

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    // Fetch metadata from both services concurrently
    const [iframelyResult, citoidResult] = await Promise.allSettled([
      this.iframelyService.fetchMetadata(url),
      this.citoidService.fetchMetadata(url),
    ]);

    // Extract successful results
    const iframelySuccess =
      iframelyResult.status === 'fulfilled' && iframelyResult.value.isOk()
        ? iframelyResult.value.value
        : null;

    const citoidSuccess =
      citoidResult.status === 'fulfilled' && citoidResult.value.isOk()
        ? citoidResult.value.value
        : null;

    // If both failed, return an error
    if (!iframelySuccess && !citoidSuccess) {
      const iframelyError =
        iframelyResult.status === 'fulfilled'
          ? iframelyResult.value.isErr()
            ? iframelyResult.value.error
            : new Error('Iframely service failed')
          : new Error('Iframely service failed');
      const citoidError =
        citoidResult.status === 'fulfilled'
          ? citoidResult.value.isErr()
            ? citoidResult.value.error
            : new Error('Citoid service failed')
          : new Error('Citoid service failed');

      return err(
        new Error(
          `Both metadata services failed. Iframely: ${iframelyError?.message}. Citoid: ${citoidError?.message}`,
        ),
      );
    }

    // If only one succeeded, use that one
    if (iframelySuccess && !citoidSuccess) {
      return ok(iframelySuccess);
    }

    if (citoidSuccess && !iframelySuccess) {
      return ok(citoidSuccess);
    }

    // Both succeeded, apply selection logic and merge missing fields
    if (iframelySuccess && citoidSuccess) {
      const selectedMetadata = this.selectBestMetadata(
        iframelySuccess,
        citoidSuccess,
      );
      const mergedMetadata = this.mergeMetadata(
        selectedMetadata,
        selectedMetadata === iframelySuccess ? citoidSuccess : iframelySuccess,
      );
      return ok(mergedMetadata);
    }

    // This should never happen, but just in case
    return err(new Error('Unexpected error in metadata selection'));
  }

  async isAvailable(): Promise<boolean> {
    // Service is available if at least one of the underlying services is available
    const [iframelyAvailable, citoidAvailable] = await Promise.all([
      this.iframelyService.isAvailable(),
      this.citoidService.isAvailable(),
    ]);

    return iframelyAvailable || citoidAvailable;
  }

  private selectBestMetadata(
    iframelyMetadata: UrlMetadata,
    citoidMetadata: UrlMetadata,
  ): UrlMetadata {
    const iframelyType = iframelyMetadata.type || UrlType.LINK;
    const citoidType = citoidMetadata.type || UrlType.LINK;

    // If one returns 'link' (generic) and the other returns something more specific
    if (iframelyType === UrlType.LINK && citoidType !== UrlType.LINK) {
      return citoidMetadata;
    }

    if (citoidType === UrlType.LINK && iframelyType !== UrlType.LINK) {
      return iframelyMetadata;
    }

    // If both return the same type or different specific types, use default preference
    if (this.config.defaultService === DefaultServicePreference.CITOID) {
      return citoidMetadata;
    }

    // Default to Iframely
    return iframelyMetadata;
  }

  /**
   * Update the default service preference
   */
  public setDefaultService(defaultService: DefaultServicePreference): void {
    this.config.defaultService = defaultService;
  }

  /**
   * Get the current default service preference
   */
  public getDefaultService(): DefaultServicePreference {
    return this.config.defaultService;
  }

  /**
   * Get metadata from a specific service for debugging/testing purposes
   */
  public async fetchFromIframely(url: URL): Promise<Result<UrlMetadata>> {
    return this.iframelyService.fetchMetadata(url);
  }

  /**
   * Get metadata from a specific service for debugging/testing purposes
   */
  public async fetchFromCitoid(url: URL): Promise<Result<UrlMetadata>> {
    return this.citoidService.fetchMetadata(url);
  }

  /**
   * Merge metadata by taking missing fields from the fallback metadata
   */
  private mergeMetadata(
    primary: UrlMetadata,
    fallback: UrlMetadata,
  ): UrlMetadata {
    // Create merged props by taking primary values first, then fallback for missing fields
    const mergedProps = {
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
    };

    // Create new UrlMetadata with merged props
    // We know this will succeed since both primary and fallback are valid
    return UrlMetadata.create(mergedProps).unwrap();
  }
}
