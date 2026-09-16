import { FakeProfileService } from './FakeProfileService';

describe('FakeProfileService.getProfiles', () => {
  it('returns registered profiles and omits unknown ids', async () => {
    const service = new FakeProfileService();
    service.addProfile({ id: 'did:plc:a', name: 'A', handle: 'a.test' });

    const result = await service.getProfiles(['did:plc:a', 'did:plc:unknown']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.get('did:plc:a')?.name).toBe('A');
      expect(result.value.has('did:plc:unknown')).toBe(false);
    }
  });

  it('omits everything when shouldFail is set (per-id failures are absences)', async () => {
    const service = new FakeProfileService();
    service.addProfile({ id: 'did:plc:a', name: 'A', handle: 'a.test' });
    service.setShouldFail(true);

    const result = await service.getProfiles(['did:plc:a']);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.size).toBe(0);
  });
});
