/**
 * Data Access Seam for future persistence (Neon / RDS Postgres).
 * Currently provides an in-memory / no-op repository implementation to maintain statelessness.
 */

export interface RoundRecord {
  level: number;
  sequence: number[];
  playerAnswer: number[];
  isCorrect: boolean;
  timestamp: string;
}

export interface GameRepository {
  recordRound(record: RoundRecord): Promise<void>;
  getHighScores(): Promise<Array<{ level: number; date: string }>>;
}

class StatelessGameRepository implements GameRepository {
  async recordRound(_record: RoundRecord): Promise<void> {
    // Stateless by default - no-op seam ready for Postgres adapter injection
  }

  async getHighScores(): Promise<Array<{ level: number; date: string }>> {
    return [];
  }
}

export const gameRepository: GameRepository = new StatelessGameRepository();

