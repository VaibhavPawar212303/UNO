import React from 'react';
import { Lock, Unlock, FolderSync, Zap, Globe } from 'lucide-react';
import { Protocol } from '../types';

interface ColorChooserDialogProps {
  onSelect: (protocol: Exclude<Protocol, 'wild'>) => void;
  isOpen: boolean;
}

export const ColorChooserDialog: React.FC<ColorChooserDialogProps> = ({ onSelect, isOpen }) => {
  if (!isOpen) return null;

  const choices: {
    protocol: Exclude<Protocol, 'wild'>;
    label: string;
    port: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    hoverClass: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      protocol: 'https',
      label: 'HTTPS',
      port: 'Port 443 (Secure TLS)',
      desc: 'Encrypted safe connections. High compliance routing.',
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-950/40',
      borderClass: 'border-rose-500/30',
      hoverClass: 'hover:border-rose-500 hover:bg-rose-950/60',
      icon: <Lock className="w-5 h-5 text-rose-400" />,
    },
    {
      protocol: 'http',
      label: 'HTTP',
      port: 'Port 80 (Legacy Plain)',
      desc: 'Plain text standard. Bypasses firewall with low latency.',
      colorClass: 'text-sky-400',
      bgClass: 'bg-sky-950/40',
      borderClass: 'border-sky-500/30',
      hoverClass: 'hover:border-sky-500 hover:bg-sky-950/60',
      icon: <Unlock className="w-5 h-5 text-sky-400" />,
    },
    {
      protocol: 'ftp',
      label: 'FTP',
      port: 'Port 21 (File Stream)',
      desc: 'High packet transfers for binary content distribution.',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-500/30',
      hoverClass: 'hover:border-emerald-500 hover:bg-emerald-950/60',
      icon: <FolderSync className="w-5 h-5 text-emerald-400" />,
    },
    {
      protocol: 'ws',
      label: 'WS',
      port: 'WebSocket TCP Socket',
      desc: 'Full-duplex real-time events. Low overhead frame streaming.',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-500/30',
      hoverClass: 'hover:border-amber-500 hover:bg-amber-950/60',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative select-none">
        
        {/* Glowing background header effect */}
        <div className="absolute -top-10 left-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Globe className="w-4 h-4 text-purple-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold tracking-tight text-slate-100">DNS_REFLOW_SELECT</h3>
            <p className="text-[11px] font-mono text-slate-400">Rewrite network DNS routing table protocols</p>
          </div>
        </div>

        <p className="text-[11px] font-mono text-slate-400 mb-5 leading-normal">
          You played a <span className="text-purple-400 font-semibold">Wildcard packet</span>! Overwrite the active server endpoint protocol and force standard client requests to stream via the selected socket.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {choices.map((choice) => (
            <button
              key={choice.protocol}
              onClick={() => onSelect(choice.protocol)}
              className={`w-full text-left p-3.5 rounded-xl border-2 ${choice.bgClass} ${choice.borderClass} ${choice.hoverClass} transition-all duration-150 flex items-center gap-3 cursor-pointer group`}
            >
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 group-hover:scale-105 transition-transform flex-shrink-0">
                {choice.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-mono font-bold tracking-wide ${choice.colorClass}`}>
                    {choice.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                    {choice.port}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 mt-1 leading-normal truncate">
                  {choice.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 text-[9px] font-mono text-center text-slate-600">
          * Choices are mapped across system-wide TCP routing gateways.
        </div>
      </div>
    </div>
  );
};
