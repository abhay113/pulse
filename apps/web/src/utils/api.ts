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

