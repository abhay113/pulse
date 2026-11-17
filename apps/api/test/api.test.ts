import { describe, it, expect } from 'vitest';
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

  it('POST /api/score in guest mode (no sessionToken) records score without sending email', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/score',
      body: {
        score: 1250,
        level: 5,
        playerName: 'GuestPlayer',
      },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.emailSent).toBe(false);
  });

  it('POST /api/score rejects negative score or invalid payload', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/score',
      body: {
        score: -100,
        level: 0,
      },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
  });

  it('POST /api/auth/send-otp sends OTP and returns otpToken', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/auth/send-otp',
      body: { email: 'player@example.com' },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.otpToken).toBe('string');
    expect(body.expiresInSeconds).toBe(600);
  });

  it('POST /api/auth/verify-otp validates correct OTP and returns session token', async () => {
    // Generate valid OTP token manually using helper
    const { generateSalt, hashOtp, signPayload } = await import('../src/crypto.js');
    const salt = generateSalt();
    const otp = '654321';
    const email = 'player@example.com';
    const otpHash = hashOtp(otp, salt, email);
    const otpToken = signPayload({
      email,
      salt,
      otpHash,
      exp: Date.now() + 600000,
      sub: 'otp_verification',
    });

    const event = createMockEvent({
      method: 'POST',
      path: '/api/auth/verify-otp',
      body: { email, otp, otpToken },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.sessionToken).toBe('string');
    expect(body.user.email).toBe('player@example.com');
  });

  it('POST /api/auth/verify-otp rejects incorrect OTP code', async () => {
    const { generateSalt, hashOtp, signPayload } = await import('../src/crypto.js');
    const salt = generateSalt();
    const otp = '654321';
    const email = 'player@example.com';
    const otpHash = hashOtp(otp, salt, email);
    const otpToken = signPayload({
      email,
      salt,
      otpHash,
      exp: Date.now() + 600000,
      sub: 'otp_verification',
    });

    const event = createMockEvent({
      method: 'POST',
      path: '/api/auth/verify-otp',
      body: { email, otp: '111111', otpToken },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('POST /api/score routes score report to logged-in user session email', async () => {
    const { signPayload } = await import('../src/crypto.js');
    const sessionToken = signPayload({
      email: 'customplayer@domain.com',
      exp: Date.now() + 3600000,
      sub: 'user_session',
    });

    const event = createMockEvent({
      method: 'POST',
      path: '/api/score',
      body: {
        score: 2400,
        level: 8,
        sessionToken,
      },
    });
    const response = (await handler(event)) as { statusCode: number; body: string };

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.emailSent).toBe(true);
    expect(body.recipient).toBe('customplayer@domain.com');
  });

  it('Returns 404 for unknown endpoints', async () => {
    const event = createMockEvent({ method: 'GET', path: '/api/nonexistent' });
    const response = (await handler(event)) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(404);
  });
});
