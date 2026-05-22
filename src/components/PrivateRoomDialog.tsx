import React, { useState } from 'react';
import { Globe, Users, Copy, Check, Play, LogOut, Radio, User, ArrowRight, Shield, Bot } from 'lucide-react';
import { Player } from '../types';

interface PrivateRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  myPlayerId: string;
  roomId: string;
  isMultiplayer: boolean;
  players: Player[];
  onJoinRoom: (targetId: string) => Promise<void>;
  onCreateRoom: (totalPlayers: number, fillWithBots: boolean, speed: number) => Promise<void>;
  onLaunchGame: () => Promise<void>;
  onLeaveRoom: () => void;
  userName: string;
  onChangeUserName: (name: string) => void;
  userAvatar: string;
  onChangeUserAvatar: (avatar: string) => void;
}

const AVAILABLE_AVATARS = [
  { char: '💻', name: 'DevNode' },
  { char: '👦', name: 'SysAdmin' },
  { char: '👩', name: 'UX_Architect' },
  { char: '🟢', name: 'Socket' },
  { char: '🖥️', name: 'Server' },
  { char: '🤖', name: 'BotMod' },
  { char: '⚙️', name: 'Upstream' },
  { char: '📡', name: 'WebRTC' },
  { char: '🚀', name: 'CloudRun' },
  { char: '💡', name: 'Daemon' }
];

