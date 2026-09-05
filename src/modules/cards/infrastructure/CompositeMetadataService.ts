import {
  IMetadataService,
  MetadataFetchMode,
} from '../domain/services/IMetadataService';
import { UrlMetadata } from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { Result, ok, err } from '../../../shared/core/Result';
import { UrlClassifier } from './UrlClassifier';

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

  // Grace window fast mode gives the slower service before giving up on it —
  // long enough for a Redis cache hit, far shorter than an upstream fetch.
  private static readonly FAST_MODE_SECONDARY_TIMEOUT_MS = 150;

  async fetchMetadata(
    url: URL,
    refetchStaleMetadata: boolean = false,
    mode: MetadataFetchMode = 'slow',
  ): Promise<Result<UrlMetadata>> {
    // Fetch metadata from both services concurrently
    const iframelyPromise = this.iframelyService.fetchMetadata(
      url,
      refetchStaleMetadata,
    );
    const citoidPromise = this.citoidService.fetchMetadata(
      url,
      refetchStaleMetadata,
    );

    let iframelyResult: PromiseSettledResult<Result<UrlMetadata>>;
    let citoidResult: PromiseSettledResult<Result<UrlMetadata>> | null;

    if (mode === 'fast') {
      // Block only on Iframely; merge Citoid in only if it settles within the
      // grace window (a cache hit). Otherwise it keeps running in the
      // background, warming the cache for the async slow pass.
      [iframelyResult, citoidResult] = await Promise.all([
        this.settle(iframelyPromise),
        this.settleWithinTimeout(
          citoidPromise,
          CompositeMetadataService.FAST_MODE_SECONDARY_TIMEOUT_MS,
        ),
      ]);

      if (!citoidResult) {
        if (
          iframelyResult.status === 'rejected' ||
          iframelyResult.value.isErr()
        ) {
          // Iframely gave us nothing — waiting on Citoid beats returning an error
          citoidResult = await this.settle(citoidPromise);
        } else {
          // Fire-and-forget: swallow late failures so they don't become
          // unhandled rejections
          citoidPromise.catch((error) => {
            console.warn(
              `Background Citoid fetch failed for ${url.value}:`,
              error,
            );
          });
        }
      }
    } else {
      [iframelyResult, citoidResult] = await Promise.allSettled([
        iframelyPromise,
        citoidPromise,
      ]);
    }

    // Extract successful results
    const iframelySuccess =
      iframelyResult.status === 'fulfilled' && iframelyResult.value.isOk()
        ? iframelyResult.value.value
        : null;

    const citoidSuccess =
      citoidResult?.status === 'fulfilled' && citoidResult.value.isOk()
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
        citoidResult?.status === 'fulfilled'
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
      const finalMetadata = this.applyUrlClassification(iframelySuccess, url);
      return ok(finalMetadata);
    }

    if (citoidSuccess && !iframelySuccess) {
      const finalMetadata = this.applyUrlClassification(citoidSuccess, url);
      return ok(finalMetadata);
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
      const finalMetadata = this.applyUrlClassification(mergedMetadata, url);
      return ok(finalMetadata);
    }

    // This should never happen, but just in case
    return err(new Error('Unexpected error in metadata selection'));
  }

  /** Await a promise and report its outcome without ever rejecting. */
  private settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
    return promise.then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (reason) => ({ status: 'rejected' as const, reason }),
    );
  }

  /** Like settle(), but resolves to null if the promise hasn't settled within timeoutMs. */
  private settleWithinTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<PromiseSettledResult<T> | null> {
    return Promise.race([
      this.settle(promise),
      new Promise<null>((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        // Don't keep the process alive just for this grace window
        timer.unref?.();
      }),
    ]);
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
    // Shared with UrlMetadata.computeEnrichment: Citoid is the specialist
    return UrlMetadata.selectBest(iframelyMetadata, citoidMetadata);
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
  public async fetchFromIframely(
    url: URL,
    refetchStaleMetadata: boolean = false,
  ): Promise<Result<UrlMetadata>> {
    return this.iframelyService.fetchMetadata(url, refetchStaleMetadata);
  }

  /**
   * Get metadata from a specific service for debugging/testing purposes
   */
  public async fetchFromCitoid(
    url: URL,
    refetchStaleMetadata: boolean = false,
  ): Promise<Result<UrlMetadata>> {
    return this.citoidService.fetchMetadata(url, refetchStaleMetadata);
  }

  /**
   * Apply URL classification based on hardcoded regex patterns
   * This overrides the type from metadata services if a pattern matches
   */
  private applyUrlClassification(metadata: UrlMetadata, url: URL): UrlMetadata {
    const classifiedType = UrlClassifier.classifyUrl(url.value);

    if (classifiedType) {
      // Override the type with the classified type
      const updatedProps = {
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        publishedDate: metadata.publishedDate,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        type: classifiedType, // Override with classified type
        retrievedAt: metadata.retrievedAt,
        doi: metadata.doi,
        isbn: metadata.isbn,
      };

      // Create new UrlMetadata with updated type
      return UrlMetadata.create(updatedProps).unwrap();
    }

    // No classification found, return original metadata
    return metadata;
  }

  /**
   * Merge metadata by taking missing fields from the fallback metadata
   */
  private mergeMetadata(
    primary: UrlMetadata,
    fallback: UrlMetadata,
  ): UrlMetadata {
    // Shared with UrlMetadata.computeEnrichment
    return UrlMetadata.merge(primary, fallback);
  }
}
