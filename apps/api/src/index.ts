import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomInt, randomUUID } from 'node:crypto';
import { logger } from './logger.js';
import { roundQuerySchema, verifyBodySchema } from './validation.js';
import { signToken, verifyToken } from './crypto.js';
import { gameRepository } from './db/repository.js';
import type { HealthResponse, RoundResponse, VerifyResponse } from './types.js';

const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const TOKEN_TTL_MS = parseInt(process.env.TOKEN_TTL_MS || '300000', 10); // 5 minutes validity
const PAD_COUNT = parseInt(process.env.PAD_COUNT || '4', 10); // 4 neon pads: 0=cyan, 1=magenta, 2=lime, 3=amber

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || 'GET';
  const rawPath = event.rawPath || event.requestContext?.http?.path || '/';
  const requestId = event.requestContext?.requestId || randomUUID();

  // Normalize path (handle trailing slash if any)
  const path = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

  logger.info('Incoming request', { requestId, method, path });

  try {
    // GET /api/health
    if (path === '/api/health' && method === 'GET') {
      const response: HealthResponse = {
        status: 'ok',
        version: APP_VERSION,
        time: new Date().toISOString(),
      };
      return jsonResponse(200, response);
    }

    // GET /api/round
    if (path === '/api/round' && method === 'GET') {
      const parseResult = roundQuerySchema.safeParse(event.queryStringParameters || {});
      if (!parseResult.success) {
        logger.warn('Invalid round query parameters', {
          requestId,
          issues: parseResult.error.issues,
        });
        return jsonResponse(400, {
          error: 'Bad Request',
          issues: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { level } = parseResult.data;
      const sequenceLength = level + 2;
      const sequence: number[] = Array.from({ length: sequenceLength }, () =>
        randomInt(0, PAD_COUNT),
      );

      const payload = {
        level,
        sequence,
        exp: Date.now() + TOKEN_TTL_MS,
        nonce: randomUUID(),
      };

      const token = signToken(payload);

      const response: RoundResponse = {
        level,
        sequence,
        token,
        padCount: PAD_COUNT,
      };

      logger.info('Generated game round', { requestId, level, sequenceLength });
      return jsonResponse(200, response);
    }

    // POST /api/verify
    if (path === '/api/verify' && method === 'POST') {
      let rawBody = event.body || '{}';
      if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        return jsonResponse(400, { error: 'Bad Request', message: 'Invalid JSON body' });
      }

      const parseResult = verifyBodySchema.safeParse(parsedBody);
      if (!parseResult.success) {
        logger.warn('Invalid verify payload', {
          requestId,
          issues: parseResult.error.issues,
        });
        return jsonResponse(400, {
          error: 'Bad Request',
          issues: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { token, answer } = parseResult.data;
      const verification = verifyToken(token);

      if (!verification.valid || !verification.payload) {
        logger.warn('Token verification failed', {
          requestId,
          reason: verification.reason,
        });
        return jsonResponse(401, {
          correct: false,
          nextLevel: 1,
          message: verification.reason || 'Invalid or expired round token',
        });
      }

      const { level, sequence } = verification.payload;

      // Verify answer matches sequence exactly
      const isCorrect =
        answer.length === sequence.length &&
        answer.every((val: number, idx: number) => val === sequence[idx]);

      // Record in repository seam (for future DB)
      await gameRepository.recordRound({
        level,
        sequence,
        playerAnswer: answer,
        isCorrect,
        timestamp: new Date().toISOString(),
      });

      if (isCorrect) {
        logger.info('Round completed successfully', { requestId, level, nextLevel: level + 1 });
        const response: VerifyResponse = {
          correct: true,
          nextLevel: level + 1,
        };
        return jsonResponse(200, response);
      }

      logger.info('Round failed - incorrect sequence', { requestId, level });
      const response: VerifyResponse = {
        correct: false,
        nextLevel: 1,
        message: 'Incorrect sequence. Try again!',
      };
      return jsonResponse(200, response);
    }

    // 404 for unknown endpoints
    logger.warn('Route not found', { requestId, method, path });
    return jsonResponse(404, {
      error: 'Not Found',
      message: `Cannot ${method} ${path}`,
    });
  } catch (err) {
    logger.error('Unhandled Lambda exception', err, { requestId, method, path });
    return jsonResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
}
