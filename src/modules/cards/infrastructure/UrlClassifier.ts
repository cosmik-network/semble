import { UrlType } from '../domain/value-objects/UrlType';

export interface UrlPattern {
  regex: RegExp;
  type: UrlType;
  description?: string;
}

export class UrlClassifier {
  private static readonly patterns: UrlPattern[] = [
    // Academic and Research
    {
      regex: /^https?:\/\/(www\.)?arxiv\.org\/abs\//i,
      type: UrlType.RESEARCH,
      description: 'arXiv preprints',
    },
    {
      regex: /^https?:\/\/(www\.)?doi\.org\//i,
      type: UrlType.RESEARCH,
      description: 'DOI links',
    },
    {
      regex: /^https?:\/\/(www\.)?pubmed\.ncbi\.nlm\.nih\.gov\//i,
      type: UrlType.RESEARCH,
      description: 'PubMed articles',
    },
    {
      regex: /^https?:\/\/(www\.)?scholar\.google\./i,
      type: UrlType.RESEARCH,
      description: 'Google Scholar',
    },
    {
      regex: /^https?:\/\/(www\.)?researchgate\.net\//i,
      type: UrlType.RESEARCH,
      description: 'ResearchGate',
    },
    {
      regex: /^https?:\/\/(www\.)?biorxiv\.org\//i,
      type: UrlType.RESEARCH,
      description: 'bioRxiv preprints',
    },
    {
      regex: /^https?:\/\/(www\.)?medrxiv\.org\//i,
      type: UrlType.RESEARCH,
      description: 'medRxiv preprints',
    },

    // Video platforms
    {
      regex: /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/i,
      type: UrlType.VIDEO,
      description: 'YouTube videos',
    },
    {
      regex: /^https?:\/\/(www\.)?vimeo\.com\//i,
      type: UrlType.VIDEO,
      description: 'Vimeo videos',
    },
    {
      regex: /^https?:\/\/(www\.)?twitch\.tv\//i,
      type: UrlType.VIDEO,
      description: 'Twitch streams',
    },
    {
      regex: /^https?:\/\/(www\.)?tiktok\.com\//i,
      type: UrlType.VIDEO,
      description: 'TikTok videos',
    },

    // Audio platforms
    {
      regex: /^https?:\/\/(www\.)?spotify\.com\//i,
      type: UrlType.AUDIO,
      description: 'Spotify',
    },
    {
      regex: /^https?:\/\/(www\.)?soundcloud\.com\//i,
      type: UrlType.AUDIO,
      description: 'SoundCloud',
    },
    {
      regex: /^https?:\/\/(www\.)?podcasts\.apple\.com\//i,
      type: UrlType.AUDIO,
      description: 'Apple Podcasts',
    },
    {
      regex: /^https?:\/\/(www\.)?anchor\.fm\//i,
      type: UrlType.AUDIO,
      description: 'Anchor podcasts',
    },

    // Social media
    {
      regex: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i,
      type: UrlType.SOCIAL,
      description: 'Twitter/X',
    },
    {
      regex: /^https?:\/\/(www\.)?linkedin\.com\//i,
      type: UrlType.SOCIAL,
      description: 'LinkedIn',
    },
    {
      regex: /^https?:\/\/(www\.)?facebook\.com\//i,
      type: UrlType.SOCIAL,
      description: 'Facebook',
    },
    {
      regex: /^https?:\/\/(www\.)?instagram\.com\//i,
      type: UrlType.SOCIAL,
      description: 'Instagram',
    },
    {
      regex: /^https?:\/\/(www\.)?reddit\.com\//i,
      type: UrlType.SOCIAL,
      description: 'Reddit',
    },
    {
      regex: /^https?:\/\/(www\.)?mastodon\./i,
      type: UrlType.SOCIAL,
      description: 'Mastodon instances',
    },

    // Books and reading
    {
      regex: /^https?:\/\/(www\.)?amazon\.(com|co\.uk|de|fr|it|es|ca|com\.au)\/.*\/dp\//i,
      type: UrlType.BOOK,
      description: 'Amazon books',
    },
    {
      regex: /^https?:\/\/(www\.)?goodreads\.com\//i,
      type: UrlType.BOOK,
      description: 'Goodreads',
    },
    {
      regex: /^https?:\/\/(www\.)?openlibrary\.org\//i,
      type: UrlType.BOOK,
      description: 'Open Library',
    },

    // Software and development
    {
      regex: /^https?:\/\/(www\.)?github\.com\//i,
      type: UrlType.SOFTWARE,
      description: 'GitHub repositories',
    },
    {
      regex: /^https?:\/\/(www\.)?gitlab\.com\//i,
      type: UrlType.SOFTWARE,
      description: 'GitLab repositories',
    },
    {
      regex: /^https?:\/\/(www\.)?npmjs\.com\//i,
      type: UrlType.SOFTWARE,
      description: 'npm packages',
    },
    {
      regex: /^https?:\/\/(www\.)?pypi\.org\//i,
      type: UrlType.SOFTWARE,
      description: 'Python packages',
    },
    {
      regex: /^https?:\/\/(www\.)?stackoverflow\.com\//i,
      type: UrlType.SOFTWARE,
      description: 'Stack Overflow',
    },

    // Events
    {
      regex: /^https?:\/\/(www\.)?eventbrite\./i,
      type: UrlType.EVENT,
      description: 'Eventbrite events',
    },
    {
      regex: /^https?:\/\/(www\.)?meetup\.com\//i,
      type: UrlType.EVENT,
      description: 'Meetup events',
    },
    {
      regex: /^https?:\/\/(www\.)?facebook\.com\/events\//i,
      type: UrlType.EVENT,
      description: 'Facebook events',
    },

    // News and articles (more specific patterns)
    {
      regex: /^https?:\/\/(www\.)?(bbc\.com|bbc\.co\.uk)\/news\//i,
      type: UrlType.ARTICLE,
      description: 'BBC News',
    },
    {
      regex: /^https?:\/\/(www\.)?nytimes\.com\//i,
      type: UrlType.ARTICLE,
      description: 'New York Times',
    },
    {
      regex: /^https?:\/\/(www\.)?theguardian\.com\//i,
      type: UrlType.ARTICLE,
      description: 'The Guardian',
    },
    {
      regex: /^https?:\/\/(www\.)?reuters\.com\//i,
      type: UrlType.ARTICLE,
      description: 'Reuters',
    },
    {
      regex: /^https?:\/\/(www\.)?cnn\.com\//i,
      type: UrlType.ARTICLE,
      description: 'CNN',
    },
    {
      regex: /^https?:\/\/(www\.)?medium\.com\//i,
      type: UrlType.ARTICLE,
      description: 'Medium articles',
    },
    {
      regex: /^https?:\/\/[^\/]+\.medium\.com\//i,
      type: UrlType.ARTICLE,
      description: 'Medium custom domains',
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
    const index = this.patterns.findIndex(p => p.description === description);
    if (index !== -1) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }
}
