import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { randomInt, randomUUID } from 'node:crypto';
import { logger } from './logger.js';
import {
  roundQuerySchema,
  verifyBodySchema,
  scoreBodySchema,
  sendOtpSchema,
  verifyOtpSchema,
  broadcastScoreSchema,
} from './validation.js';
import {
  signToken,
  verifyToken,
  signPayload,
  verifyPayload,
  generateOtp,
  generateSalt,
  hashOtp,
  verifyOtpHash,
} from './crypto.js';
import { gameRepository } from './db/repository.js';
import { sendScoreEmail, sendOtpEmail, sendBroadcastScoreEmails } from './email.js';
import type {
  HealthResponse,
  RoundResponse,
  VerifyResponse,
  ScoreResponse,
  SendOtpResponse,
  VerifyOtpResponse,
  BroadcastScoreResponse,
  OtpTokenPayload,
  UserSessionPayload,
} from './types.js';

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

    // POST /api/auth/send-otp
    if (path === '/api/auth/send-otp' && method === 'POST') {
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

      const parseResult = sendOtpSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        logger.warn('Invalid send-otp payload', {
          requestId,
          issues: parseResult.error.issues,
        });
        return jsonResponse(400, {
          error: 'Bad Request',
          issues: parseResult.error.issues.map((i) => i.message),
        });
      }

      const email = parseResult.data.email.toLowerCase();
      const otp = generateOtp();
      const salt = generateSalt();
      const otpHash = hashOtp(otp, salt, email);
      const exp = Date.now() + 10 * 60 * 1000; // 10 minutes

      const otpToken = signPayload<OtpTokenPayload>({
        email,
        salt,
        otpHash,
        exp,
        sub: 'otp_verification',
      });

      const emailResult = await sendOtpEmail(email, otp);

      const response: SendOtpResponse = {
        success: true,
        message: emailResult.sent
          ? `Verification code dispatched to ${email}`
          : 'Verification code generated (email send skipped)',
        otpToken,
        expiresInSeconds: 600,
        ...(emailResult.error ? { error: emailResult.error } : {}),
      };

      logger.info('Dispatched OTP access code', { requestId, recipient: email });
      return jsonResponse(200, response);
    }

    // POST /api/auth/verify-otp
    if (path === '/api/auth/verify-otp' && method === 'POST') {
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

      const parseResult = verifyOtpSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        logger.warn('Invalid verify-otp payload', {
          requestId,
          issues: parseResult.error.issues,
        });
        return jsonResponse(400, {
          error: 'Bad Request',
          issues: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { email, otp, otpToken } = parseResult.data;
      const normalizedEmail = email.toLowerCase();
      const tokenRes = verifyPayload<OtpTokenPayload>(otpToken);

      if (!tokenRes.valid || !tokenRes.payload || tokenRes.payload.sub !== 'otp_verification') {
        logger.warn('OTP token verification failed', {
          requestId,
          reason: tokenRes.reason,
        });
        return jsonResponse(401, {
          success: false,
          message: tokenRes.reason || 'Verification code has expired. Please request a new code.',
        });
      }

      if (tokenRes.payload.email.toLowerCase() !== normalizedEmail) {
        return jsonResponse(401, {
          success: false,
          message: 'Email address does not match verification session',
        });
      }

      const isMatch = verifyOtpHash(
        otp,
        tokenRes.payload.salt,
        normalizedEmail,
        tokenRes.payload.otpHash,
      );
      if (!isMatch) {
        logger.warn('Incorrect OTP code submitted', { requestId, email: normalizedEmail });
        return jsonResponse(401, {
          success: false,
          message: 'Incorrect 6-digit verification code. Please check and try again.',
        });
      }

      // 30-day authenticated session token
      const sessionExp = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const sessionToken = signPayload<UserSessionPayload>({
        email: normalizedEmail,
        exp: sessionExp,
        sub: 'user_session',
      });

      const response: VerifyOtpResponse = {
        success: true,
        message: 'Authentication successful',
        sessionToken,
        user: { email: normalizedEmail },
      };

      logger.info('Player authenticated successfully', { requestId, email: normalizedEmail });
      return jsonResponse(200, response);
    }

    // POST /api/score
    if (path === '/api/score' && method === 'POST') {
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

      const parseResult = scoreBodySchema.safeParse(parsedBody);
      if (!parseResult.success) {
        logger.warn('Invalid score payload', {
          requestId,
          issues: parseResult.error.issues,
        });
        return jsonResponse(400, {
          error: 'Bad Request',
          issues: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { score, level, playerName, sessionToken } = parseResult.data;

      // Only authenticated players with a verified session token receive score emails
      if (!sessionToken) {
        logger.info('Guest session score - no email dispatched', { requestId, score, level });
        return jsonResponse(200, {
          success: true,
          emailSent: false,
          message: 'Score recorded (guest mode - no email sent)',
        });
      }

      const sess = verifyPayload<UserSessionPayload>(sessionToken);
      if (!sess.valid || !sess.payload || sess.payload.sub !== 'user_session') {
        logger.warn('Score submission with invalid or expired session token', { requestId });
        return jsonResponse(401, {
          success: false,
          emailSent: false,
          message: 'Session has expired. Please log in again to receive score reports.',
        });
      }

      const targetEmail = sess.payload.email;
      logger.info('Processing authenticated game score submission', {
        requestId,
        score,
        level,
        playerName,
        targetEmail,
      });

      const emailResult = await sendScoreEmail({
        score,
        level,
        playerName,
        recipientEmail: targetEmail,
      });

      const response: ScoreResponse = {
        success: true,
        emailSent: emailResult.sent,
        message: emailResult.sent
          ? `Score report dispatched to ${targetEmail}`
          : 'Score recorded (email delivery skipped)',
        recipient: targetEmail,
        ...(emailResult.error ? { error: emailResult.error } : {}),
      };

      return jsonResponse(200, response);
    }

    // POST /api/score/broadcast
    if (path === '/api/score/broadcast' && method === 'POST') {
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

      const parseResult = broadcastScoreSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        logger.warn('Invalid broadcast score payload', {
          requestId,
          issues: parseResult.error.issues,
        });
        return jsonResponse(400, {
          error: 'Bad Request',
          issues: parseResult.error.issues.map((i) => i.message),
        });
      }

      const { score, level, playerName, sessionToken, recipients } = parseResult.data;

      const sess = verifyPayload<UserSessionPayload>(sessionToken);
      if (!sess.valid || !sess.payload || sess.payload.sub !== 'user_session') {
        logger.warn('Broadcast attempt with invalid or expired session token', { requestId });
        return jsonResponse(401, {
          success: false,
          total: recipients.length,
          sentCount: 0,
          failedCount: recipients.length,
          results: [],
          message: 'Session has expired or is invalid. Please log in again to broadcast scores.',
        });
      }

      const senderEmail = sess.payload.email;
      logger.info('Processing score broadcast dispatch', {
        requestId,
        score,
        level,
        playerName,
        senderEmail,
        recipientCount: recipients.length,
      });

      const deliveryResults = await sendBroadcastScoreEmails({
        score,
        level,
        senderEmail,
        playerName,
        recipients,
      });

      const sentCount = deliveryResults.filter((r) => r.sent).length;
      const failedCount = deliveryResults.length - sentCount;

      const response: BroadcastScoreResponse = {
        success: sentCount > 0,
        message:
          sentCount === deliveryResults.length
            ? `Score broadcast successfully dispatched to ${sentCount} player(s)`
            : `Score broadcast dispatched: ${sentCount} succeeded, ${failedCount} failed`,
        total: deliveryResults.length,
        sentCount,
        failedCount,
        results: deliveryResults,
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
