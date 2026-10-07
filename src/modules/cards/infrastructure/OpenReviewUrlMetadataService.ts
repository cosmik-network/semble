import { IMetadataService } from '../domain/services/IMetadataService';
import { UrlMetadata } from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { UrlType } from '../domain/value-objects/UrlType';
import { Result, err } from '../../../shared/core/Result';
import {
  IOpenReviewTokenStore,
  InMemoryOpenReviewTokenStore,
} from './OpenReviewTokenStore';

interface OpenReviewContentField<T> {
  value?: T;
}

interface OpenReviewNote {
  id: string;
  forum?: string;
  content?: {
    title?: OpenReviewContentField<string>;
    authors?: OpenReviewContentField<string[]>;
    abstract?: OpenReviewContentField<string>;
    venue?: OpenReviewContentField<string>;
    DOI?: OpenReviewContentField<string>;
  };
  cdate?: number;
  pdate?: number;
  odate?: number;
}

interface OpenReviewNotesResponse {
  notes?: OpenReviewNote[];
}

interface OpenReviewLoginResponse {
  token?: string;
}

class OpenReviewAuthError extends Error {}

/**
 * Fetches metadata for OpenReview forum pages (openreview.net/forum?id={forumId})
 * from the OpenReview API. Anonymous API requests are challenged, so this
 * service logs in with an account and keeps the token in the token store
 * until it expires or is rejected.
 */
export class OpenReviewUrlMetadataService implements IMetadataService {
  private static readonly DEFAULT_BASE_URL = 'https://api2.openreview.net';
  private static readonly SITE_NAME = 'OpenReview';
  private static readonly REQUEST_TIMEOUT_MS = 10_000;
  // Drop the stored token this long before its exp so in-flight requests
  // don't race the expiry
  private static readonly TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;
  // Used when the token's exp can't be read (tokens currently last 24h)
  private static readonly FALLBACK_TOKEN_TTL_MS = 60 * 60 * 1000;

  private loginPromise: Promise<string> | null = null;

  constructor(
    private readonly email: string,
    private readonly password: string,
    private readonly tokenStore: IOpenReviewTokenStore = new InMemoryOpenReviewTokenStore(),
    private readonly baseUrl: string = OpenReviewUrlMetadataService.DEFAULT_BASE_URL,
  ) {}

  /** True for openreview.net/forum?id={forumId} URLs. */
  static canHandle(url: URL): boolean {
    return OpenReviewUrlMetadataService.extractForumId(url.value) !== null;
  }

  static extractForumId(urlValue: string): string | null {
    let parsed: globalThis.URL;
    try {
      parsed = new globalThis.URL(urlValue);
    } catch {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== 'openreview.net' && host !== 'www.openreview.net') {
      return null;
    }
    if (parsed.pathname.replace(/\/+$/, '') !== '/forum') {
      return null;
    }

    const id = parsed.searchParams.get('id')?.trim();
    return id ? id : null;
  }

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    const forumId = OpenReviewUrlMetadataService.extractForumId(url.value);
    if (!forumId) {
      return err(new Error(`Not an OpenReview forum URL: ${url.value}`));
    }

    if (!this.email || !this.password) {
      return err(new Error('OpenReview credentials are not configured'));
    }

    try {
      let note: OpenReviewNote | undefined;
      try {
        note = await this.fetchNote(forumId);
      } catch (error) {
        if (!(error instanceof OpenReviewAuthError)) throw error;
        // Token expired or revoked — log in again and retry once
        await this.clearStoredToken();
        note = await this.fetchNote(forumId);
      }

      if (!note) {
        return err(new Error(`No OpenReview note found for id ${forumId}`));
      }

      return this.toUrlMetadata(url, note);
    } catch (error) {
      return err(
        new Error(
          `Failed to fetch metadata from OpenReview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.email || !this.password) {
      return false;
    }
    try {
      await this.getToken();
      return true;
    } catch {
      return false;
    }
  }

  private async fetchNote(
    forumId: string,
  ): Promise<OpenReviewNote | undefined> {
    const token = await this.getToken();
    const response = await fetch(
      `${this.baseUrl}/notes?id=${encodeURIComponent(forumId)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(
          OpenReviewUrlMetadataService.REQUEST_TIMEOUT_MS,
        ),
      },
    );

    if (response.status === 401 || response.status === 403) {
      throw new OpenReviewAuthError(
        `OpenReview rejected the access token (status ${response.status})`,
      );
    }
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(
        `OpenReview API request failed with status ${response.status} and message: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as OpenReviewNotesResponse;
    return data.notes?.[0];
  }

  private async getToken(): Promise<string> {
    try {
      const stored = await this.tokenStore.get();
      if (stored) {
        return stored;
      }
    } catch (error) {
      // Store unavailable (e.g. Redis down) — log in directly
      console.warn('Failed to read OpenReview token from store:', error);
    }
    // Dedupe concurrent logins within this process
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => {
        this.loginPromise = null;
      });
    }
    return this.loginPromise;
  }

  private async login(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: this.email, password: this.password }),
      signal: AbortSignal.timeout(
        OpenReviewUrlMetadataService.REQUEST_TIMEOUT_MS,
      ),
    });

    if (!response.ok) {
      throw new Error(`OpenReview login failed with status ${response.status}`);
    }

    const data = (await response.json()) as OpenReviewLoginResponse;
    if (!data.token) {
      throw new Error('OpenReview login response did not include a token');
    }

    try {
      await this.tokenStore.set(data.token, this.getTokenExpiry(data.token));
    } catch (error) {
      console.warn('Failed to store OpenReview token:', error);
    }
    return data.token;
  }

  private async clearStoredToken(): Promise<void> {
    try {
      await this.tokenStore.delete();
    } catch (error) {
      console.warn('Failed to clear OpenReview token from store:', error);
    }
  }

  /** Read exp from the JWT payload (no verification needed — we only use it for caching). */
  private getTokenExpiry(token: string): Date {
    const now = Date.now();
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
      ) as { exp?: number };
      if (typeof payload.exp === 'number') {
        return new Date(
          payload.exp * 1000 -
            OpenReviewUrlMetadataService.TOKEN_EXPIRY_MARGIN_MS,
        );
      }
    } catch {
      // Not a decodable JWT — fall through
    }
    return new Date(now + OpenReviewUrlMetadataService.FALLBACK_TOKEN_TTL_MS);
  }

  private toUrlMetadata(url: URL, note: OpenReviewNote): Result<UrlMetadata> {
    const content = note.content ?? {};
    const authors = content.authors?.value?.filter((a) => a.trim().length > 0);
    // Prefer publication date, then online date, then creation date
    const timestamp = note.pdate ?? note.odate ?? note.cdate;

    return UrlMetadata.create({
      url: url.value,
      title: content.title?.value,
      description: content.abstract?.value,
      author: authors && authors.length > 0 ? authors.join(', ') : undefined,
      publishedDate: timestamp !== undefined ? new Date(timestamp) : undefined,
      siteName: content.venue?.value || OpenReviewUrlMetadataService.SITE_NAME,
      type: UrlType.RESEARCH,
      doi: content.DOI?.value,
    });
  }
}
