import { CompositeMetadataService } from '../../infrastructure/CompositeMetadataService';
import { IMetadataService } from '../../domain/services/IMetadataService';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { UrlType } from '../../domain/value-objects/UrlType';
import { Result, ok, err } from '../../../../shared/core/Result';

/** IMetadataService stub with a configurable delay and result. */
class StubMetadataService implements IMetadataService {
  public callCount = 0;

  constructor(
    private result: Result<UrlMetadata>,
    private delayMs: number = 0,
  ) {}

  async fetchMetadata(): Promise<Result<UrlMetadata>> {
    this.callCount++;
    if (this.delayMs > 0) {
      // unref so an abandoned background fetch doesn't keep the jest worker alive
      await new Promise((resolve) => {
        setTimeout(resolve, this.delayMs).unref();
      });
    }
    return this.result;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('CompositeMetadataService fast mode', () => {
  const url = URL.create('https://example.com/some-page').unwrap();

  const iframelyMetadata = UrlMetadata.create({
    url: url.value,
    title: 'Iframely title',
    type: UrlType.LINK,
  }).unwrap();

  const citoidMetadata = UrlMetadata.create({
    url: url.value,
    title: 'Citoid title',
    description: 'Citoid description',
    type: UrlType.RESEARCH,
  }).unwrap();

  it('returns the Iframely result without waiting for a slow Citoid fetch', async () => {
    const iframely = new StubMetadataService(ok(iframelyMetadata), 0);
    const citoid = new StubMetadataService(ok(citoidMetadata), 2000);
    const service = new CompositeMetadataService(iframely, citoid);

    const start = Date.now();
    const result = await service.fetchMetadata(url, false, 'fast');
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    // Iframely-only: Citoid's fields are not merged in
    expect(result.unwrap().title).toBe('Iframely title');
    expect(result.unwrap().type).toBe(UrlType.LINK);
    // Should return well before the 2s Citoid delay
    expect(elapsed).toBeLessThan(1500);
    // Citoid was still fired (to warm caches)
    expect(citoid.callCount).toBe(1);
  });

  it('merges a fast-settling Citoid result (cache hit) as in slow mode', async () => {
    const iframely = new StubMetadataService(ok(iframelyMetadata), 0);
    const citoid = new StubMetadataService(ok(citoidMetadata), 0);
    const service = new CompositeMetadataService(iframely, citoid);

    const result = await service.fetchMetadata(url, false, 'fast');

    expect(result.isOk()).toBe(true);
    // Citoid wins type selection (LINK vs RESEARCH) and its fields merge in
    expect(result.unwrap().type).toBe(UrlType.RESEARCH);
    expect(result.unwrap().description).toBe('Citoid description');
  });

  it('falls back to waiting for Citoid when Iframely fails', async () => {
    const iframely = new StubMetadataService(err(new Error('iframely down')));
    const citoid = new StubMetadataService(ok(citoidMetadata), 300);
    const service = new CompositeMetadataService(iframely, citoid);

    const result = await service.fetchMetadata(url, false, 'fast');

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().title).toBe('Citoid title');
  });

  it('defaults to slow mode and waits for both services', async () => {
    const iframely = new StubMetadataService(ok(iframelyMetadata), 0);
    const citoid = new StubMetadataService(ok(citoidMetadata), 300);
    const service = new CompositeMetadataService(iframely, citoid);

    const result = await service.fetchMetadata(url);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().type).toBe(UrlType.RESEARCH);
    expect(result.unwrap().description).toBe('Citoid description');
  });
});
