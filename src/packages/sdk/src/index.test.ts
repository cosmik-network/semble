import http from 'http';
import { AddressInfo } from 'net';
import { createSembleClient } from './index';

describe('createSembleClient', () => {
  let server: http.Server;
  let baseUrl: string;
  let lastHeaders: http.IncomingHttpHeaders;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      lastHeaders = req.headers;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ count: 0 }));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('sends the API key and X-Semble-Client headers when configured', async () => {
    const semble = createSembleClient({
      apiKey: 'sk_test',
      client: 'my-plugin',
      baseUrl,
    });

    await semble.notifications.unreadCount({ query: {} });

    expect(lastHeaders['x-api-key']).toBe('sk_test');
    expect(lastHeaders['x-semble-client']).toBe('my-plugin');
  });

  it('works without an API key and sends neither header', async () => {
    const semble = createSembleClient({ baseUrl });

    await semble.notifications.unreadCount({ query: {} });

    expect(lastHeaders['x-api-key']).toBeUndefined();
    expect(lastHeaders['x-semble-client']).toBeUndefined();
  });
});
