export interface HealthResponse {
  status: 'ok';
  version: string;
  time: string;
}

export interface RoundResponse {
  level: number;
  sequence: number[];
  token: string;
  padCount: number;
}

export interface VerifyResponse {
  correct: boolean;
  nextLevel: number;
  message?: string;
}

export interface ScoreResponse {
  success: boolean;
  message: string;
  emailSent: boolean;
  recipient?: string | undefined;
  error?: string | undefined;
}

export interface TokenPayload extends Record<string, unknown> {
  level: number;
  sequence: number[];
  exp: number; // UNIX timestamp in milliseconds
  nonce: string;
}

export interface OtpTokenPayload extends Record<string, unknown> {
  email: string;
  salt: string;
  otpHash: string;
  exp: number;
  sub: 'otp_verification';
}

export interface UserSessionPayload extends Record<string, unknown> {
  email: string;
  exp: number;
  sub: 'user_session';
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  otpToken?: string | undefined;
  expiresInSeconds?: number | undefined;
  error?: string | undefined;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  sessionToken?: string | undefined;
  user?:
    | {
        email: string;
      }
    | undefined;
  error?: string | undefined;
}

export interface BroadcastRecipientResult {
  email: string;
  sent: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}

export interface BroadcastScoreResponse {
  success: boolean;
  message: string;
  total: number;
  sentCount: number;
  failedCount: number;
  results: BroadcastRecipientResult[];
  error?: string | undefined;
}
