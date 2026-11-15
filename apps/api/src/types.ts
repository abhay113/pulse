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

export interface TokenPayload {
  level: number;
  sequence: number[];
  exp: number; // UNIX timestamp in milliseconds
  nonce: string;
}

