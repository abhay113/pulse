import React from 'react';

interface NeonPadProps {
  id: number;
  label: string;
  hotkey: string;
  isActive: boolean;
  disabled: boolean;
  onPress: (id: number) => void;
}

const PAD_CONFIG: Record<
  number,
  {
    name: string;
    baseBorder: string;
    activeBorder: string;
    bgInactive: string;
    bgActive: string;
    glowClass: string;
    textClass: string;
    roundedCorner: string;
  }
> = {
  0: {
    name: 'CYAN',
    baseBorder: 'border-cyan-500/30',
    activeBorder: 'border-cyan-400',
    bgInactive: 'bg-cyan-950/20 hover:bg-cyan-950/40',
    bgActive: 'bg-cyan-400 shadow-glow-cyan scale-[0.97]',
    glowClass: 'shadow-glow-cyan',
    textClass: 'text-cyan-400',
    roundedCorner: 'rounded-tl-3xl',
  },
  1: {
    name: 'MAGENTA',
    baseBorder: 'border-pink-500/30',
    activeBorder: 'border-pink-400',
    bgInactive: 'bg-pink-950/20 hover:bg-pink-950/40',
    bgActive: 'bg-pink-500 shadow-glow-magenta scale-[0.97]',
    glowClass: 'shadow-glow-magenta',
    textClass: 'text-pink-400',
    roundedCorner: 'rounded-tr-3xl',
  },
  2: {
    name: 'LIME',
    baseBorder: 'border-lime-500/30',
    activeBorder: 'border-lime-400',
    bgInactive: 'bg-lime-950/20 hover:bg-lime-950/40',
    bgActive: 'bg-lime-400 shadow-glow-lime scale-[0.97]',
    glowClass: 'shadow-glow-lime',
    textClass: 'text-lime-400',
    roundedCorner: 'rounded-bl-3xl',
  },
  3: {
    name: 'AMBER',
    baseBorder: 'border-amber-500/30',
    activeBorder: 'border-amber-400',
    bgInactive: 'bg-amber-950/20 hover:bg-amber-950/40',
    bgActive: 'bg-amber-400 shadow-glow-amber scale-[0.97]',
    glowClass: 'shadow-glow-amber',
    textClass: 'text-amber-400',
    roundedCorner: 'rounded-br-3xl',
  },
};

export const NeonPad: React.FC<NeonPadProps> = ({
  id,
  label,
  hotkey,
  isActive,
  disabled,
  onPress,
}) => {
  const cfg = PAD_CONFIG[id] || PAD_CONFIG[0]!;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPress(id)}
      className={`touch-pad relative h-36 sm:h-44 w-full border-2 transition-all duration-150 flex flex-col items-center justify-center select-none overflow-hidden ${
        cfg.roundedCorner
      } ${
        isActive
          ? `${cfg.bgActive} ${cfg.activeBorder} z-10`
          : `${cfg.bgInactive} ${cfg.baseBorder} active:scale-95`
      } ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:border-opacity-60'}`}
      aria-label={`${label} Pad (Key ${hotkey})`}
    >
      {/* Inner subtle glow line */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/5 to-transparent" />

      {/* Center Label and Hotkey badge */}
      <span
        className={`font-display font-bold tracking-wider text-base sm:text-lg transition-colors duration-150 ${
          isActive ? 'text-black' : cfg.textClass
        }`}
      >
        {label}
      </span>
      <span
        className={`text-xs mt-1 font-mono tracking-widest opacity-60 ${
          isActive ? 'text-black font-semibold' : 'text-gray-400'
        }`}
      >
        [{hotkey}]
      </span>
    </button>
  );
};

