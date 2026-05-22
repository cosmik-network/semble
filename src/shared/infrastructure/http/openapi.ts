import { generateOpenApi } from '@ts-rest/open-api';
import { contract } from '@semble/contract';

export const openApiDocument = generateOpenApi(
  contract,
  {
    info: {
      title: 'Semble API',
      version: '1.0.0',
      description: 'The official Semble API',
    },
    servers: [{ url: 'https://api.semble.so' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  },
  {
    setOperationId: true,
  },
);
