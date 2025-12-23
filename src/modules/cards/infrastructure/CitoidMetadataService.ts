import { IMetadataService } from '../domain/services/IMetadataService';
import { UrlMetadata } from '../domain/value-objects/UrlMetadata';
import { URL } from '../domain/value-objects/URL';
import { Result, ok, err } from '../../../shared/core/Result';
import { mapCitoidUrlType } from './mappers/CitoidUrlTypeMapper';

interface CitoidCreator {
  firstName?: string;
  lastName?: string;
  creatorType?: string;
  name?: string; // For single-field names (organizations)
}

interface CitoidTag {
  tag: string;
  type?: number;
}

interface CitoidResponse {
  key?: string;
  version?: number;
  itemType?: string;
  creators?: CitoidCreator[];
  tags?: CitoidTag[];
  title?: string;
  date?: string;
  url?: string;
  abstractNote?: string;
  publicationTitle?: string;
  language?: string;
  libraryCatalog?: string;
  accessDate?: string;
  repository?: string;
  archiveID?: string;
  DOI?: string;
  extra?: string;
  websiteTitle?: string;
  blogTitle?: string;
  forumTitle?: string;
  websiteType?: string;
  medium?: string;
  artworkSize?: string;
  runningTime?: string;
  ISBN?: string;
  ISSN?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  edition?: string;
  series?: string;
  seriesNumber?: string;
  place?: string;
  publisher?: string;
  institution?: string;
  university?: string;
  conferenceName?: string;
  proceedingsTitle?: string;
  meetingName?: string;
  reportType?: string;
  reportNumber?: string;
  type?: string;
  // Additional fields from the schema
  numPages?: string;
  numberOfVolumes?: string;
  archive?: string;
  archiveLocation?: string;
  callNumber?: string;
  rights?: string;
  shortTitle?: string;
  artworkMedium?: string;
  audioRecordingFormat?: string;
  seriesTitle?: string;
  label?: string;
  videoRecordingFormat?: string;
  genre?: string;
  distributor?: string;
  studio?: string;
  network?: string;
  episodeNumber?: string;
  programTitle?: string;
  billNumber?: string;
  code?: string;
  codeVolume?: string;
  section?: string;
  codePages?: string;
  legislativeBody?: string;
  session?: string;
  history?: string;
  bookTitle?: string;
  caseName?: string;
  court?: string;
  dateDecided?: string;
  docketNumber?: string;
  reporter?: string;
  reporterVolume?: string;
  firstPage?: string;
  dictionaryTitle?: string;
  encyclopediaTitle?: string;
  subject?: string;
  letterType?: string;
  interviewMedium?: string;
  journalAbbreviation?: string;
  seriesText?: string;
  manuscriptType?: string;
  mapType?: string;
  scale?: string;
  postType?: string;
  committee?: string;
  documentNumber?: string;
  patentNumber?: string;
  filingDate?: string;
  applicationNumber?: string;
  priorityNumbers?: string;
  issueDate?: string;
  references?: string;
  legalStatus?: string;
  assignee?: string;
  issuingAuthority?: string;
  country?: string;
  presentationType?: string;
  thesisType?: string;
  identifier?: string;
  versionNumber?: string;
  repositoryLocation?: string;
  format?: string;
  citationKey?: string;
  audioFileType?: string;
  programmingLanguage?: string;
  system?: string;
  company?: string;
  status?: string;
  nameOfAct?: string;
  publicLawNumber?: string;
  codeNumber?: string;
  dateEnacted?: string;
  organization?: string;
  number?: string;
}

interface CitoidErrorResponse {
  Error: string;
}

export class CitoidMetadataService implements IMetadataService {
  private readonly baseUrl =
    'https://en.wikipedia.org/api/rest_v1/data/citation/zotero/';
  private readonly headers = {
    accept: 'application/json; charset=utf-8;',
  };

