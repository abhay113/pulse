import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handler } from './index.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function getBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Enable CORS for local direct Vite testing if desired
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url || '/', `http://${host}`);
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await getBody(req) : undefined;

  const queryStringParameters: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    queryStringParameters[key] = val;
  });

  const event: APIGatewayProxyEventV2 = {
    version: '2.0',
    routeKey: `${req.method} ${url.pathname}`,
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ''),
    headers: req.headers as Record<string, string>,
    queryStringParameters,
    requestContext: {
      accountId: 'local-dev',
      apiId: 'local-api',
      domainName: host,
      domainPrefix: 'local',
      http: {
        method: req.method || 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'local-client',
      },
      requestId: `local-${Date.now()}`,
      routeKey: `${req.method} ${url.pathname}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    ...(body !== undefined ? { body } : {}),
    isBase64Encoded: false,
  };

  const result = (await handler(event)) as APIGatewayProxyResultV2 & {
    statusCode: number;
    headers?: Record<string, string>;
    body?: string;
  };

  res.writeHead(result.statusCode || 200, result.headers || {});
  res.end(result.body || '');
});

server.listen(PORT, () => {
  console.log(`[Pulse Local API] Server running at http://localhost:${PORT}`);
  console.log(`- Health: http://localhost:${PORT}/api/health`);
  console.log(`- Round:  http://localhost:${PORT}/api/round?level=1`);
});
