import { generateOpenApi } from '@ts-rest/open-api';
import { publicContract } from '@semble/contract';
import { EnvironmentConfigService } from '../config/EnvironmentConfigService';

const appUrl = new EnvironmentConfigService().getAtProtoConfig().baseUrl;

export const openApiDocument = generateOpenApi(
  publicContract,
  {
    info: {
      title: 'Semble API',
      version: '1.0.0',
      description: 'The official Semble API',
    },
    servers: [{ url: `${appUrl}/xrpc` }],
    components: {
      securitySchemes: {
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
