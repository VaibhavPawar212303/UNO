import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, RefreshCw, Layers } from 'lucide-react';
import { GameLog } from '../types';

interface GameLogsComponentProps {
  logs: GameLog[];
  onClearLogs?: () => void;
}

export const GameLogsComponent: React.FC<GameLogsComponentProps> = ({ logs, onClearLogs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogStyle = (type: GameLog['type']) => {
    switch (type) {
      case 'info':
        return {
          textColor: 'text-sky-300',
          labelColor: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          label: 'INFO',
        };
      case 'success':
        return {
          textColor: 'text-emerald-300',
          labelColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          label: 'DONE',
        };
      case 'warn':
        return {
          textColor: 'text-amber-300',
          labelColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          label: 'WARN',
        };
      case 'danger':
        return {
          textColor: 'text-rose-300',
          labelColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          label: 'FAIL',
        };
      default:
        return {
          textColor: 'text-slate-300',
          labelColor: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
          label: 'SYS',
        };
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">
            CONSOLE_OUTPUT
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              title="Clear Console"
              className="ml-2 font-mono text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Console Log Feed */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 min-h-[160px] max-h-[300px] sm:max-h-none font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
            <Layers className="w-8 h-8 opacity-20 mb-1" />
            <span>Listening for packet actions...</span>
          </div>
        ) : (
          logs.map((log) => {
            const style = getLogStyle(log.type);
            return (
              <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/40 p-0.5 rounded transition-colors group">
                {/* Time Indicator */}
                <span className="text-[10px] text-slate-600 select-none font-normal shrink-0 mt-0.5">
                  {log.timestamp}
                </span>

                {/* Level Badge */}
                <span className={`text-[9px] px-1 py-0.2 border rounded shrink-0 font-bold tracking-tight text-center w-11 ${style.labelColor}`}>
                  {style.label}
                </span>

                {/* Message */}
                <span className={`break-words ${style.textColor} leading-tight`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Console Footer Status */}
      <div className="bg-slate-900/60 border-t border-slate-900/90 px-4 py-1.5 flex justify-between items-center text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-500/70" /> Firewall: Active (Port 3000)
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Connection: STABLE
        </span>
      </div>
    </div>
  );
};
