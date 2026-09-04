import { IMetadataService } from '../domain/services/IMetadataService';
import {
  UrlMetadata,
  UrlMetadataProps,
} from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { UrlType } from '../domain/value-objects/UrlType';
import { Result, err } from '../../../shared/core/Result';
import { UrlClassifier } from './UrlClassifier';

export enum DefaultServicePreference {
  IFRAMELY = 'iframely',
  CITOID = 'citoid',
  HTML = 'html',
}

export interface CompositeMetadataServiceConfig {
  defaultService: DefaultServicePreference;
}

export class CompositeMetadataService implements IMetadataService {
  private readonly iframelyService: IMetadataService;
  private readonly citoidService: IMetadataService;
  private readonly htmlService: IMetadataService;
  private readonly config: CompositeMetadataServiceConfig;

  constructor(
    iframelyService: IMetadataService,
    citoidService: IMetadataService,
    htmlService: IMetadataService,
    config: CompositeMetadataServiceConfig = {
      defaultService: DefaultServicePreference.IFRAMELY,
    },
  ) {
    this.iframelyService = iframelyService;
    this.citoidService = citoidService;
    this.htmlService = htmlService;
    this.config = config;
  }

  async fetchMetadata(
    url: URL,
    refetchStaleMetadata: boolean = false,
  ): Promise<Result<UrlMetadata>> {
    // Fetch metadata from both services concurrently
    const [iframelyResult, citoidResult, htmlResult] = await Promise.allSettled(
      [
        this.iframelyService.fetchMetadata(url, refetchStaleMetadata),
        this.citoidService.fetchMetadata(url, refetchStaleMetadata),
        this.htmlService.fetchMetadata(url, refetchStaleMetadata),
      ],
    );

    // Extract successful results
    const iframelySuccess =
      iframelyResult.status === 'fulfilled' && iframelyResult.value.isOk()
        ? iframelyResult.value.value
        : null;

    const citoidSuccess =
      citoidResult.status === 'fulfilled' && citoidResult.value.isOk()
        ? citoidResult.value.value
        : null;

    const htmlSuccess =
      htmlResult.status === 'fulfilled' && htmlResult.value.isOk()
        ? htmlResult.value.value
        : null;

    // If both failed, return an error
    if (!iframelySuccess && !citoidSuccess && !htmlSuccess) {
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
      const htmlError =
        htmlResult.status === 'fulfilled'
          ? htmlResult.value.isErr()
            ? htmlResult.value.error
            : new Error('HTML service failed')
          : new Error('HTML service failed');

      return err(
        new Error(
          `All metadata services failed. Iframely: ${iframelyError?.message}. Citoid: ${citoidError?.message}. HTML: ${htmlError?.message}`,
        ),
      );
    }

    const classifiedType = UrlClassifier.classifyUrl(url.value);

    const props: UrlMetadataProps = {
      url: url.value, // URL should always be the same
      type:
        classifiedType ||
        htmlSuccess?.type ||
        iframelySuccess?.type ||
        citoidSuccess?.type,
      title:
        htmlSuccess?.title || iframelySuccess?.title || citoidSuccess?.title,
      description:
        htmlSuccess?.description ||
        iframelySuccess?.description ||
        citoidSuccess?.description,
      author:
        htmlSuccess?.author || iframelySuccess?.author || citoidSuccess?.author,
      publishedDate:
        htmlSuccess?.publishedDate ||
        iframelySuccess?.publishedDate ||
        citoidSuccess?.publishedDate,
      siteName:
        htmlSuccess?.siteName ||
        iframelySuccess?.siteName ||
        citoidSuccess?.siteName,
      imageUrl:
        htmlSuccess?.imageUrl ||
        iframelySuccess?.imageUrl ||
        citoidSuccess?.imageUrl,
      retrievedAt:
        htmlSuccess?.retrievedAt ||
        iframelySuccess?.retrievedAt ||
        citoidSuccess?.retrievedAt,
      doi: htmlSuccess?.doi || iframelySuccess?.doi || citoidSuccess?.doi,
      isbn: htmlSuccess?.isbn || iframelySuccess?.isbn || citoidSuccess?.isbn,
      atCanonical:
        htmlSuccess?.atCanonical ||
        iframelySuccess?.atCanonical ||
        citoidSuccess?.atCanonical,
      atAuthors:
        htmlSuccess?.atAuthors ||
        iframelySuccess?.atAuthors ||
        citoidSuccess?.atAuthors,
      atMe: htmlSuccess?.atMe || iframelySuccess?.atMe || citoidSuccess?.atMe,
    };

    return UrlMetadata.create(props);
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

    // If both return different types, prefer Citoid (for scholarly content)
    if (citoidType !== iframelyType) {
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
   * Get metadata from a specific service for debugging/testing purposes
   */
  public async fetchFromHTML(
    url: URL,
    refetchStaleMetadata: boolean = false,
  ): Promise<Result<UrlMetadata>> {
    return this.htmlService.fetchMetadata(url, refetchStaleMetadata);
  }
}
