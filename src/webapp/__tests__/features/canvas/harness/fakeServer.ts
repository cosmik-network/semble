import type {
  CanvasServer,
  LinkInfo,
} from '@/features/canvas/server/canvasServer';

export interface ServerCall {
  method: string;
  args: unknown[];
}

export function testLink(
  url: string,
  overrides: Partial<LinkInfo> = {},
): LinkInfo {
  return {
    url,
    metadata: { url, title: `Title of ${url}` },
    saved: false,
    note: null,
    ...overrides,
  };
}

export class FakeServer implements CanvasServer {
  calls: ServerCall[] = [];
  // What the server returns for each link; others load with a title only
  links = new Map<string, LinkInfo>();
  private held: (() => void)[] | null = null;

  // Responses wait until the returned function is called
  holdResponses() {
    const held: (() => void)[] = [];
    this.held = held;
    return () => {
      this.held = null;
      held.forEach((respond) => respond());
    };
  }

  async getLinks(urls: string[]) {
    this.calls.push({ method: 'getLinks', args: [urls] });
    const held = this.held;
    if (held) await new Promise<void>((respond) => held.push(respond));
    return new Map(
      urls.map((url) => [url, this.links.get(url) ?? testLink(url)]),
    );
  }
}
