import React from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, FolderSync, Zap, Globe, ShieldAlert } from 'lucide-react';
import { UnoCard, Protocol } from '../types';

interface UnoCardComponentProps {
  card: UnoCard;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hand';
  faceDown?: boolean;
}

// Vibrant classic UNO colors with dark accessible fallback text for light yellow
const colorMap: Record<Protocol, {
  bg: string;              // Outer block background
  innerBorder: string;      // Classic crisp inner line color
  ellipseBg: string;       // Background color of tilted central oval
  text: string;            // Mammoth text character color inside oval
  cornerText: string;      // Side corner numbers
  shadow: string;          // Modern neon card hover depth glow
  protocolLogo: string;    // Brand text colored matching
}> = {
  https: {
    bg: 'bg-red-600',
    innerBorder: 'border-white/85',
    ellipseBg: 'bg-white',
    text: 'text-red-600',
    cornerText: 'text-white',
    shadow: 'shadow-[0_4px_18px_rgba(220,38,38,0.45)] hover:shadow-[0_4px_25px_rgba(220,38,38,0.65)]',
    protocolLogo: 'text-red-500',
  },
  http: {
    bg: 'bg-blue-600',
    innerBorder: 'border-white/85',
    ellipseBg: 'bg-white',
    text: 'text-blue-600',
    cornerText: 'text-white',
    shadow: 'shadow-[0_4px_18px_rgba(37,99,235,0.45)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.65)]',
    protocolLogo: 'text-blue-500',
  },
  ftp: {
    bg: 'bg-emerald-600',
    innerBorder: 'border-white/85',
    ellipseBg: 'bg-white',
    text: 'text-emerald-600',
    cornerText: 'text-white',
    shadow: 'shadow-[0_4px_18px_rgba(16,185,129,0.45)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.65)]',
    protocolLogo: 'text-emerald-500',
  },
  ws: {
    bg: 'bg-amber-400',
    innerBorder: 'border-black/50',
    ellipseBg: 'bg-white',
    text: 'text-amber-500',
    cornerText: 'text-black',
    shadow: 'shadow-[0_4px_18px_rgba(245,158,11,0.45)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.65)]',
    protocolLogo: 'text-amber-500',
  },
  wild: {
    bg: 'bg-zinc-950 ring-2 ring-white/10',
    innerBorder: 'border-white/80',
    ellipseBg: 'bg-transparent', // Handled via quadrant segments
    text: 'text-white',
    cornerText: 'text-white font-extrabold',
    shadow: 'shadow-[0_6px_22px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_30px_rgba(168,85,247,0.55)]',
    protocolLogo: 'text-purple-400',
  },
};

const sizeConfig = {
  xs: {
    width: 'w-8 sm:w-10 h-11 sm:h-13',
    innerMargin: 'inset-[1px]',
    cornerOffset: 'top-0.5 left-0.5',
    cornerOffsetRight: 'bottom-0.5 right-0.5',
    cornerText: 'text-[7px] font-black',
    cornerSubtitle: 'text-[3px]',
    centerText: 'text-[8px]',
    iconSize: 'w-2 h-2',
    badgeText: 'text-[5px]',
    badgeSub: 'text-[3px]',
    badgeBottom: 'bottom-0.5',
  },
  sm: {
    width: 'w-14 sm:w-20 h-20 sm:h-28',
    innerMargin: 'inset-[2px] sm:inset-1',
    cornerOffset: 'top-1 left-1 sm:top-1.5 sm:left-1.5',
    cornerOffsetRight: 'bottom-1 right-1 sm:bottom-1.5 sm:right-1.5',
    cornerText: 'text-[8px] sm:text-xs font-black',
    cornerSubtitle: 'text-[3px] sm:text-[5px]',
    centerText: 'text-xs sm:text-lg',
    iconSize: 'w-1.5 h-1.5 sm:w-2.5 h-2.5',
    badgeText: 'text-[4.5px] sm:text-[6px]',
    badgeSub: 'text-[3.5px] sm:text-[5px]',
    badgeBottom: 'bottom-1 sm:bottom-2.5',
  },
  md: {
    width: 'w-32 h-44',
    innerMargin: 'inset-1.5',
    cornerOffset: 'top-2.5 left-2.5',
    cornerOffsetRight: 'bottom-2.5 right-2.5',
    cornerText: 'text-lg font-black',
    cornerSubtitle: 'text-[7px]',
    centerText: 'text-4xl',
    iconSize: 'w-4 h-4',
    badgeText: 'text-[9px]',
    badgeSub: 'text-[7px]',
    badgeBottom: 'bottom-5',
  },
  lg: {
    width: 'w-40 h-56',
    innerMargin: 'inset-2',
    cornerOffset: 'top-3 left-3',
    cornerOffsetRight: 'bottom-3 right-3',
    cornerText: 'text-xl font-black',
    cornerSubtitle: 'text-[9px]',
    centerText: 'text-5xl',
    iconSize: 'w-5 h-5',
    badgeText: 'text-[11px]',
    badgeSub: 'text-[9px]',
    badgeBottom: 'bottom-7',
  },
  hand: {
    width: 'w-18 sm:w-22 h-26 sm:h-32',
    innerMargin: 'inset-1',
    cornerOffset: 'top-1 left-1 sm:top-1.5 sm:left-1.5',
    cornerOffsetRight: 'bottom-1 right-1 sm:bottom-1.5 sm:right-1.5',
    cornerText: 'text-xs sm:text-sm font-black',
    cornerSubtitle: 'text-[5px] sm:text-[6px]',
    centerText: 'text-xl sm:text-2xl',
    iconSize: 'w-2.5 h-2.5 sm:w-3 h-3',
    badgeText: 'text-[6px] sm:text-[7px]',
    badgeSub: 'text-[4px] sm:text-[5px]',
    badgeBottom: 'bottom-2 sm:bottom-3',
  }
};