  async fetchMetadata(url: URL): Promise<Result<UrlMetadata>> {
    try {
      // URL-encode the target URL
      const encodedUrl = encodeURIComponent(url.value);
      const fullUrl = this.baseUrl + encodedUrl;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        return err(
          new Error(
            `Citoid API request failed with status ${response.status} and message: ${response.statusText}`,
          ),
        );
      }

      const data = (await response.json()) as any;

      // Check if the response is an error
      if (data && typeof data === 'object' && 'Error' in data) {
        const errorResponse = data as CitoidErrorResponse;
        return err(new Error(`Citoid service error: ${errorResponse.Error}`));
      }

      // Check if it's an array response
      if (!Array.isArray(data) || data.length === 0) {
        return err(new Error('No metadata found for the given URL'));
      }

      // Use the first result
      const citoidData = data[0] as CitoidResponse;
      if (!citoidData || !citoidData.itemType) {
        return err(new Error('Invalid metadata format from Citoid'));
      }

      // Extract author from creators array - prioritize 'author' type creators
      const author = this.extractPrimaryAuthor(citoidData.creators);

      // Determine site name from various possible fields
      const siteName = this.determineSiteName(citoidData);

      // Parse published date
      const publishedDate = citoidData.date
        ? this.parseDate(citoidData.date)
        : undefined;

      const metadataResult = UrlMetadata.create({
        url: url.value,
        title: citoidData.title,
        description: citoidData.abstractNote,
        author,
        publishedDate,
        siteName,
        type: mapCitoidUrlType(citoidData.itemType),
      });

      return metadataResult;
    } catch (error) {
      return err(
        new Error(
          `Failed to fetch metadata from Citoid: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test with a simple URL to check if the service is available
      const testUrl = this.baseUrl + encodeURIComponent('https://example.com');
      const response = await fetch(testUrl, {
        method: 'HEAD',
        headers: this.headers,
      });

      // Service is available if we get any response (even 4xx errors are fine)
      return response.status < 500;
    } catch {
      return false;
    }
  }

  private extractPrimaryAuthor(creators?: CitoidCreator[]): string | undefined {
    if (!creators || creators.length === 0) {
      return undefined;
    }

    // First, try to find a creator with type 'author'
    const authorCreator = creators.find(
      (creator) => creator.creatorType === 'author',
    );

    if (authorCreator) {
      return this.formatAuthor(authorCreator);
    }

    // If no 'author' type, try other primary creator types in order of preference
    const primaryTypes = [
      'artist',
      'performer',
      'director',
      'podcaster',
      'cartographer',
      'programmer',
      'presenter',
      'sponsor',
      'inventor',
    ];

    for (const type of primaryTypes) {
      const creator = creators.find((c) => c.creatorType === type);
      if (creator) {
        return this.formatAuthor(creator);
      }
    }

    // Fall back to the first creator
    return this.formatAuthor(creators[0]!);
  }

  private formatAuthor(creator: CitoidCreator): string {
    const { firstName, lastName, name } = creator;

    // Handle single-field names (typically organizations)
    if (name) {
      return name;
    }

    // Handle two-field names
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (lastName) {
      return lastName;
    } else if (firstName) {
      return firstName;
    }

    return '';
  }

  private determineSiteName(data: CitoidResponse): string | undefined {
    // Try different fields in order of preference for site name
    return (
      data.publicationTitle ||
      data.websiteTitle ||
      data.blogTitle ||
      data.forumTitle ||
      data.repository ||
      data.libraryCatalog ||
      data.institution ||
      data.university ||
      data.publisher
    );
  }

  private parseDate(dateString: string): Date | undefined {
    try {
      // Handle ISO date format (YYYY-MM-DD) which is common in Citoid responses
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parsed = new Date(dateString + 'T00:00:00.000Z');
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }

      // Try to parse the date string as-is
      const parsed = new Date(dateString);

      // Check if the date is valid
      if (isNaN(parsed.getTime())) {
        return undefined;
      }

      return parsed;
    } catch {
      return undefined;
    }
  }
}
