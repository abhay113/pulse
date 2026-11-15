import { describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../src/index.js';
import { signToken } from '../src/crypto.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

function createMockEvent(options: {
  method: string;
  path: string;
  queryStringParameters?: Record<string, string>;
  body?: unknown;
}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    queryStringParameters: options.queryStringParameters,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: options.method,
        path: options.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey: `${options.method} ${options.path}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    isBase64Encoded: false,
  };
}

describe('Pulse API Handler', () => {
  it('GET /api/health returns 200 and healthy status', async () => {
    const event = createMockEvent({ method: 'GET', path: '/api/health' });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('1.0.0');
    expect(typeof body.time).toBe('string');
  });

  it('GET /api/round returns a sequence of length N+2 and signed token', async () => {
    const event = createMockEvent({
      method: 'GET',
      path: '/api/round',
      queryStringParameters: { level: '3' },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.level).toBe(3);
    expect(body.sequence).toHaveLength(5); // 3 + 2
    expect(body.padCount).toBe(4);
    expect(typeof body.token).toBe('string');
    expect(body.token.split('.')).toHaveLength(2);
  });

  it('GET /api/round rejects invalid level parameter', async () => {
    const event = createMockEvent({
      method: 'GET',
      path: '/api/round',
      queryStringParameters: { level: '-5' },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
  });

  it('POST /api/verify accepts correct answer and advances level', async () => {
    // Generate valid round token
    const roundEvent = createMockEvent({
      method: 'GET',
      path: '/api/round',
      queryStringParameters: { level: '2' },
    });
    const roundRes = (await handler(roundEvent)) as { statusCode: number; body: string };
    const roundBody = JSON.parse(roundRes.body);

    // Verify with matching answer
    const verifyEvent = createMockEvent({
      method: 'POST',
      path: '/api/verify',
      body: {
        token: roundBody.token,
        answer: roundBody.sequence,
      },
    });
    const verifyRes = (await handler(verifyEvent)) as { statusCode: number; body: string };

    expect(verifyRes.statusCode).toBe(200);
    const verifyData = JSON.parse(verifyRes.body);
    expect(verifyData.correct).toBe(true);
    expect(verifyData.nextLevel).toBe(3);
  });

  it('POST /api/verify rejects incorrect answer', async () => {
    const roundEvent = createMockEvent({
      method: 'GET',
      path: '/api/round',
      queryStringParameters: { level: '1' },
    });
    const roundRes = (await handler(roundEvent)) as { statusCode: number; body: string };
    const roundBody = JSON.parse(roundRes.body);

    // Wrong answer
    const wrongAnswer = roundBody.sequence.map((x: number) => (x + 1) % 4);

    const verifyEvent = createMockEvent({
      method: 'POST',
      path: '/api/verify',
      body: {
        token: roundBody.token,
        answer: wrongAnswer,
      },
    });
    const verifyRes = (await handler(verifyEvent)) as { statusCode: number; body: string };

    expect(verifyRes.statusCode).toBe(200);
    const verifyData = JSON.parse(verifyRes.body);
    expect(verifyData.correct).toBe(false);
    expect(verifyData.nextLevel).toBe(1);
  });

  it('POST /api/verify returns 401 for tampered token', async () => {
    const verifyEvent = createMockEvent({
      method: 'POST',
      path: '/api/verify',
      body: {
        token: 'fake.token',
        answer: [0, 1, 2],
      },
    });
    const verifyRes = (await handler(verifyEvent)) as { statusCode: number; body: string };
    expect(verifyRes.statusCode).toBe(401);
  });

  it('POST /api/verify rejects expired token', async () => {
    const expiredToken = signToken({
      level: 1,
      sequence: [0, 1, 2],
      exp: Date.now() - 10000, // Expired 10 seconds ago
      nonce: 'expired-nonce',
    });

    const verifyEvent = createMockEvent({
      method: 'POST',
      path: '/api/verify',
      body: {
        token: expiredToken,
        answer: [0, 1, 2],
      },
    });
    const verifyRes = (await handler(verifyEvent)) as { statusCode: number; body: string };
    expect(verifyRes.statusCode).toBe(401);
  });

  it('Returns 404 for unknown endpoints', async () => {
    const event = createMockEvent({ method: 'GET', path: '/api/nonexistent' });
    const response = (await handler(event)) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(404);
  });
});