export const PrivateRoomDialog: React.FC<PrivateRoomDialogProps> = ({
  isOpen,
  onClose,
  myPlayerId,
  roomId,
  isMultiplayer,
  players,
  onJoinRoom,
  onCreateRoom,
  onLaunchGame,
  onLeaveRoom,
  userName,
  onChangeUserName,
  userAvatar,
  onChangeUserAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [fillBots, setFillBots] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitCreate = async () => {
    setLoading(true);
    try {
      await onCreateRoom(maxPlayers, fillBots, 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      await onJoinRoom(joinCode.trim().toUpperCase());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isHost = players.length > 0 && players[0].id === myPlayerId;

  return (
    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fade-in pointer-events-auto">
      <div className="w-full max-w-lg rounded-[28px] border-4 border-slate-900 bg-slate-900 shadow-2xl relative flex flex-col overflow-hidden max-h-[92%]">
        
        {/* Banner Decorative Stripe */}
        <div className="h-2 bg-gradient-to-r from-rose-500 via-sky-500 via-emerald-500 to-amber-500 w-full" />
        
        {/* Close Button / Leave Button */}
        <div className="flex justify-between items-center px-5 pt-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-wider text-white">
              {isMultiplayer ? 'MULTIPLAYER_ROUTER_SOCKET' : 'CONNECT_PRIVATE_ROOM'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono px-2.5 py-1 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg bg-slate-950/50 cursor-pointer"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* 1. Name & Avatar Selection (Only visible if not actively in an multiplayer lobby already) */}
          {!isMultiplayer && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Identity Configuration
              </span>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Display Username</label>
                <input
                  type="text"
                  maxLength={15}
                  value={userName}
                  onChange={(e) => onChangeUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-sans font-bold text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Select Socket Avatar</label>
                <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                  {AVAILABLE_AVATARS.map((avatar) => (
                    <button
                      key={avatar.char}
                      onClick={() => onChangeUserAvatar(avatar.char)}
                      className={`text-xl p-1.5 rounded-xl border transition-all cursor-pointer hover:bg-slate-900 ${
                        userAvatar === avatar.char
                          ? 'bg-indigo-500/20 border-indigo-500 shadow-md scale-103'
                          : 'bg-slate-900/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      {avatar.char}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Multiplayer Active Room Lobby Screen */}
          {isMultiplayer ? (
            <div className="space-y-4 font-mono">
              
              {/* Connection Status Card */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 tracking-wider font-semibold">ACTIVE ROOM KEY</div>
                  <div className="text-xl font-sans font-black text-amber-300 tracking-wide flex items-center gap-2">
                    {roomId}
                    <button
                      onClick={handleCopyLink}
                      className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Copy lobby code"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-[10px] text-slate-400 font-semibold tracking-wider">SOCKETS ONLINE</div>
                  <div className="text-sm font-black text-indigo-400 flex items-center gap-1.5 md:justify-end">
                    <Users className="w-4 h-4" /> {players.length} / 10 Active
                  </div>
                </div>
              </div>

              {/* Lobby Players list */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">CONNECTED CLIENT TERMINALS</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {players.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                        p.id === myPlayerId
                          ? 'bg-indigo-505/20 border-indigo-500/40'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      <span className="text-2xl">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-sans font-black text-slate-100 truncate flex items-center gap-1.5">
                          {p.name}
                          {p.id === myPlayerId && (
                            <span className="text-[8px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 uppercase scale-90">YOU</span>
                          )}
                        </div>
                        <div className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase tracking-wide flex items-center gap-1">
                          {idx === 0 ? <Shield className="w-2.5 h-2.5 text-amber-500" /> : <ArrowRight className="w-2.5 h-2.5" />} 
                          {idx === 0 ? 'Host Link' : `Guest Node ${idx}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Operations Panel */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onLeaveRoom}
                  className="flex-1 py-2 px-4 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all uppercase"
                >
                  <LogOut className="w-4 h-4" /> Disconnect Socket
                </button>
                
                {isHost ? (
                  <button
                    onClick={onLaunchGame}
                    className="flex-1 py-2 px-4 rounded-xl border-2 border-slate-950 bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-105 active:scale-[0.99] hover:shadow-lg hover:shadow-emerald-500/20 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
                  >
                    <Play className="w-4 h-4 animate-pulse" /> Launch Deployment
                  </button>
                ) : (
                  <div className="flex-[1.5] py-2 px-4 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 text-center flex items-center justify-center italic animate-pulse">
                    ⚡ Awaiting host transmission parameters...
                  </div>
                )}
              </div>

            </div>
          ) : (
            // 3. Create or Join Menu
            <div className="space-y-4">
              {/* Setup Mode Toggles */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 py-2 font-mono text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                    activeTab === 'join'
                      ? 'text-indigo-400 border-indigo-400 bg-gradient-to-t from-indigo-500/5 to-transparent'
                      : 'text-slate-500 border-transparent hover:text-slate-350'
                  }`}
                >
                  📡 Connect Existing Room
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-2 font-mono text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                    activeTab === 'create'
                      ? 'text-indigo-400 border-indigo-400 bg-gradient-to-t from-indigo-500/5 to-transparent'
                      : 'text-slate-500 border-transparent hover:text-slate-350'
                  }`}
                >
                  🧱 Establish New Server
                </button>
              </div>

              {/* Tab Form */}
              {activeTab === 'join' ? (
                <div className="space-y-4 py-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Enter 6-Character Room Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. AB12XY"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center text-amber-300 uppercase focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={submitJoin}
                    disabled={loading || !joinCode.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-650 text-white font-mono font-bold text-xs rounded-xl shadow-lg hover:brightness-105 active:scale-[0.99] cursor-pointer disabled:opacity-50 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    📡 Establish Handshake Connection
                  </button>
                </div>
              ) : (
                <div className="space-y-4 py-1 font-mono">
                  
                  {/* Total Players Selector */}
                  <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-350">
                      <span>MAX_CLIENT_TERMINALS_LIMIT (PLAYERS)</span>
                      <span className="text-indigo-400 text-xs font-black">{maxPlayers} Sockets</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="2"
                        max="10"
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <span className="text-[11px] text-slate-405 font-bold w-12 text-right">{maxPlayers} max</span>
                    </div>
                  </div>

                  {/* Bots Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-850 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-indigo-400" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-200 uppercase block leading-tight">Fill vacant slots with Bots</span>
                        <span className="text-[9px] text-slate-500 block leading-tight">Keeps the game full and snappy</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setFillBots(!fillBots)}
                      className={`w-12 h-6 rounded-full p-0.5 border transition-all cursor-pointer ${
                        fillBots ? 'bg-indigo-500/20 border-indigo-500 flex justify-end' : 'bg-slate-800 border-slate-700 flex justify-start'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full ${fillBots ? 'bg-indigo-400' : 'bg-slate-505'} transition-all`} />
                    </button>
                  </div>

                  <button
                    onClick={submitCreate}
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-650 text-white font-mono font-bold text-xs rounded-xl shadow-lg hover:brightness-105 active:scale-[0.99] cursor-pointer disabled:opacity-50 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    🧱 Deploy New Server Cluster Room
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
