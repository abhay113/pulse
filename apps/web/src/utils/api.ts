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

export interface ScorePayload {
  score: number;
  level: number;
  playerName?: string;
  sessionToken?: string;
  recipientEmail?: string;
}

export interface ScoreResponse {
  success: boolean;
  emailSent: boolean;
  message: string;
  recipient?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  otpToken?: string;
  expiresInSeconds?: number;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  sessionToken?: string;
  user?: {
    email: string;
  };
  error?: string;
}

export async function sendOtp(email: string): Promise<SendOtpResponse> {
  const res = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Failed to send verification code (HTTP ${res.status})`);
  }
  return data;
}

export async function verifyOtp(email: string, otp: string, otpToken: string): Promise<VerifyOtpResponse> {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, otpToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Failed to verify code (HTTP ${res.status})`);
  }
  return data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRound(level: number): Promise<RoundResponse> {
  const res = await fetch(`/api/round?level=${level}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to fetch round for level ${level}`);
  }
  return res.json();
}

export async function verifyRound(token: string, answer: number[]): Promise<VerifyResponse> {
  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, answer }),
  });
  if (!res.ok && res.status !== 401) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to verify round`);
  }
  return res.json();
}

export async function submitScore(payload: ScorePayload): Promise<ScoreResponse> {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to submit score');
  }
  return res.json();
}
