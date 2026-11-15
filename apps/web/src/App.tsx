import React, { useState, useEffect, useCallback } from 'react';
import { ParticleCanvas } from './components/ParticleCanvas';
import { NeonPad } from './components/NeonPad';
import { ScoreBoard, type GameState } from './components/ScoreBoard';
import { soundFx } from './utils/audio';
import { fetchRound, verifyRound, fetchHealth, type HealthResponse } from './utils/api';
import { Play, RotateCcw, AlertTriangle, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pulse_high_score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [activePad, setActivePad] = useState<number | null>(null);
  const [currentSequence, setCurrentSequence] = useState<number[]>([]);
  const [currentToken, setCurrentToken] = useState<string>('');
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [isSuccessFlash, setIsSuccessFlash] = useState<boolean>(false);
  const [isShake, setIsShake] = useState<boolean>(false);

  // Check backend health on mount
  useEffect(() => {
    fetchHealth()
      .then((data) => setHealthStatus(data))
      .catch((err) => console.warn('Backend health check pending or offline:', err.message));
  }, []);

  const handleToggleSound = () => {
    soundFx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Light up a pad visually and audibly
  const flashPad = useCallback((padId: number, durationMs = 350) => {
    setActivePad(padId);
    soundFx.playPad(padId, durationMs / 1000);
    setTimeout(() => {
      setActivePad((curr) => (curr === padId ? null : curr));
    }, durationMs);
  }, []);

  // Playback server sequence to the player
  const playSequence = useCallback(
    (sequence: number[]) => {
      setGameState('PLAYBACK');
      let index = 0;

      // Adjust speed as level increases
      const stepDuration = Math.max(300, 550 - level * 20);
      const gapDuration = 180;

      const interval = setInterval(() => {
        if (index >= sequence.length) {
          clearInterval(interval);
          setActivePad(null);
          setPlayerInput([]);
          setGameState('PLAYER_INPUT');
          return;
        }

        const padId = sequence[index];
        if (padId !== undefined) {
          flashPad(padId, stepDuration);
        }
        index++;
      }, stepDuration + gapDuration);
    },
    [level, flashPad],
  );

  // Start round
  const startRound = useCallback(
    async (targetLevel: number) => {
      setGameState('LOADING');
      setErrorMessage(null);
      try {
        const roundData = await fetchRound(targetLevel);
        setCurrentSequence(roundData.sequence);
        setCurrentToken(roundData.token);
        setLevel(targetLevel);

        // Brief delay before sequence playback starts
        setTimeout(() => {
          playSequence(roundData.sequence);
        }, 600);
      } catch (err) {
        setGameState('IDLE');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to game server');
      }
    },
    [playSequence],
  );

  // Handle player pressing a pad
  const handlePadPress = async (padId: number) => {
    if (gameState !== 'PLAYER_INPUT') return;

    flashPad(padId, 220);
    const updatedInput = [...playerInput, padId];
    setPlayerInput(updatedInput);

    // Immediate local fail-fast check: if current tap deviates from known sequence
    if (updatedInput[updatedInput.length - 1] !== currentSequence[updatedInput.length - 1]) {
      // Wrong tap immediately ends game
      soundFx.playGameOver();
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      setGameState('GAME_OVER');
      return;
    }

    // Sequence fully entered: verify with server HMAC
    if (updatedInput.length === currentSequence.length) {
      setGameState('VERIFYING');

      try {
        const verification = await verifyRound(currentToken, updatedInput);
        if (verification.correct) {
          soundFx.playSuccess();
          setIsSuccessFlash(true);
          setTimeout(() => setIsSuccessFlash(false), 450);

          const addedScore = level * 100 + currentSequence.length * 10;
          const newScore = score + addedScore;
          setScore(newScore);

          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('pulse_high_score', newScore.toString());
          }

          setGameState('ROUND_SUCCESS');
          setTimeout(() => {
            startRound(verification.nextLevel);
          }, 800);
        } else {
          soundFx.playGameOver();
          setIsShake(true);
          setTimeout(() => setIsShake(false), 500);
          setGameState('GAME_OVER');
        }
      } catch (err) {
        setGameState('GAME_OVER');
        setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
      }
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYER_INPUT') return;

      const keyMap: Record<string, number> = {
        '1': 0,
        q: 0,
        Q: 0,
        '2': 1,
        w: 1,
        W: 1,
        '3': 2,
        a: 2,
        A: 2,
        '4': 3,
        s: 3,
        S: 3,
      };

      const padId = keyMap[e.key];
      if (padId !== undefined) {
        handlePadPress(padId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleStartGame = () => {
    setScore(0);
    startRound(1);
  };

  return (
    <div className="min-h-screen bg-darkBg text-gray-100 flex flex-col items-center justify-between p-4 sm:p-6 cyber-grid ambient-glow relative overflow-hidden select-none">
      <ParticleCanvas />

      {/* Screen flash on victory */}
      {isSuccessFlash && (
        <div className="fixed inset-0 bg-lime-400/20 pointer-events-none z-50 animate-flash" />
      )}

      {/* Header & Scoreboard */}
      <header className="w-full flex flex-col items-center z-10">
        <ScoreBoard
          level={level}
          score={score}
          highScore={highScore}
          gameState={gameState}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          playerInputCount={playerInput.length}
          totalSequenceLength={currentSequence.length}
        />
      </header>

      {/* Main Interactive Game Area */}
      <main
        className={`w-full max-w-md my-auto flex flex-col items-center z-10 transition-transform ${
          isShake ? 'animate-shake' : ''
        }`}
      >
        {/* Error notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-red-950/80 border border-red-500 rounded-xl flex items-center gap-2 text-sm text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2x2 Neon Pad Array */}
        <div className="w-full p-3 bg-black/50 border border-gray-800 rounded-3xl shadow-2xl backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <NeonPad
              id={0}
              label="CYAN"
              hotkey="1/Q"
              isActive={activePad === 0}
              disabled={gameState !== 'PLAYER_INPUT'}
              onPress={handlePadPress}
            />
            <NeonPad
              id={1}
              label="MAGENTA"
              hotkey="2/W"
              isActive={activePad === 1}
              disabled={gameState !== 'PLAYER_INPUT'}
              onPress={handlePadPress}
            />
            <NeonPad
              id={2}
              label="LIME"
              hotkey="3/A"
              isActive={activePad === 2}
              disabled={gameState !== 'PLAYER_INPUT'}
              onPress={handlePadPress}
            />
            <NeonPad
              id={3}
              label="AMBER"
              hotkey="4/S"
              isActive={activePad === 3}
              disabled={gameState !== 'PLAYER_INPUT'}
              onPress={handlePadPress}
            />
          </div>
        </div>

        {/* Control Button Actions */}
        <div className="w-full mt-6">
          {gameState === 'IDLE' && (
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl font-display font-black text-lg tracking-widest text-black bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400 hover:opacity-90 active:scale-[0.99] transition shadow-glow-cyan flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              START PULSE
            </button>
          )}

          {gameState === 'GAME_OVER' && (
            <button
              type="button"
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl font-display font-black text-lg tracking-widest text-white bg-red-600 hover:bg-red-500 active:scale-[0.99] transition shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              PLAY AGAIN
            </button>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-md text-center py-2 z-10 flex items-center justify-between text-xs text-gray-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>CF Workers + AWS Lambda arm64</span>
        </div>
        <div>
          {healthStatus ? (
            <span className="text-emerald-400">● API Online</span>
          ) : (
            <span className="text-gray-500">○ Connecting...</span>
          )}
        </div>
      </footer>
    </div>
  );
};

