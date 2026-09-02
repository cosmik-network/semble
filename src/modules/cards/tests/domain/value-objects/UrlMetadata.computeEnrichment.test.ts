import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../../domain/value-objects/UrlType';

describe('UrlMetadata.computeEnrichment', () => {
  const url = 'https://example.com/article';

  const make = (props: Partial<Parameters<typeof UrlMetadata.create>[0]>) =>
    UrlMetadata.create({ url, ...props }).unwrap();

  it('adopts the candidate wholesale when there is no current metadata', () => {
    const candidate = make({ title: 'Title', type: UrlType.ARTICLE });

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      undefined,
      candidate,
    );

    expect(shouldUpdate).toBe(true);
    expect(merged).toBe(candidate);
  });

  it('updates when the type becomes more specific than LINK', () => {
    const current = make({ title: 'Title', type: UrlType.LINK });
    const candidate = make({ title: 'Title', type: UrlType.RESEARCH });

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      current,
      candidate,
    );

    expect(shouldUpdate).toBe(true);
    expect(merged.type).toBe(UrlType.RESEARCH);
  });

  it('updates when the type was missing and the candidate has one', () => {
    const current = make({ title: 'Title' });
    const candidate = make({ title: 'Title', type: UrlType.ARTICLE });

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      current,
      candidate,
    );

    expect(shouldUpdate).toBe(true);
    expect(merged.type).toBe(UrlType.ARTICLE);
  });

  it('does not downgrade a specific type to LINK', () => {
    const current = make({ title: 'Title', type: UrlType.ARTICLE });
    const candidate = make({ title: 'Title', type: UrlType.LINK });

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      current,
      candidate,
    );

    expect(shouldUpdate).toBe(false);
    expect(merged.type).toBe(UrlType.ARTICLE);
  });

  it('updates when the candidate fills fields the current metadata lacks', () => {
    const current = make({ title: 'Title', type: UrlType.ARTICLE });
    const candidate = make({
      title: 'Other title',
      description: 'A description',
      doi: '10.1000/xyz',
      type: UrlType.ARTICLE,
    });

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      current,
      candidate,
    );

    expect(shouldUpdate).toBe(true);
    // Existing values win; only gaps get filled
    expect(merged.title).toBe('Title');
    expect(merged.description).toBe('A description');
    expect(merged.doi).toBe('10.1000/xyz');
  });

  it('prefers the candidate wholesale when both types are specific but differ', () => {
    // Mirrors selectBestMetadata: on a type conflict the specialist (slow
    // fetch) wins, including its field values
    const current = make({ title: 'Iframely title', type: UrlType.ARTICLE });
    const candidate = make({ title: 'Citoid title', type: UrlType.RESEARCH });

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      current,
      candidate,
    );

    expect(shouldUpdate).toBe(true);
    expect(merged.type).toBe(UrlType.RESEARCH);
    expect(merged.title).toBe('Citoid title');
  });

  it('is a no-op when the candidate adds nothing new', () => {
    const current = make({
      title: 'Title',
      description: 'Desc',
      type: UrlType.ARTICLE,
    });
    const candidate = make({ title: 'Different title', type: UrlType.ARTICLE });

    const { shouldUpdate } = UrlMetadata.computeEnrichment(current, candidate);

    expect(shouldUpdate).toBe(false);
  });

  it('takes the candidate retrievedAt so the merge reads as fresh', () => {
    const oldDate = new Date('2026-01-01T00:00:00Z');
    const newDate = new Date('2026-08-26T00:00:00Z');
    const current = make({ title: 'Title', retrievedAt: oldDate });
    const candidate = make({
      title: 'Title',
      description: 'Desc',
      retrievedAt: newDate,
    });

    const { merged } = UrlMetadata.computeEnrichment(current, candidate);

    expect(merged.retrievedAt).toEqual(newDate);
  });
});
