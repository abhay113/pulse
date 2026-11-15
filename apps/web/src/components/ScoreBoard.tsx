import React from 'react';
import { Volume2, VolumeX, ShieldCheck, Zap } from 'lucide-react';

export type GameState =
  | 'IDLE'
  | 'LOADING'
  | 'PLAYBACK'
  | 'PLAYER_INPUT'
  | 'VERIFYING'
  | 'ROUND_SUCCESS'
  | 'GAME_OVER';

interface ScoreBoardProps {
  level: number;
  score: number;
  highScore: number;
  gameState: GameState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playerInputCount: number;
  totalSequenceLength: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  level,
  score,
  highScore,
  gameState,
  soundEnabled,
  onToggleSound,
  playerInputCount,
  totalSequenceLength,
}) => {
  const getStatusBadge = () => {
    switch (gameState) {
      case 'IDLE':
        return { text: 'STANDBY', color: 'border-gray-600 text-gray-400 bg-gray-900/50' };
      case 'LOADING':
        return { text: 'SYNCING...', color: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40 animate-pulse' };
      case 'PLAYBACK':
        return { text: 'WATCH PULSE', color: 'border-pink-500/50 text-pink-300 bg-pink-950/40 animate-pulse' };
      case 'PLAYER_INPUT':
        return {
          text: `YOUR TURN (${playerInputCount}/${totalSequenceLength})`,
          color: 'border-lime-500 text-lime-300 bg-lime-950/50 shadow-glow-lime',
        };
      case 'VERIFYING':
        return { text: 'CHECKING HMAC', color: 'border-amber-500/50 text-amber-300 bg-amber-950/40 animate-pulse' };
      case 'ROUND_SUCCESS':
        return { text: 'CLEAR!', color: 'border-lime-400 text-lime-400 bg-lime-950/60' };
      case 'GAME_OVER':
        return { text: 'SIGNAL LOST', color: 'border-red-500 text-red-400 bg-red-950/60' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="w-full max-w-md bg-cardBg/90 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h1 className="font-display font-black text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-400">
            PULSE
          </h1>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            v1.0
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white transition border border-gray-700"
          aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
          title={soundEnabled ? 'Audio On' : 'Audio Muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="p-2 rounded-lg bg-black/40 border border-gray-800">
          <div className="text-[10px] font-mono text-gray-400 tracking-wider uppercase">Level</div>
          <div className="font-display text-2xl font-bold text-cyan-400">{level}</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-gray-800">
          <div className="text-[10px] font-mono text-gray-400 tracking-wider uppercase">Score</div>
          <div className="font-display text-2xl font-bold text-pink-400">{score}</div>
        </div>
        <div className="p-2 rounded-lg bg-black/40 border border-gray-800">
          <div className="text-[10px] font-mono text-gray-400 tracking-wider uppercase">Best</div>
          <div className="font-display text-2xl font-bold text-amber-400">{highScore}</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div
          className={`px-3 py-1 text-xs font-mono font-bold tracking-wider rounded-full border transition-all duration-300 ${badge.color}`}
        >
          {badge.text}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>HMAC-Signed</span>
        </div>
      </div>
    </div>
  );
};

