import { UrlType } from '../domain/value-objects/UrlType';

export interface UrlPattern {
  regex: RegExp;
  type: UrlType;
  description?: string;
}

export class UrlClassifier {
  private static readonly patterns: UrlPattern[] = [
    {
      regex: /^https:\/\/bsky\.app\/profile\/[^/]+\/post\/[^/]+$/,
      type: UrlType.SOCIAL,
      description: 'Bluesky post',
    },
    {
      regex: /^https:\/\/blacksky\.community\/profile\/[^/]+\/post\/[^/]+$/,
      type: UrlType.SOCIAL,
      description: 'Blacksky community post',
    },
    {
      regex: /^https:\/\/deer\.social\/profile\/[^/]+\/post\/[^/]+$/,
      type: UrlType.SOCIAL,
      description: 'Deer social post',
    },
    {
      regex: /^https:\/\/smokesignal\.events\/[^/]+\/[^/]+$/,
      type: UrlType.EVENT,
      description: 'Smokesignal event',
    },
    {
      regex: /^https:\/\/tangled\.org\/[^/]+\/[^/]+$/,
      type: UrlType.SOFTWARE,
      description: 'Tangled repo',
    },
    {
      regex: /^https:\/\/[^./]+\.leaflet\.pub\/[^/]+$/,
      type: UrlType.ARTICLE,
      description: 'Leaflet article',
    },
  ];

  /**
   * Classify a URL based on hardcoded regex patterns
   * @param url The URL to classify
   * @returns The classified UrlType or null if no pattern matches
   */
  public static classifyUrl(url: string): UrlType | null {
    for (const pattern of this.patterns) {
      if (pattern.regex.test(url)) {
        return pattern.type;
      }
    }
    return null;
  }

  /**
   * Get all configured patterns (useful for debugging or configuration UI)
   */
  public static getPatterns(): readonly UrlPattern[] {
    return this.patterns;
  }

  /**
   * Add a new pattern at runtime (useful for dynamic configuration)
   */
  public static addPattern(pattern: UrlPattern): void {
    this.patterns.unshift(pattern); // Add to beginning for higher priority
  }

  /**
   * Remove a pattern by description
   */
  public static removePattern(description: string): boolean {
    const index = this.patterns.findIndex((p) => p.description === description);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }
}
