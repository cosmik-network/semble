import { generateOpenApi } from '@ts-rest/open-api';
import { publicContract } from '@semble/contract';
import { EnvironmentConfigService } from '../config/EnvironmentConfigService';

const appUrl = new EnvironmentConfigService().getAtProtoConfig().baseUrl;

/**
 * Optional analytics header every integration should send. It is read by the
 * API usage logger middleware rather than any individual route, so it is
 * injected into each operation here instead of being declared per-route in the
 * ts-rest contract (which would also leak it into the SDK's per-call types —
 * the SDK sets it once at client construction).
 */
const CLIENT_HEADER_PARAM = {
  name: 'X-Semble-Client',
  in: 'header' as const,
  required: false,
  description:
    'A short identifier for your integration (e.g. `my-plugin`, `mcp`). ' +
    'Please set this if you are building an integration — it helps Semble ' +
    'understand which tools people use. Values are lowercased before being ' +
    'recorded, so `MyPlugin` and `myplugin` are the same client. After ' +
    'lowercasing the value must match `^[a-z0-9][a-z0-9_-]{0,31}$`; values ' +
    'that do not are ignored, and the client is inferred from the auth ' +
    'method instead.',
  schema: {
    type: 'string' as const,
    pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$',
    example: 'my-plugin',
  },
};

export const openApiDocument = generateOpenApi(
  publicContract,
  {
    info: {
      title: 'Semble API',
      version: '1.0.0',
      description:
        'The official Semble API.\n\n' +
        '**Identify your integration.** If you are building on the Semble ' +
        'API, send a short identifier for your client in the optional ' +
        '`X-Semble-Client` header on every request (e.g. ' +
        '`X-Semble-Client: my-plugin`). It is not required and never changes ' +
        'a response, but it helps Semble understand which tools people use. ' +
        'The official SDK sets it for you when you pass `client` to ' +
        '`createSembleClient`.',
    },
    servers: [{ url: `${appUrl}/xrpc` }],
    components: {
      parameters: {
        SembleClient: CLIENT_HEADER_PARAM,
      },
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
    operationMapper: (operation) => ({
      ...operation,
      parameters: [
        ...(operation.parameters ?? []),
        { $ref: '#/components/parameters/SembleClient' },
      ],
    }),
  },
);
