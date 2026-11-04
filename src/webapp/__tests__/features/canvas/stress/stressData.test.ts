import { describe, expect, it } from 'vitest';
import {
  STRESS_ARROWS,
  STRESS_CARDS,
  stressLinks,
  stressPlacements,
} from '@/features/canvas/stress/stressData';

const VIEWER = 'did:plc:viewer';

describe('stress data', () => {
  const links = stressLinks(VIEWER);
  const connections = new Map(
    Array.from(links.values()).flatMap((link) =>
      link.connections!.map((connection) => [connection.id, connection]),
    ),
  );

  it('is the size the spec checks', () => {
    expect(STRESS_CARDS).toBe(500);
    expect(STRESS_ARROWS).toBe(2000);
    expect(links.size).toBe(STRESS_CARDS);
    expect(connections.size).toBe(STRESS_ARROWS);
  });

  it('joins each pair of links at most once, so each connection is one arrow', () => {
    const pairs = new Set(
      Array.from(connections.values()).map((connection) =>
        [connection.sourceUrl, connection.targetUrl].sort().join(' '),
      ),
    );
    expect(pairs.size).toBe(STRESS_ARROWS);
  });

  it('lists each connection on both its ends', () => {
    for (const connection of Array.from(connections.values())) {
      expect(connection.sourceUrl).not.toBe(connection.targetUrl);
      for (const url of [connection.sourceUrl, connection.targetUrl]) {
        expect(
          links.get(url)!.connections!.some(({ id }) => id === connection.id),
        ).toBe(true);
      }
    }
  });

  it('mixes own connections with ghosts', () => {
    const curators = new Set(
      Array.from(connections.values()).map(({ curatorId }) => curatorId),
    );
    expect(curators.has(VIEWER)).toBe(true);
    expect(curators.size).toBe(2);
  });

  it('places every link once, without overlap', () => {
    const places = stressPlacements();
    expect(new Set(places.map((place) => place.url)).size).toBe(STRESS_CARDS);
    const spots = new Set(places.map((place) => `${place.x},${place.y}`));
    expect(spots.size).toBe(STRESS_CARDS);
  });
});
