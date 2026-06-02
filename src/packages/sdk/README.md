# @semble.so/api

A fully-typed client for the [Semble](https://semble.so) API.

## Install

```bash
npm install @semble.so/api
```

The client uses [`ts-rest`](https://ts-rest.com) and [`zod`](https://zod.dev) under the hood. They are declared as peer dependencies and will be installed automatically by modern package managers; if you need to install them explicitly:

```bash
npm install @ts-rest/core zod
```

## Usage

```ts
import { createSembleClient } from '@semble.so/api';

const semble = createSembleClient({
  apiKey: process.env.SEMBLE_API_KEY!,
});

const result = await semble.cards.addUrlToLibrary({
  body: { url: 'https://semble.so' },
});
```

By default the client targets `https://api.semble.so/xrpc`. Override with the `baseUrl` option:

```ts
const semble = createSembleClient({
  apiKey: '...',
  baseUrl: 'https://anotherappview.com/xrpc',
});
```

## API reference

See the full API reference at [https://docs.cosmik.network](https://docs.cosmik.network).

## License

ISC
