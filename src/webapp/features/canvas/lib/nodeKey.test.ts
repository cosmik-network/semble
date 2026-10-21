import { describe, expect, it } from 'vitest';
import { nodeKey } from './nodeKey';

describe('nodeKey', () => {
  it('matches collection pages on handle and rkey, whatever the host', () => {
    expect(
      nodeKey('https://semble.so/profile/Alice.bsky.social/collections/3abc'),
    ).toBe(
      nodeKey(
        'http://127.0.0.1:4000/profile/alice.bsky.social/collections/3abc?x=1',
      ),
    );
  });

  it('leaves other URLs alone', () => {
    expect(nodeKey('https://example.com/a')).toBe('https://example.com/a');
    expect(nodeKey('not a url')).toBe('not a url');
  });
});
