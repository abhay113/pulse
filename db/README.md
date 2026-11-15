# Pulse Database Architecture & Migration Plan

This directory is a placeholder and design blueprint for adding a persistent relational database (such as Neon Serverless Postgres or AWS RDS Aurora Serverless v2) to Pulse.

## Current State: Stateless HMAC Architecture
The initial release of Pulse is intentionally stateless:
- Round generation produces a cryptographic HMAC signature containing `level`, `sequence`, and `timestamp`.
- Verification validates the cryptographic signature and checks the player's submitted answer sequence against the signed payload.
- No database connections or session state are required, guaranteeing sub-10ms Lambda cold starts and zero database idle costs.

## Future State: Relational Database Integration
When leaderboard tracking, persistent player profiles, or replay analytics are required, Postgres will be integrated cleanly using the **Repository Pattern** defined in `apps/api/src/db/`.

### Proposed Schema

```sql
-- schema.sql

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    highest_level INT NOT NULL DEFAULT 1,
    score INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' -- ACTIVE, COMPLETED, ABANDONED
);

CREATE TABLE game_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    level INT NOT NULL,
    sequence JSONB NOT NULL,
    player_answer JSONB,
    reaction_time_ms INT,
    is_correct BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_score ON game_sessions (score DESC, ended_at ASC);
CREATE INDEX idx_players_username ON players (username);
```

### Data Access Seam (Repository Interface)
To integrate Postgres without modifying the API route handlers, implement the `GameRepository` interface:

```typescript
// apps/api/src/db/repository.ts
export interface PlayerRecord {
  id: string;
  username: string;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  playerId?: string;
  highestLevel: number;
  score: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
}

export interface GameRepository {
  createSession(playerId?: string): Promise<SessionRecord>;
  recordRoundResult(sessionId: string, level: number, answer: number[], isCorrect: boolean): Promise<void>;
  getLeaderboard(limit?: number): Promise<Array<{ username: string; score: number; highestLevel: number }>>;
}
```

### Connection Strategy
- **Provider Choice**: Neon Serverless Postgres via `@neondatabase/serverless` (HTTP / WebSocket pooled connection) or AWS RDS Aurora Serverless v2 behind RDS Proxy.
- **Connection Pooling**: Neon's connection pooler or RDS Proxy avoids exhausting connection pools during Lambda scale-outs.
- **Migration Tooling**: Drizzle ORM or Prisma migrations executed in CI/CD before deployment.

