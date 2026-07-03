/**
 * Thin HTTP client that calls Semble's own public `/xrpc` REST API in-process,
 * authenticated as the MCP user via their Semble API key (Bearer `sk_...`).
 *
 * The MCP tools are deliberately implemented as wrappers over the existing REST
 * surface rather than reaching into controllers/use-cases directly. This keeps
 * the MCP layer decoupled: it sees exactly what an external API consumer sees,
 * and inherits all auth, validation, and business rules for free.
 */
export class SembleApiClient {
  /**
   * @param baseUrl  Origin of the API (e.g. https://api.semble.so). The `/xrpc`
   *                 prefix is appended here so callers pass bare operation paths.
   * @param apiKey   The user's Semble API key (the Bearer token from `/mcp`).
   */
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private url(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`/xrpc${path}`, this.baseUrl.replace(/\/$/, '') + '/');
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  async get(path: string, query?: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(this.url(path, query), {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return this.handle(res);
  }

  async post(path: string, body?: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(this.url(path), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    return this.handle(res);
  }

  private async handle(res: Response): Promise<unknown> {
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      const message =
        (parsed as { message?: string })?.message ??
        `Request failed with status ${res.status}`;
      throw new Error(message);
    }
    return parsed;
  }
}