export const UnoCardComponent: React.FC<UnoCardComponentProps> = ({
  card,
  onClick,
  disabled = false,
  isPlayable = false,
  size = 'md',
  faceDown = false,
}) => {
  const getProtocolIcon = (proto: Protocol, type: string) => {
    switch (proto) {
      case 'https':
        return <Lock className="inline w-3 h-3 align-middle" />;
      case 'http':
        return <Unlock className="inline w-3 h-3 align-middle" />;
      case 'ftp':
        return <FolderSync className="inline w-3 h-3 align-middle" />;
      case 'ws':
        return <Zap className="inline w-3 h-3 align-middle" />;
      case 'wild':
        if (type === 'wild4') {
          return <ShieldAlert className="inline w-3 h-3 align-middle" />;
        }
        return <Globe className="inline w-3 h-3 align-middle" />;
    }
  };

  const getCleanLabel = (type: string, value: string | number) => {
    if (type === 'skip') return 'Ø';
    if (type === 'reverse') return '⇄';
    if (type === 'draw2') return '+2';
    if (type === 'wild4') return '+4';
    if (type === 'wild') return 'DNS';
    return value.toString();
  };

  const cSize = sizeConfig[size];

  if (faceDown) {
    const isXs = size === 'xs';
    return (
      <motion.div
        whileHover={!disabled && !isXs ? { y: -10, rotate: 1 } : {}}
        className={`${cSize.width} rounded-xl bg-gradient-to-br from-rose-650 to-rose-750 border-[2px] sm:border-[3.5px] border-slate-100 flex flex-col items-center justify-center relative select-none shadow-sm overflow-hidden`}
        style={{ boxShadow: 'inset 0 0 16px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.3)' }}
      >
        {/* Core UNO Back color rings & curves */}
        <div className={`absolute ${cSize.innerMargin} border-[1px] border-white/40 rounded-lg pointer-events-none`} />
        
        {/* Yellow-Orange tilted ellipse */}
        <div className="absolute w-[120%] h-[60%] bg-gradient-to-br from-amber-400 to-orange-500 rounded-[50%] rotate-[-21deg] skew-x-[-12deg] flex items-center justify-center shadow-inner">
          {/* Internal aligned text badge */}
          {!isXs ? (
            <div className="rotate-[21deg] skew-x-[12deg] flex flex-col items-center justify-center">
              <span 
                className="text-2xl sm:text-3xl font-sans font-black italic tracking-tighter text-white uppercase"
                style={{ textShadow: '2px 2px 0px #0c152d, -1px -1px 0px #0c152d, 1px -1px 0px #0c152d, -1px 1px 0px #0c152d, 1px 1px 0px #0c152d' }}
              >
                URL
              </span>
              <span 
                className="text-[8px] sm:text-[10px] font-sans font-black tracking-widest text-[#0c152d] uppercase leading-none mt-1"
              >
                UNO
              </span>
            </div>
          ) : (
            <div className="rotate-[21deg] skew-x-[12deg] text-white font-black text-[8px] italic">UNO</div>
          )}
        </div>

        {/* System parameters label at very bottom */}
        {!isXs && (
          <div className="absolute bottom-2 text-[7px] font-mono text-white/50 tracking-wider">
            Web v1.0
          </div>
        )}
      </motion.div>
    );
  }

  const colors = colorMap[card.protocol];
  const valueLabel = getCleanLabel(card.type, card.value);

  return (
    <motion.div
      id={card.id}
      whileHover={!disabled && size !== 'hand' ? { y: -12, scale: 1.04, zIndex: 11 } : {}}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      className={`
        ${cSize.width} rounded-2xl ${colors.bg} border-[3.5px] border-slate-100 ${colors.shadow}
        relative select-none text-slate-100 transition-all duration-200
        ${onClick && !disabled ? 'cursor-pointer' : 'cursor-default'}
        ${isPlayable ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900 border-opacity-100' : ''}
        ${disabled && onClick ? 'opacity-65 grayscale-[20%]' : ''}
        overflow-hidden flex-shrink-0
      `}
      style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15), 0 4px 15px rgba(0,0,0,0.3)' }}
    >
      {/* Crisp Nested inner UNO boundary line outline */}
      <div className={`absolute ${cSize.innerMargin} border-[1.5px] ${colors.innerBorder} rounded-xl pointer-events-none z-10`} />

      {/* TOP-LEFT CORNER VALUE & PORT INDICATOR */}
      <div className={`absolute ${cSize.cornerOffset} flex flex-col items-center leading-none z-10 ${colors.cornerText}`}>
        <span className={`${cSize.cornerText} tracking-tight font-black italic`}>
          {valueLabel}
        </span>
        <span className={`${cSize.cornerSubtitle} font-mono font-bold uppercase tracking-tight mt-0.5`}>
          {getProtocolIcon(card.protocol, card.type)} {card.protocol === 'wild' ? '' : card.protocol}
        </span>
      </div>

      {/* MID CENTRAL CLASSIC UNO ELLIPSE (TILTED & SKEWED) */}
      <div className={`absolute w-[120%] h-[58%] top-[21%] left-[-10%] rounded-[50%] rotate-[-18deg] skew-x-[-10deg] shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center overflow-hidden border border-black/[0.04] bg-white`}>
        {/* If Wildcard, fill ellipse with 4 color quadrant quadrants */}
        {card.protocol === 'wild' && (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rotate-[45deg] scale-150">
            <div className="bg-red-650" />
            <div className="bg-blue-600" />
            <div className="bg-emerald-600" />
            <div className="bg-amber-400" />
          </div>
        )}

        {/* Mammoth centered typography aligned in reverse of skewed parent oval */}
        <div className="rotate-[18deg] skew-x-[10deg] flex flex-col items-center justify-center z-10 select-none">
          <span 
            className={`
              ${cSize.centerText} font-sans font-black italic tracking-tighter leading-none
              ${card.protocol === 'wild' ? 'text-white' : colors.text}
            `}
            style={{
              textShadow: card.protocol === 'wild'
                ? '3px 3px 0px rgba(0,0,0,0.85), -1px -1px 0px rgba(0,0,0,0.85), 1px -1px 0px rgba(0,0,0,0.85), -1px 1px 0px rgba(0,0,0,0.85), 1px 1px 0px rgba(0,0,0,0.85)'
                : '3px 3px 0px rgba(255,255,255,1), 4px 4px 4px rgba(0,0,0,0.18)'
            }}
          >
            {valueLabel}
          </span>
        </div>
      </div>

      {/* FLOATING MONOSPACE DOMAIN BADGE overlay across the bottom center */}
      <div className={`absolute ${cSize.badgeBottom} left-1/2 -translate-x-1/2 w-[82%] bg-slate-950/85 backdrop-blur-[1px] border border-white/20 rounded-lg px-1.5 py-1 text-center z-10 shadow-md`}>
        <div className={`${cSize.badgeText} font-mono font-bold text-white truncate uppercase tracking-tighter`}>
          {card.domain || 'WILD HOST'}
        </div>
        <div className={`${cSize.badgeSub} font-mono text-slate-400 truncate leading-none mt-0.5`}>
          {card.path || '/*'}
        </div>
      </div>

      {/* BOTTOM-RIGHT CORNER VAL (FLIPPED UPSIDE DOWN) */}
      <div className={`absolute ${cSize.cornerOffsetRight} flex flex-col items-center leading-none z-10 rotate-180 ${colors.cornerText}`}>
        <span className={`${cSize.cornerText} tracking-tight font-black italic`}>
          {valueLabel}
        </span>
        <span className={`${cSize.cornerSubtitle} font-mono font-bold uppercase tracking-tight mt-0.5`}>
          {getProtocolIcon(card.protocol, card.type)} {card.protocol === 'wild' ? '' : card.protocol}
        </span>
      </div>

    </motion.div>
  );
};
