import React, { useState } from 'react';
import { ToggleLeft, HelpCircle, RefreshCw, Sliders, FileSpreadsheet, PlusCircle } from 'lucide-react';

interface GameSettingsProps {
  onStartGame: (botCount: number, botSpeed: number, customUrls?: string) => void;
  currentBotCount: number;
  currentBotSpeed: number;
  currentCustomUrls: string;
}

const DUMMY_SAMPLES = {
  developerSites: `https://github.com/trending
https://stackoverflow.com/questions
https://news.ycombinator.com
https://dev.to/dashboard
https://medium.com/tech
http://localhost:3000/test
http://localhost:8080/metrics
ftp://kernel.org/pub/linux
ftp://debian.mirror/iso
ws://localhost:9000/chatsync`,
  socialMedia: `https://twitter.com/home
https://instagram.com/feed
https://facebook.com/groups
https://reddit.com/r/pics
https://linkedin.com/network
http://old-forum.net/sub
http://guestbook.cz/posts
ftp://ftp.archive.org/audio
ftp://images.server/backups
ws://chat.discord/room/general`,
  mixedNetwork: `https://stripe.com/dashboard
https://vercel.com/deploy
https://aws.amazon.com/console
http://unsecured-retailer.com/cart
http://classic-forum.org/topics
ftp://download.intel/drivers
ftp://mirror.net/ubuntu
ws://crypto-feed.coinbase/live
ws://sports-broker/odds`,
};

export const GameSettingsComponent: React.FC<GameSettingsProps> = ({
  onStartGame,
  currentBotCount,
  currentBotSpeed,
  currentCustomUrls,
}) => {
  const [bots, setBots] = useState(currentBotCount);
  const [speed, setSpeed] = useState(currentBotSpeed);
  const [customUrls, setCustomUrls] = useState(currentCustomUrls);
  const [activeTab, setActiveTab] = useState<'settings' | 'urls'>('settings');

  const handlePresetSelect = (presetKey: keyof typeof DUMMY_SAMPLES) => {
    setCustomUrls(DUMMY_SAMPLES[presetKey]);
  };

  const handleLaunch = () => {
    onStartGame(bots, speed, customUrls);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden text-slate-100">
      {/* Visual background details */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl" />

      {/* Header and Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div>
          <h2 className="text-base font-mono font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" /> GAME_SANDBOX_CONFIG
          </h2>
          <p className="text-[11px] font-mono text-slate-400 mt-1">Configure players, ports, and custom domains</p>
        </div>
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('settings')}
            className={`text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveTab('urls')}
            className={`text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
              activeTab === 'urls'
                ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom URLs
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-4">
          {/* Bots Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300">OPPONENT BOTS (SERVERS)</label>
              <span className="text-xs font-mono font-bold text-indigo-400">{bots} Bots</span>
            </div>
            <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <input
                type="range"
                min="1"
                max="3"
                value={bots}
                onChange={(e) => setBots(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between w-24 text-[10px] font-mono text-slate-500">
                <span className={bots === 1 ? 'text-indigo-400 font-bold' : ''}>1 Bot</span>
                <span className={bots === 2 ? 'text-indigo-400 font-bold' : ''}>2 Bots</span>
                <span className={bots === 3 ? 'text-indigo-400 font-bold' : ''}>3 Bots</span>
              </div>
            </div>
          </div>

          {/* Speed settings */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300">BOT SIMULATOR SPEEDS</label>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {speed === 1000 ? 'Instant Server (1s)' : speed === 1800 ? 'Normal Tick (1.8s)' : 'Slower Dialup (2.8s)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'FAST (1s)', value: 1000 },
                { label: 'MID (1.8s)', value: 1800 },
                { label: 'SLOW (2.8s)', value: 2800 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSpeed(opt.value)}
                  className={`py-2 px-2 rounded-lg font-mono text-[11px] border transition-all cursor-pointer ${
                    speed === opt.value
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Rules Check */}
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] leading-relaxed font-mono text-slate-400">
            <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> INSTANT_UNO_HANDBOOK:
            </div>
            Match based on <span className="text-slate-100 font-semibold">Protocol</span> (Color match),{' '}
            <span className="text-slate-100 font-semibold">HTTP Codes/Actions</span> (Value match), or{' '}
            <span className="text-emerald-400 font-semibold">Matching Domains</span> (e.g. duplicate github.com urls can stack!).
            First to reach 0 packets wins!
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-mono font-semibold text-slate-300">PASTE CUSTOM URLS (One per line)</label>
              <span className="text-[10px] font-mono text-slate-500">Decks auto-generate from these</span>
            </div>
            <textarea
              value={customUrls}
              onChange={(e) => setCustomUrls(e.target.value)}
              placeholder="e.g. https://myprofile.me&#10;https://google.com/search&#10;http://unsecure-portal.com"
              className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Presets Grid */}
          <div>
            <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Select Preset URLs
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePresetSelect('developerSites')}
                className="py-1.5 px-1 text-center font-mono text-[10px] rounded border border-slate-800 bg-slate-950/30 hover:bg-slate-900/50 hover:border-slate-700 text-slate-300 cursor-pointer"
              >
                💾 Tech Stack
              </button>
              <button
                onClick={() => handlePresetSelect('socialMedia')}
                className="py-1.5 px-1 text-center font-mono text-[10px] rounded border border-slate-800 bg-slate-950/30 hover:bg-slate-900/50 hover:border-slate-700 text-slate-300 cursor-pointer"
              >
                👥 Social/Feed
              </button>
              <button
                onClick={() => handlePresetSelect('mixedNetwork')}
                className="py-1.5 px-1 text-center font-mono text-[10px] rounded border border-slate-800 bg-slate-950/30 hover:bg-slate-900/50 hover:border-slate-700 text-slate-300 cursor-pointer"
              >
                🌐 Mix Network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Button */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
        <button
          onClick={handleLaunch}
          className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
        >
          <RefreshCw className="w-4 h-4 animate-spin-slow" /> REBOOT_AND_DEPLOY_PING_GAME
        </button>
      </div>
    </div>
  );
};
