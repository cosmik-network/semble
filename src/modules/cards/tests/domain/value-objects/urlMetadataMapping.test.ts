import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../../domain/value-objects/UrlType';
import {
  toUrlMetadataDTO,
  toUrlMetadataJSON,
  toUrlMetadataProps,
} from '../../../domain/value-objects/urlMetadataMapping';

const FULL = {
  url: 'https://example.com/paper',
  title: 'A Title',
  description: 'A description',
  author: 'An Author',
  publishedDate: new Date('2023-05-04T00:00:00.000Z'),
  siteName: 'Example',
  imageUrl: 'https://example.com/i.png',
  type: UrlType.RESEARCH,
  doi: '10.1000/xyz123',
  isbn: '978-3-16-148410-0',
};

describe('UrlMetadata date normalization', () => {
  it('accepts publishedDate as an ISO string and exposes a real Date', () => {
    // Regression: JSONB/cache round-trips hand back strings. Previously the
    // string landed in a field typed Date, so publishedDate.toISOString()
    // threw "is not a function" when publishing to ATProto.
    const md = UrlMetadata.create({
      url: FULL.url,
      publishedDate: '2023-05-04T00:00:00.000Z' as unknown as Date,
    }).unwrap();

    expect(md.publishedDate).toBeInstanceOf(Date);
    expect(() => md.publishedDate!.toISOString()).not.toThrow();
    expect(md.publishedDate!.toISOString()).toBe('2023-05-04T00:00:00.000Z');
  });

  it('drops an unparseable publishedDate instead of storing Invalid Date', () => {
    const md = UrlMetadata.create({
      url: FULL.url,
      publishedDate: 'not-a-date' as unknown as Date,
    }).unwrap();

    expect(md.publishedDate).toBeUndefined();
  });

  it('always produces a valid retrievedAt', () => {
    const md = UrlMetadata.create({
      url: FULL.url,
      retrievedAt: undefined,
    }).unwrap();

    expect(md.retrievedAt).toBeInstanceOf(Date);
    expect(isNaN(md.retrievedAt!.getTime())).toBe(false);
  });
});

describe('urlMetadata mapping helpers', () => {
  it('round-trips every field through JSON without loss', () => {
    const original = UrlMetadata.create(FULL).unwrap();

    const json = toUrlMetadataJSON(original);
    const restored = UrlMetadata.create(toUrlMetadataProps(json)).unwrap();

    expect(restored.url).toBe(FULL.url);
    expect(restored.title).toBe(FULL.title);
    expect(restored.description).toBe(FULL.description);
    expect(restored.author).toBe(FULL.author);
    expect(restored.siteName).toBe(FULL.siteName);
    expect(restored.imageUrl).toBe(FULL.imageUrl);
    expect(restored.type).toBe(FULL.type);
    expect(restored.doi).toBe(FULL.doi);
    expect(restored.isbn).toBe(FULL.isbn);
    // The fields that were previously dropped on the write path.
    expect(restored.publishedDate?.toISOString()).toBe(
      FULL.publishedDate.toISOString(),
    );
  });

  it('persists publishedDate, doi and isbn in the JSON payload', () => {
    const json = toUrlMetadataJSON(UrlMetadata.create(FULL).unwrap());

    expect(json.publishedDate).toBe('2023-05-04T00:00:00.000Z');
    expect(json.doi).toBe(FULL.doi);
    expect(json.isbn).toBe(FULL.isbn);
  });

  it('serializes the full DTO for API responses', () => {
    const dto = toUrlMetadataDTO(UrlMetadata.create(FULL).unwrap());

    expect(dto).toEqual(
      expect.objectContaining({
        url: FULL.url,
        title: FULL.title,
        description: FULL.description,
        author: FULL.author,
        publishedDate: '2023-05-04T00:00:00.000Z',
        siteName: FULL.siteName,
        imageUrl: FULL.imageUrl,
        type: FULL.type,
        doi: FULL.doi,
        isbn: FULL.isbn,
      }),
    );
  });

  it('does not throw when serializing metadata whose dates came from JSON', () => {
    // toUrlMetadataDTO must tolerate string dates, since query-layer rows
    // bypass the domain aggregate.
    expect(() =>
      toUrlMetadataDTO({
        url: FULL.url,
        publishedDate: '2023-05-04T00:00:00.000Z',
        retrievedAt: 'garbage',
      }),
    ).not.toThrow();

    const dto = toUrlMetadataDTO({
      url: FULL.url,
      publishedDate: '2023-05-04T00:00:00.000Z',
      retrievedAt: 'garbage',
    });
    expect(dto.publishedDate).toBe('2023-05-04T00:00:00.000Z');
    expect(dto.retrievedAt).toBeUndefined();
  });
});
