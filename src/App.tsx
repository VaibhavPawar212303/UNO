"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  FolderSync,
  Zap,
  Globe,
  Plus,
  RefreshCw,
  Info,
  Sliders,
  Play,
  Volume2,
  VolumeX,
  Radio,
  HelpCircle,
  Award,
  AlertTriangle,
  History,
  ShieldCheck,
  ZapOff,
  Clock,
  MessageSquare,
  Volume1,
  MessageSquareText
} from 'lucide-react';

import { Player, UnoCard, Protocol, GameLog } from './types';
import { generateDefaultDeck, shuffleDeck, canPlayCard, parseUserUrls } from './deckGenerator';
import { UnoCardComponent } from './components/UnoCardComponent';
import { GameSettingsComponent } from './components/GameSettingsComponent';
import { GameLogsComponent } from './components/GameLogsComponent';
import { ColorChooserDialog } from './components/ColorChooserDialog';

// Firebase Integrations
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, setDoc, updateDoc, getDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { PrivateRoomDialog } from './components/PrivateRoomDialog';
import { Network } from 'lucide-react';

// Group and sort player cards by protocol (color) for better spatial organization
const sortUserCards = (cards: UnoCard[]) => {
  if (!cards) return [];
  const protocolOrder: Record<Protocol, number> = { https: 0, http: 1, ftp: 2, ws: 3, wild: 4 };
  const typeOrder: Record<string, number> = { number: 0, skip: 1, reverse: 2, draw2: 3, wild: 4, wild4: 5 };
  
  return [...cards].sort((a, b) => {
    const protoA = protocolOrder[a.protocol] ?? 99;
    const protoB = protocolOrder[b.protocol] ?? 99;
    if (protoA !== protoB) {
      return protoA - protoB;
    }
    
    // Within same protocol, sort by type
    const typeA = typeOrder[a.type] ?? 99;
    const typeB = typeOrder[b.type] ?? 99;
    if (typeA !== typeB) {
      return typeA - typeB;
    }
    
    // Within same type, sort by value
    return String(a.value).localeCompare(String(b.value), undefined, { numeric: true });
  });
};

// Sound synthesis helper using standard browser procedural Audio Web API
const synthSound = (type: 'play' | 'draw' | 'uno' | 'warn' | 'success' | 'alert') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'play') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'draw') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'uno') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'warn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08); // C#5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16); // E5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'alert') {
      // Diagnostic rapid beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Silently proceed if AudioContext is blocked
  }
};

const BOT_IDENTITIES = [
  { name: 'Rushikesh', avatar: '👦', description: 'Left server gateway - high-speed routing node.' },
  { name: 'jaydeep joshi', avatar: '🟢', description: 'Top packet proxy - stable protocol responder.' },
  { name: 'guest055985', avatar: '🖥️', description: 'Right socket server - secure transaction pool.' },
  { name: 'LoadBalancer', avatar: '🎛️', description: 'Traffic orchestrator - load distributing node.' },
  { name: 'NginxEdge', avatar: '⚙️', description: 'Edge proxy - raw static throughput.' },
  { name: 'RedisNode', avatar: '🟥', description: 'In-memory socket state - rapid key value.' },
  { name: 'CloudRun', avatar: '☁️', description: 'Serverless container - ephemeral compute.' },
  { name: 'SpannerDB', avatar: '🧱', description: 'Spanning database - horizontal shard leader.' },
  { name: 'WebRTCPeer', avatar: '📡', description: 'Real-time media tunnel - P2P stream.' },
];

export default function App() {
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [turnCounter, setTurnCounter] = useState<number>(0);
  const [gameDirection, setGameDirection] = useState<'clockwise' | 'counter-clockwise'>('clockwise');
  const [activeProtocol, setActiveProtocol] = useState<Protocol>('https');
  const [gameStatus, setGameStatus] = useState<'setup' | 'playing' | 'game-over'>('setup');
  const [winner, setWinner] = useState<string | null>(null);
  
  // Custom configurations
  const [botCount, setBotCount] = useState<number>(3);
  const [botSpeedMs, setBotSpeedMs] = useState<number>(1800);
  const [customUrlsInput, setCustomUrlsInput] = useState<string>('');
  
  // Game states
  const [unoDeclared, setUnoDeclared] = useState<{ [playerId: string]: boolean }>({});
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isColorChooserOpen, setIsColorChooserOpen] = useState<boolean>(false);
  const [pendingWildCard, setPendingWildCard] = useState<{ card: UnoCard; index: number } | null>(null);
  
  // Handle Drawn Card State (if the drawn card can be played immediately)
  const [drawnPlayableCard, setDrawnPlayableCard] = useState<UnoCard | null>(null);

  // Bot Thinking visual transition states
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  // New Immersion visual states
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
  const [gameStartedAt, setGameStartedAt] = useState<string | null>(null);
  const [activeSpeech, setActiveSpeech] = useState<{ [playerId: string]: string }>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(1024);

  // Online Private Room & Lobby States
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [myIndex, setMyIndex] = useState<number>(-1);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('💻');
  const [isNamePromptOpen, setIsNamePromptOpen] = useState<boolean>(false);
  const [tempAvatar, setTempAvatar] = useState<string>('💻');

  const handleSetUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('url_uno_player_name', name);
  };

  const handleSetUserAvatar = (avatar: string) => {
    setUserAvatar(avatar);
    localStorage.setItem('url_uno_player_avatar', avatar);
  };

  const handleNamePromptSubmit = async (enteredName: string, enteredAvatar: string) => {
    localStorage.setItem('url_uno_player_name', enteredName);
    localStorage.setItem('url_uno_player_avatar', enteredAvatar);
    setUserName(enteredName);
    setUserAvatar(enteredAvatar);
    setIsNamePromptOpen(false);
    
    // Refresh offline player list instantly with the new name and avatar
    updatePlayers((prev) => 
      prev.map((p) => p.id === 'human' ? { ...p, name: enteredName, avatar: enteredAvatar } : p)
    );

    // If there was a pending room to join, auto join it now!
    const pendingRoomId = (window as any).pendingRoomIdToJoin;
    if (pendingRoomId) {
      delete (window as any).pendingRoomIdToJoin;
      try {
        const roomRef = doc(db, 'rooms', pendingRoomId);
        const docSnapshot = await getDoc(roomRef);
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const activePlayers = data.players || [];
          const existingIdx = activePlayers.findIndex((p: any) => p.id === myPlayerId);
          if (existingIdx !== -1) {
            setRoomId(pendingRoomId);
            setIsMultiplayer(true);
            setMyIndex(existingIdx);
            myIndexRef.current = existingIdx;
            localStorage.setItem('url_uno_active_room_id', pendingRoomId);
            const nextUrl = window.location.pathname + `?room=${pendingRoomId}`;
            window.history.replaceState(null, '', nextUrl);
            addLog('success', `[SYSTEM] Reconnected to active Room ${pendingRoomId} successfully.`);
          } else if (data.status === 'setup' && activePlayers.length < 10) {
            const guestPlayer: Player = {
              id: myPlayerId,
              name: enteredName,
              isBot: false,
              cards: [],
              avatar: enteredAvatar,
              statusMsg: 'Connected Guest...',
              analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
            };
            const nextPlayers = [...activePlayers, guestPlayer];
            const assignedIndex = nextPlayers.length - 1;

            const updatedLogs = [
              ...(data.logs || []),
              {
                id: `log-${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'info',
                message: `[JOIN] Player ${enteredName} auto-reconnected on seat ${assignedIndex}.`
              }
            ];

            await updateDoc(roomRef, {
              players: nextPlayers,
              logs: updatedLogs,
              updatedAt: new Date().toISOString()
            });

            setRoomId(pendingRoomId);
            setIsMultiplayer(true);
            setMyIndex(assignedIndex);
            myIndexRef.current = assignedIndex;
            localStorage.setItem('url_uno_active_room_id', pendingRoomId);
            const nextUrl = window.location.pathname + `?room=${pendingRoomId}`;
            window.history.replaceState(null, '', nextUrl);
          }
        }
      } catch (err) {
        console.error("Delayed joining failed", err);
      }
    }
  };

  // Synchronize resize listeners, load persistent state, and probe Firebase connection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      window.addEventListener('resize', handleResize);
      
      // Load user details
      let currentId = localStorage.getItem('url_uno_player_id');
      if (!currentId) {
        currentId = 'player-' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('url_uno_player_id', currentId);
      }
      setMyPlayerId(currentId);

      const savedName = localStorage.getItem('url_uno_player_name');
      const savedAvatar = localStorage.getItem('url_uno_player_avatar') || '💻';
      
      if (savedName) {
        setUserName(savedName);
        setUserAvatar(savedAvatar);
      } else {
        setIsNamePromptOpen(true);
      }

      // Restore Room on Reload & sync from URL query
      const restoreRoomSync = async (playerId: string, name: string, avatar: string) => {
        try {
          const params = new URLSearchParams(window.location.search);
          const roomParam = params.get('room');
          const savedRoomId = localStorage.getItem('url_uno_active_room_id');
          const targetRoomId = (roomParam || savedRoomId || '').trim().toUpperCase();

          if (!targetRoomId) return;

          const roomRef = doc(db, 'rooms', targetRoomId);
          const docSnapshot = await getDoc(roomRef);
          if (!docSnapshot.exists()) {
            localStorage.removeItem('url_uno_active_room_id');
            const cleanUrl = window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
            return;
          }

          const data = docSnapshot.data();
          const activePlayers = data.players || [];
          const existingIdx = activePlayers.findIndex((p: any) => p.id === playerId);

          if (existingIdx !== -1) {
            setRoomId(targetRoomId);
            setIsMultiplayer(true);
            setMyIndex(existingIdx);
            myIndexRef.current = existingIdx;
            
            localStorage.setItem('url_uno_active_room_id', targetRoomId);
            const nextUrl = window.location.pathname + `?room=${targetRoomId}`;
            window.history.replaceState(null, '', nextUrl);
            
            addLog('success', `[SYSTEM] Reconnected to active Room ${targetRoomId} successfully.`);
          } else {
            if (data.status === 'setup' && activePlayers.length < 10) {
              const guestPlayer: Player = {
                id: playerId,
                name: name,
                isBot: false,
                cards: [],
                avatar: avatar,
                statusMsg: 'Connected Guest...',
                analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
              };
              const nextPlayers = [...activePlayers, guestPlayer];
              const assignedIndex = nextPlayers.length - 1;

              const updatedLogs = [
                ...(data.logs || []),
                {
                  id: `log-${Math.random().toString(36).substring(2, 9)}`,
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'info',
                  message: `[JOIN] Player ${name} auto-reconnected on seat ${assignedIndex}.`
                }
              ];

              await updateDoc(roomRef, {
                players: nextPlayers,
                logs: updatedLogs,
                updatedAt: new Date().toISOString()
              });

              setRoomId(targetRoomId);
              setIsMultiplayer(true);
              setMyIndex(assignedIndex);
              myIndexRef.current = assignedIndex;
              localStorage.setItem('url_uno_active_room_id', targetRoomId);
              
              const nextUrl = window.location.pathname + `?room=${targetRoomId}`;
              window.history.replaceState(null, '', nextUrl);
            }
          }
        } catch (err) {
          console.error("Auto-reconnection failed", err);
        }
      };

      if (savedName) {
        restoreRoomSync(currentId, savedName, savedAvatar);
      } else {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const savedRoomId = localStorage.getItem('url_uno_active_room_id');
        const targetRoomId = (roomParam || savedRoomId || '').trim().toUpperCase();
        if (targetRoomId) {
          (window as any).pendingRoomIdToJoin = targetRoomId;
        }
      }

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // Firebase connection test probe (Mandated by security audit rules)
  useEffect(() => {
    const probeConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test-connection-probe', 'ping'));
      } catch (err) {
        // Safe sandbox network mode
      }
    };
    probeConnection();
  }, []);

  // References for terminal and autoscrolls
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync references to always have the latest game state in async callbacks and timeouts
  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;

  const discardPileRef = useRef<UnoCard[]>(discardPile);
  discardPileRef.current = discardPile;

  const deckRef = useRef<UnoCard[]>(deck);
  deckRef.current = deck;

  const activeProtocolRef = useRef<Protocol>(activeProtocol);
  activeProtocolRef.current = activeProtocol;

  const gameDirectionRef = useRef<'clockwise' | 'counter-clockwise'>(gameDirection);
  gameDirectionRef.current = gameDirection;

  const currentPlayerIndexRef = useRef<number>(currentPlayerIndex);
  currentPlayerIndexRef.current = currentPlayerIndex;

  const isMultiplayerRef = useRef<boolean>(isMultiplayer);
  isMultiplayerRef.current = isMultiplayer;

  const roomIdRef = useRef<string>(roomId);
  roomIdRef.current = roomId;

  const myIndexRef = useRef<number>(myIndex);
  myIndexRef.current = myIndex;

  // Pushes incremental changes to Firestore and triggers live onSnapshot updates
  const writeRoomSync = async (updates: Partial<any>) => {
    if (!isMultiplayerRef.current || !roomIdRef.current) return;
    try {
      const roomRef = doc(db, 'rooms', roomIdRef.current);
      await updateDoc(roomRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomIdRef.current}`);
    }
  };

  // Real-time synchronization subscription for Multiplayer Private Lobby/Game
  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      
      // Keep synchronous references up-to-date instantly to avoid lag or async racing:
      if (data.players) {
        setPlayers(data.players);
        playersRef.current = data.players;
        
        // Settle local index dynamically in case player list shifts
        const lookup = data.players.findIndex((p: any) => p.id === myPlayerId);
        if (lookup !== -1) {
          setMyIndex(lookup);
          myIndexRef.current = lookup;
        }
      }
      if (data.currentPlayerIndex !== undefined) {
        setCurrentPlayerIndex(data.currentPlayerIndex);
        currentPlayerIndexRef.current = data.currentPlayerIndex;
      }
      if (data.discardPile) {
        setDiscardPile(data.discardPile);
        discardPileRef.current = data.discardPile;
      }
      if (data.deck) {
        setDeck(data.deck);
        deckRef.current = data.deck;
      }
      if (data.gameDirection) {
        setGameDirection(data.gameDirection);
        gameDirectionRef.current = data.gameDirection;
      }
      if (data.activeProtocol) {
        setActiveProtocol(data.activeProtocol);
        activeProtocolRef.current = data.activeProtocol;
      }
      if (data.status) {
        setGameStatus(data.status);
      }
      if (data.winnerId !== undefined) {
        setWinner(data.winnerId);
      }
      if (data.unoDeclared) {
        setUnoDeclared(data.unoDeclared);
      }
      if (data.logs) {
        setLogs(data.logs);
      }
      if (data.botSpeedMs !== undefined) {
        setBotSpeedMs(data.botSpeedMs);
      }
      if (data.customUrlsInput !== undefined) {
        setCustomUrlsInput(data.customUrlsInput);
      }
      if (data.speechBubbles) {
        setActiveSpeech(data.speechBubbles);
      }
      if (data.timeLimitMinutes !== undefined) {
        setTimeLimitMinutes(data.timeLimitMinutes);
      }
      if (data.gameStartedAt !== undefined) {
        setGameStartedAt(data.gameStartedAt);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    });

    return () => unsubscribe();
  }, [isMultiplayer, roomId, myPlayerId]);

  const handleCreateRoom = async (totalPlayersCount: number, fillWithBots: boolean, speed: number, timeLimitMin: number) => {
    const generatedRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const hostPlayer: Player = {
      id: myPlayerId,
      name: userName,
      isBot: false,
      cards: [],
      avatar: userAvatar,
      statusMsg: 'Connected as Host...',
      analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
    };

    const initialRoomData = {
      id: generatedRoomId,
      hostId: myPlayerId,
      hostName: userName,
      status: 'setup',
      players: [hostPlayer],
      currentPlayerIndex: 0,
      discardPile: [],
      deck: [],
      gameDirection: 'clockwise',
      activeProtocol: 'https',
      winnerId: null,
      unoDeclared: {},
      timeLimitMinutes: timeLimitMin,
      gameStartedAt: null,
      logs: [{
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'system',
        message: `[ROOM] Private Room ${generatedRoomId} instantiated by Host: ${userName}. Timeout limit: ${timeLimitMin === 0 ? 'Unlimited' : `${timeLimitMin} min`}.`
      }],
      botSpeedMs: speed,
      botCount: totalPlayersCount,
      fillWithBots: fillWithBots,
      customUrlsInput: customUrlsInput || '',
      updatedAt: new Date().toISOString()
    };

    try {
      const roomRef = doc(db, 'rooms', generatedRoomId);
      await setDoc(roomRef, initialRoomData);

      setRoomId(generatedRoomId);
      setIsMultiplayer(true);
      setMyIndex(0);
      myIndexRef.current = 0;
      localStorage.setItem('url_uno_active_room_id', generatedRoomId);
      if (typeof window !== 'undefined') {
        const nextUrl = window.location.pathname + `?room=${generatedRoomId}`;
        window.history.replaceState(null, '', nextUrl);
      }
      addLog('success', `[SYSTEM] Private Room ${generatedRoomId} instantiated!`);
      playSound('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${generatedRoomId}`);
    }
  };

  const handleJoinRoom = async (targetRoomId: string) => {
    const cleanedRoomId = targetRoomId.trim().toUpperCase();
    if (!cleanedRoomId) return;

    try {
      const roomRef = doc(db, 'rooms', cleanedRoomId);
      const docSnapshot = await getDoc(roomRef);
      if (!docSnapshot.exists()) {
        alert('Room not found! Verify code exists on centralized Firestore database.');
        return;
      }

      const data = docSnapshot.data();
      if (data.status !== 'setup') {
        alert('Active play-session started! Room can no longer accept socket connection.');
        return;
      }

      const activePlayers = data.players || [];
      if (activePlayers.length >= 10) {
        alert('Target server cluster full! Connection limits capped at 10 users.');
        return;
      }

      const existingIdx = activePlayers.findIndex((p: any) => p.id === myPlayerId);
      let nextPlayers = [...activePlayers];
      let assignedIndex = existingIdx;

      if (existingIdx === -1) {
        const guestPlayer: Player = {
          id: myPlayerId,
          name: userName,
          isBot: false,
          cards: [],
          avatar: userAvatar,
          statusMsg: 'Connected Guest...',
          analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
        };
        nextPlayers.push(guestPlayer);
        assignedIndex = nextPlayers.length - 1;
      }

      const initialLogs = data.logs || [];
      const updatedLogs = [
        ...initialLogs,
        {
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: `[JOIN] Player ${userName} connected as client socket on seat ${assignedIndex}.`
        }
      ];

      await updateDoc(roomRef, {
        players: nextPlayers,
        logs: updatedLogs,
        updatedAt: new Date().toISOString()
      });

      setRoomId(cleanedRoomId);
      setIsMultiplayer(true);
      setMyIndex(assignedIndex);
      myIndexRef.current = assignedIndex;
      localStorage.setItem('url_uno_active_room_id', cleanedRoomId);
      if (typeof window !== 'undefined') {
        const nextUrl = window.location.pathname + `?room=${cleanedRoomId}`;
        window.history.replaceState(null, '', nextUrl);
      }
      playSound('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${cleanedRoomId}`);
    }
  };

  const handleLaunchRoomGame = async () => {
    if (!isMultiplayer || !roomId) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const docSnapshot = await getDoc(roomRef);
      if (!docSnapshot.exists()) return;
      const data = docSnapshot.data();

      let activePlayers = [...(data.players || [])];
      const fillWithBots = data.fillWithBots;
      const targetCount = data.botCount || 4;

      // Fill with bots up to target count
      if (fillWithBots && activePlayers.length < targetCount) {
        const remainingSlots = targetCount - activePlayers.length;
        for (let i = 0; i < remainingSlots; i++) {
          const identity = BOT_IDENTITIES[i % BOT_IDENTITIES.length];
          activePlayers.push({
            id: `bot-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: `CPU_${identity.name}`,
            isBot: true,
            cards: [],
            avatar: identity.avatar,
            statusMsg: 'Initializing server protocols...',
            analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
          });
        }
      }

      // Base protocol compilation
      let loadedDeck: UnoCard[] = [];
      const urlsText = data.customUrlsInput;
      if (urlsText && urlsText.trim().length > 0) {
        const parsed = parseUserUrls(urlsText);
        if (parsed.length >= 20) {
          loadedDeck = shuffleDeck(parsed);
          while (loadedDeck.length < 50) {
            const duplicated = shuffleDeck(parsed).map((c) => ({
              ...c,
              id: `card-${Math.random().toString(36).substring(2, 11)}`,
            }));
            loadedDeck = [...loadedDeck, ...duplicated];
          }
        } else {
          const defaults = generateDefaultDeck();
          const customParsed = parseUserUrls(urlsText);
          loadedDeck = shuffleDeck([...customParsed, ...defaults]);
        }
      } else {
        loadedDeck = shuffleDeck(generateDefaultDeck());
      }

      // Deal cards
      const currentDeck = [...loadedDeck];
      activePlayers.forEach((player) => {
        player.cards = currentDeck.splice(0, 7);
      });

      let startCardIndex = 0;
      while (startCardIndex < currentDeck.length && currentDeck[startCardIndex].protocol === 'wild') {
        startCardIndex++;
      }
      if (startCardIndex >= currentDeck.length) startCardIndex = 0;
      const startCard = currentDeck.splice(startCardIndex, 1)[0];

      const initialLogs = data.logs || [];
      const playLogs = [
        ...initialLogs,
        {
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'system',
          message: `[LAUNCH] Host transmitted startup signal. Deployed ${activePlayers.length} connection terminals.`
        },
        {
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: `[PORT 8080] First starting packet: ${startCard.url}. Active suit: ${startCard.protocol.toUpperCase()}`
        }
      ];

      await updateDoc(roomRef, {
        status: 'playing',
        players: activePlayers,
        deck: currentDeck,
        discardPile: [startCard],
        currentPlayerIndex: 0,
        gameDirection: 'clockwise',
        activeProtocol: startCard.protocol,
        winnerId: null,
        unoDeclared: {},
        gameStartedAt: new Date().toISOString(),
        logs: playLogs,
        updatedAt: new Date().toISOString()
      });

      setIsRoomDialogOpen(false);
      playSound('success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const handleLeaveRoom = () => {
    setIsMultiplayer(false);
    setRoomId('');
    setMyIndex(-1);
    myIndexRef.current = -1;
    setPlayers([]);
    setDeck([]);
    setDiscardPile([]);
    setIsRoomDialogOpen(false);
    localStorage.removeItem('url_uno_active_room_id');
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
    addLog('warn', `[SYSTEM] Disconnected raw socket links. Resumed sandboxed offline CPU terminal.`);
    startNewGame(botCount, botSpeedMs, customUrlsInput);
  };

  // Wrapper utilities to keep both state and synchronous refs perfectly in sync:
  const updateDeck = (newDeck: UnoCard[]) => {
    deckRef.current = newDeck;
    setDeck(newDeck);
  };

  const updateDiscardPile = (newDiscard: UnoCard[]) => {
    discardPileRef.current = newDiscard;
    setDiscardPile(newDiscard);
  };

  const updatePlayers = (updater: Player[] | ((prev: Player[]) => Player[])) => {
    if (typeof updater === 'function') {
      setPlayers((prev) => {
        const next = updater(prev);
        playersRef.current = next;
        return next;
      });
    } else {
      playersRef.current = updater;
      setPlayers(updater);
    }
  };

  const updateCurrentPlayerIndex = (newIndex: number) => {
    currentPlayerIndexRef.current = newIndex;
    setCurrentPlayerIndex(newIndex);
    setTurnCounter((prev) => prev + 1);
  };

  const updateActiveProtocol = (newProto: Protocol) => {
    activeProtocolRef.current = newProto;
    setActiveProtocol(newProto);
  };

  const updateGameDirection = (newDir: 'clockwise' | 'counter-clockwise') => {
    gameDirectionRef.current = newDir;
    setGameDirection(newDir);
  };

  // Sound triggering decorator
  const playSound = (type: 'play' | 'draw' | 'uno' | 'warn' | 'success' | 'alert') => {
    if (soundEnabled) {
      synthSound(type);
    }
  };

  // Log appending helper
  const addLog = (type: GameLog['type'], message: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: timeStr,
        type,
        message,
      },
    ]);
  };

  // Start a fresh deployment
  const startNewGame = (botsToLoad: number, speed: number, urlsText?: string) => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
    }

    let loadedDeck: UnoCard[] = [];
    let logsStarted: string[] = [];

    // Protocol builder selection
    if (urlsText && urlsText.trim().length > 0) {
      const parsed = parseUserUrls(urlsText);
      if (parsed.length >= 20) {
        // Shuffle and inflate deck if user didn't enter too many, to have enough cards
        loadedDeck = shuffleDeck(parsed);
        // If deck is still too small, duplicate to make playable
        while (loadedDeck.length < 50) {
          const duplicated = shuffleDeck(parsed).map((c) => ({
            ...c,
            id: `card-${Math.random().toString(36).substring(2, 11)}`,
          }));
          loadedDeck = [...loadedDeck, ...duplicated];
        }
        logsStarted.push(`[INFO] Custom URL Sandbox deployed. Compiled ${parsed.length} base endpoints into ${loadedDeck.length} packets.`);
      } else {
        // Fallback or mix if custom URLs are too sparse
        const defaults = generateDefaultDeck();
        const customParsed = parseUserUrls(urlsText);
        loadedDeck = shuffleDeck([...customParsed, ...defaults]);
        logsStarted.push(`[WARN] Custom URLs count (${customParsed.length}) below margin threshold (20). Injected legacy protocol modules to fill deck.`);
      }
    } else {
      loadedDeck = shuffleDeck(generateDefaultDeck());
      logsStarted.push(`[INFO] Server cluster configured. Deployed default 108 URL packets spanning HTTPS, HTTP, FTP, and WS protocols.`);
    }

    // Initialize players
    const humanPlayer: Player = {
      id: 'human',
      name: localStorage.getItem('url_uno_player_name') || userName || 'Guest Client',
      isBot: false,
      cards: [],
      avatar: localStorage.getItem('url_uno_player_avatar') || userAvatar || '💻',
      statusMsg: 'Awaiting connection...',
      analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
    };

    const tempPlayers: Player[] = [humanPlayer];
    for (let i = 0; i < botsToLoad; i++) {
      const identity = BOT_IDENTITIES[i % BOT_IDENTITIES.length];
      tempPlayers.push({
        id: `bot-${i}`,
        name: identity.name,
        isBot: true,
        cards: [],
        avatar: identity.avatar,
        statusMsg: 'Syncing server protocols...',
        analytics: { cardsPlayed: 0, cardsDrawn: 0, skipsReceived: 0 },
      });
    }

    // Deal 7 initial cards to all players
    const currentDeck = [...loadedDeck];
    tempPlayers.forEach((player) => {
      player.cards = currentDeck.splice(0, 7);
    });

    // Pick first starting card that is not a wild card
    let startCardIndex = 0;
    while (startCardIndex < currentDeck.length && currentDeck[startCardIndex].protocol === 'wild') {
      startCardIndex++;
    }

    // In case drawing fails
    if (startCardIndex >= currentDeck.length) {
      startCardIndex = 0;
    }

    const startCard = currentDeck.splice(startCardIndex, 1)[0];
    
    updateDeck(currentDeck);
    updateDiscardPile([startCard]);
    updatePlayers(tempPlayers);
    updateCurrentPlayerIndex(0);
    updateGameDirection('clockwise');
    updateActiveProtocol(startCard.protocol);
    setGameStatus('playing');
    setWinner(null);
    setUnoDeclared({});
    setDrawnPlayableCard(null);
    setPendingWildCard(null);
    setIsColorChooserOpen(false);
    setIsBotThinking(false);
    setSecondsElapsed(0);
    setTimeLimitMinutes(0);
    setGameStartedAt(null);
    setActiveSpeech({});

    // Initial Logs
    setLogs([]);
    logsStarted.forEach((msg) => addLog('system', msg));
    addLog('info', `[PORT 8080] First starting packet: ${startCard.url}. Active routing suit: ${startCard.protocol.toUpperCase()}`);
    playSound('success');
  };

  const handleTimeoutGameOver = async () => {
    const currentPlayers = playersRef.current;
    if (!currentPlayers || currentPlayers.length === 0) return;

    // Find the player with fewest cards remaining
    let bestPlayer = currentPlayers[0];
    let minCards = currentPlayers[0].cards ? currentPlayers[0].cards.length : 99;
    
    currentPlayers.forEach((p) => {
      const count = p.cards ? p.cards.length : 99;
      if (count < minCards) {
        minCards = count;
        bestPlayer = p;
      }
    });

    const msg = `[DEPLOYED] 🏆 Time Limit Exceeded! ${bestPlayer.name} has been declared winner with fewest remaining packets (${minCards} PKTS)!`;
    addLog('success', msg);
    setWinner(bestPlayer.id);
    setGameStatus('game-over');
    playSound('success');

    if (isMultiplayerRef.current && roomIdRef.current) {
      const nextLogItem = {
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'success' as const,
        message: msg
      };
      
      writeRoomSync({
        winnerId: bestPlayer.id,
        status: 'game-over',
        logs: [...logs, nextLogItem]
      });
    }
  };

  // Timer Tick Trigger
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const interval = setInterval(() => {
      let nextSeconds = secondsElapsed + 1;
      
      if (isMultiplayer && gameStartedAt) {
        const elapsed = Math.floor((Date.now() - new Date(gameStartedAt).getTime()) / 1000);
        nextSeconds = elapsed >= 0 ? elapsed : 0;
        setSecondsElapsed(nextSeconds);
      } else {
        setSecondsElapsed((prev) => {
          nextSeconds = prev + 1;
          return nextSeconds;
        });
      }

      // Check timeout
      if (timeLimitMinutes > 0) {
        const secondsLimit = timeLimitMinutes * 60;
        if (nextSeconds >= secondsLimit) {
          clearInterval(interval);
          
          // Check if we are host or off-line
          const isHost = !isMultiplayer || (playersRef.current.length > 0 && playersRef.current[0].id === myPlayerId);
          if (isHost) {
            handleTimeoutGameOver();
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus, isMultiplayer, gameStartedAt, timeLimitMinutes, myPlayerId]);

  // Speech helper
  const triggerSpeech = (playerId: string, msg: string) => {
    setActiveSpeech((prev) => ({ ...prev, [playerId]: msg }));
    playSound('play');

    if (isMultiplayerRef.current) {
      writeRoomSync({
        speechBubbles: { [playerId]: msg }
      });
      setTimeout(() => {
        writeRoomSync({
          speechBubbles: {}
        });
      }, 3000);
    } else {
      setTimeout(() => {
        setActiveSpeech((prev) => {
          const copy = { ...prev };
          delete copy[playerId];
          return copy;
        });
      }, 3000);
    }
  };

  // Boot on initial impact
  useEffect(() => {
    if (!isMultiplayerRef.current) {
      startNewGame(botCount, botSpeedMs, customUrlsInput);
    }
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  // Compute next turn index
  const getNextTurnIndex = (direction: 'clockwise' | 'counter-clockwise', currentIndex: number, totalPlayers: number) => {
    const step = direction === 'clockwise' ? 1 : -1;
    return (currentIndex + step + totalPlayers) % totalPlayers;
  };

  // Deck drawing handler
  const drawCardForPlayer = (playerIndex: number, count: number = 1): UnoCard[] => {
    let currentDeck = [...deckRef.current];
    let discarded = [...discardPileRef.current];
    
    // If deck is depleted, recycle discard pile (keeping the top card)
    if (currentDeck.length < count) {
      if (discarded.length > 0) {
        const topDiscardCard = discarded.pop()!;
        const recycledCards = shuffleDeck([...discarded]);
        currentDeck = [...currentDeck, ...recycledCards];
        discarded = [topDiscardCard];
        addLog('warn', `[SYSTEM] Deck buffer empty! Recycled ${recycledCards.length} played packets from gateway cache.`);
      } else {
        // Fallback if discard pile is empty too
        const fallbackCards = shuffleDeck(generateDefaultDeck());
        currentDeck = [...currentDeck, ...fallbackCards];
        addLog('warn', `[SYSTEM] Deck buffer empty and no cache available! Provisioned fallback routing packets.`);
      }
    }

    const drawn = currentDeck.splice(0, count);
    
    updateDeck(currentDeck);
    updateDiscardPile(discarded);

    // Give cards to target player
    const updatedPlayers = playersRef.current.map((p, idx) => {
      if (idx === playerIndex) {
        const updatedCards = [...p.cards, ...drawn];
        return {
          ...p,
          cards: updatedCards,
          analytics: {
            ...p.analytics,
            cardsDrawn: p.analytics.cardsDrawn + count,
          },
        };
      }
      return p;
    });

    updatePlayers(updatedPlayers);

    // Multiplayer Cloud Sync
    if (isMultiplayerRef.current) {
      writeRoomSync({
        deck: currentDeck,
        discardPile: discarded,
        players: updatedPlayers
      });
    }

    // If active card drawn is 1, return it for immediate feedback evaluation
    return drawn;
  };

  // Interactive user call UNO
  const handleDeclareUno = () => {
    const localPlayerIdx = isMultiplayerRef.current ? myIndexRef.current : 0;
    const userCards = players[localPlayerIdx]?.cards || [];
    const activeUser = players[localPlayerIdx];
    if (!activeUser) return;

    if (userCards.length <= 2) {
      const updatedUno = { ...unoDeclared, [activeUser.id]: true };
      setUnoDeclared(updatedUno);
      const detailMsg = `[INFO] ${activeUser.name} declared UNO! Host socket ping verified.`;
      addLog('success', detailMsg);
      playSound('uno');

      if (isMultiplayerRef.current) {
        writeRoomSync({
          unoDeclared: updatedUno,
          logs: [...logs, { id: `log-${Math.random().toString(36).substring(2, 9)}`, timestamp: new Date().toLocaleTimeString(), type: 'success', message: detailMsg }]
        });
      }
    } else {
      addLog('danger', `[FAIL] Penalty! Triggering mock headers too early. Hand still hosts ${userCards.length} packets.`);
      playSound('warn');
    }
  };

  // Interactive firewall audit to catch lies (CATCH!)
  const handleCatchUnoLiar = () => {
    let caughtLiar = false;
    let nextUnoDeclared = { ...unoDeclared };

    players.forEach((player, idx) => {
      // Human/User caught an opponent/bot with 1 card who neglected to declare UNO
      if (player.cards.length === 1 && !unoDeclared[player.id]) {
        caughtLiar = true;
        const alertMsg = `[FIREWALL ALERT] Player caught Server ${player.name} leaking open sockets! Injecting 2 packet drops.`;
        addLog('danger', alertMsg);
        
        // Penalize the liar
        drawCardForPlayer(idx, 2);
        
        // Reset declaration status
        nextUnoDeclared[player.id] = true;
        setUnoDeclared(nextUnoDeclared);
        playSound('alert');

        if (isMultiplayerRef.current) {
          writeRoomSync({
            unoDeclared: nextUnoDeclared,
            logs: [...logs, { id: `log-${Math.random().toString(36).substring(2, 9)}`, timestamp: new Date().toLocaleTimeString(), type: 'danger', message: alertMsg }]
          });
        }
      }
    });

    if (!caughtLiar) {
      addLog('warn', `[SYSTEM REPORT] Firewall scan successful: All servers authenticated. No missing packets located.`);
      playSound('warn');
    }
  };

  // Execution card playing trigger
  const playCardFromHand = (playerIndex: number, cardId: string, chosenProtocol?: Exclude<Protocol, 'wild'>) => {
    const activePlayer = playersRef.current[playerIndex];
    if (!activePlayer) return;

    const cardIndex = activePlayer.cards.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      if (activePlayer.isBot) {
        addLog('warn', `[RECOVERY] Server ${activePlayer.name} packet not found in hand buffers. Recovering routing queue.`);
        const nextIndex = getNextTurnIndex(gameDirectionRef.current, playerIndex, playersRef.current.length);
        updateCurrentPlayerIndex(nextIndex);
      }
      return;
    }

    const cardToPlay = activePlayer.cards[cardIndex];
    const topCard = discardPileRef.current[discardPileRef.current.length - 1];

    // Card matching guard (just safety, human is visually guarded)
    if (playerIndex === 0 && !canPlayCard(cardToPlay, topCard, activeProtocolRef.current) && !drawnPlayableCard) {
      addLog('danger', `[BLOCKED] Cannot route packet ${cardToPlay.url}. Conflicts with active protocol ${activeProtocolRef.current.toUpperCase()}`);
      playSound('warn');
      return;
    }

    // If wild needs protocol choosing (and we haven't selected yet)
    if (cardToPlay.protocol === 'wild' && !chosenProtocol) {
      if (playerIndex === 0) {
        // Human played a wild - open color dialog
        setPendingWildCard({ card: cardToPlay, index: playerIndex });
        setIsColorChooserOpen(true);
        return;
      } else {
        // Bot played a wild - choose protocol bot has the most of
        chosenProtocol = selectBotProtocol(activePlayer);
      }
    }

    // Proceeding to place card in the pile
    updateDiscardPile([...discardPileRef.current, cardToPlay]);
    
    // Clear temporary play drawn helper
    setDrawnPlayableCard(null);

    // Subtract card from hand
    const nextHand = activePlayer.cards.filter((c) => c.id !== cardId);
    
    const updatedPlayers = playersRef.current.map((p, idx) => {
      if (idx === playerIndex) {
        return {
          ...p,
          cards: nextHand,
          statusMsg: `Routed ${cardToPlay.type === 'number' ? 'value ' + cardToPlay.value : cardToPlay.type.toUpperCase()}`,
          analytics: {
            ...p.analytics,
            cardsPlayed: p.analytics.cardsPlayed + 1,
          },
        };
      }
      return p;
    });

    // Write analytics update
    updatePlayers(updatedPlayers);

    playSound('play');

    // Reset target UNO warning state if card count remains larger than 1
    if (nextHand.length > 1) {
      setUnoDeclared((prev) => {
        const copy = { ...prev };
        delete copy[activePlayer.id];
        return copy;
      });
    }

    // Check Win condition instantly
    if (nextHand.length === 0) {
      addLog('success', `[DEPLOYED] 🏆 ${activePlayer.name} has transmitted all packets and closed socket connection! Status: WINNER`);
      setWinner(activePlayer.id);
      setGameStatus('game-over');
      playSound('success');
      return;
    }

    // Print logs of plays
    let labelInfo = `${activePlayer.name} requested POST against ${cardToPlay.url}`;
    if (cardToPlay.type === 'skip') {
      labelInfo = `🚫 ${activePlayer.name} deployed 404 Skip on top of ${cardToPlay.domain}. Next gateway cluster skipped!`;
    } else if (cardToPlay.type === 'reverse') {
      labelInfo = `♻️ ${activePlayer.name} loaded 302 Redirect. Server routing queues have reversed course!`;
    } else if (cardToPlay.type === 'draw2') {
      labelInfo = `⚠️ ${activePlayer.name} injected 502 Bad Gateway! Overloading next receiver node with +2 payload.`;
    } else if (cardToPlay.type === 'wild') {
      labelInfo = `🌐 ${activePlayer.name} triggered DNS REWRITE card to point at ${chosenProtocol?.toUpperCase()}: ${cardToPlay.url}`;
    } else if (cardToPlay.type === 'wild4') {
      labelInfo = `🔥 DDoS ATTACK! ${activePlayer.name} activated ping-flood! Changes route to ${chosenProtocol?.toUpperCase()} and loads +4 payloads.`;
    }
    
    // Log play
    addLog('info', labelInfo);

    // Apply special actions and compute who plays next
    let nextIndex = getNextTurnIndex(gameDirectionRef.current, playerIndex, playersRef.current.length);
    let nextDirection = gameDirectionRef.current;
    let nextProtocol = cardToPlay.protocol === 'wild' ? (chosenProtocol || 'https') : cardToPlay.protocol;

    if (cardToPlay.type === 'reverse') {
      if (playersRef.current.length === 2) {
        // In 2 players, reverse is Skip
        nextIndex = playerIndex;
        addLog('warn', `[SYSTEM] Only 2 players online. 302 Redirect acts as standard loop skip.`);
      } else {
        nextDirection = gameDirectionRef.current === 'clockwise' ? 'counter-clockwise' : 'clockwise';
        // Recalculate nextIndex based on the reversed direction
        nextIndex = getNextTurnIndex(nextDirection, playerIndex, playersRef.current.length);
      }
    } else if (cardToPlay.type === 'skip') {
      // Advancing again skips the next player
      nextIndex = getNextTurnIndex(nextDirection, nextIndex, playersRef.current.length);
      addLog('warn', `[SYSTEM] Bypassing receiver node index queue.`);
    } else if (cardToPlay.type === 'draw2') {
      // Overload player with 2 cards and skip their turn
      drawCardForPlayer(nextIndex, 2);
      nextIndex = getNextTurnIndex(nextDirection, nextIndex, playersRef.current.length);
    } else if (cardToPlay.type === 'wild4') {
      // Overload player with 4 cards and skip their turn
      drawCardForPlayer(nextIndex, 4);
      nextIndex = getNextTurnIndex(nextDirection, nextIndex, playersRef.current.length);
    }

    // Set updated operational states
    updateGameDirection(nextDirection);
    updateActiveProtocol(nextProtocol);
    updateCurrentPlayerIndex(nextIndex);

    let nextUnoDeclared = { ...unoDeclared };
    if (nextHand.length === 1) {
       if (activePlayer.isBot) {
        // 85% chance bot declares UNO instantly
        const success = Math.random() < 0.85;
        if (success) {
          nextUnoDeclared[activePlayer.id] = true;
          setUnoDeclared(nextUnoDeclared);
          addLog('warn', `[ALERT] ${activePlayer.name} yelling: 'UNO!' over websockets.`);
          playSound('uno');
        } else {
          addLog('warn', `[WARNING] ${activePlayer.name} forgot to establish keep-alive declarations. High vulnerability!`);
        }
      } else {
        // Warn human to click the button
        addLog('warn', `[SECURITY CHECK] Local client hand holds 1 card! Quick, declare UNO to bypass server penalties.`);
      }
    }

    // Multiplayer Firestore Synchronization
    if (isMultiplayerRef.current) {
      const nextLogItem = {
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info' as const,
        message: labelInfo
      };
      
      const isGameOver = nextHand.length === 0;

      writeRoomSync({
        discardPile: [...discardPileRef.current],
        players: playersRef.current,
        currentPlayerIndex: nextIndex,
        gameDirection: nextDirection,
        activeProtocol: nextProtocol,
        unoDeclared: nextUnoDeclared,
        winnerId: isGameOver ? activePlayer.id : null,
        status: isGameOver ? 'game-over' : 'playing',
        logs: [...logs, nextLogItem]
      });
    }
  };

  // Human draws card
  const handleHumanDraw = () => {
    const localPlayerIdx = isMultiplayerRef.current ? myIndexRef.current : 0;
    if (currentPlayerIndexRef.current !== localPlayerIdx || gameStatus !== 'playing' || drawnPlayableCard) return;

    const topCard = discardPileRef.current[discardPileRef.current.length - 1];
    const drawn = drawCardForPlayer(localPlayerIdx, 1)[0];
    playSound('draw');

    if (drawn) {
      const activeUser = playersRef.current[localPlayerIdx];
      const detailLog = `${activeUser?.name || 'Local Client'} GET request: Drew card ${drawn.url}`;
      addLog('info', detailLog);
      
      // Standard UNO: If drawn card matches, player can play it immediately!
      if (canPlayCard(drawn, topCard, activeProtocolRef.current)) {
        setDrawnPlayableCard(drawn);
        addLog('success', `[HOT_MODULE] Drawn card is playable! Decide whether to POST or KEEP.`);
      } else {
        const nextIndex = getNextTurnIndex(gameDirectionRef.current, localPlayerIdx, playersRef.current.length);
        updateCurrentPlayerIndex(nextIndex);
        
        if (isMultiplayerRef.current) {
          writeRoomSync({
            currentPlayerIndex: nextIndex,
            logs: [...logs, { id: `log-${Math.random().toString(36).substring(2, 9)}`, timestamp: new Date().toLocaleTimeString(), type: 'info', message: detailLog }]
          });
        }
      }
    }
  };

  // Keep drawn card instead of playing it
  const handleKeepDrawnCard = () => {
    setDrawnPlayableCard(null);
    const localPlayerIdx = isMultiplayerRef.current ? myIndexRef.current : 0;
    const activeUser = playersRef.current[localPlayerIdx];
    const detailLog = `${activeUser?.name || 'Local Client'} decided to cache drawn card hand-buffer.`;
    addLog('info', detailLog);
    const nextIndex = getNextTurnIndex(gameDirectionRef.current, localPlayerIdx, playersRef.current.length);
    updateCurrentPlayerIndex(nextIndex);

    if (isMultiplayerRef.current) {
      writeRoomSync({
        currentPlayerIndex: nextIndex,
        logs: [...logs, { id: `log-${Math.random().toString(36).substring(2, 9)}`, timestamp: new Date().toLocaleTimeString(), type: 'info', message: detailLog }]
      });
    }
  };

  // Wild Selector Resolution
  const resolveWildSelection = (chosen: Exclude<Protocol, 'wild'>) => {
    if (!pendingWildCard) return;

    setIsColorChooserOpen(false);
    playCardFromHand(pendingWildCard.index, pendingWildCard.card.id, chosen);
    setPendingWildCard(null);
  };

  // Bot Smart Decision: select color suited for hand
  const selectBotProtocol = (botPlayer: Player): Exclude<Protocol, 'wild'> => {
    const counts: Record<Exclude<Protocol, 'wild'>, number> = {
      https: 0,
      http: 0,
      ftp: 0,
      ws: 0,
    };

    botPlayer.cards.forEach((c) => {
      if (c.protocol !== 'wild') {
        counts[c.protocol]++;
      }
    });

    const entries = Object.entries(counts) as [Exclude<Protocol, 'wild'>, number][];
    entries.sort((a, b) => b[1] - a[1]);
    
    return entries[0][0]; // Most abundant protocol color
  };

  // Automated BOT cycle triggers
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const activePlayer = playersRef.current[currentPlayerIndex];
    if (!activePlayer || !activePlayer.isBot) {
      setIsBotThinking(false);
      return;
    }

    // MULTIPLAYER CONSTRAINT: Only the room host executes bot decisions!
    if (isMultiplayerRef.current) {
      const hostId = playersRef.current[0]?.id;
      if (myPlayerId !== hostId) {
        setIsBotThinking(true);
        return;
      }
    }

    // Bot matches turn - compute delay move
    setIsBotThinking(true);
    const updatedPlayersMsg = playersRef.current.map((p, idx) => {
      if (idx === currentPlayerIndex) {
        return { ...p, statusMsg: 'Compiling target headers...' };
      }
      return p;
    });
    updatePlayers(updatedPlayersMsg);

    botTimerRef.current = setTimeout(() => {
      executeBotMove();
    }, botSpeedMs);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [currentPlayerIndex, gameStatus, turnCounter, botSpeedMs, isMultiplayer, myPlayerId]);

  // Execute bot card mechanics
  const executeBotMove = () => {
    const botIndex = currentPlayerIndexRef.current;
    const botPlayer = playersRef.current[botIndex];
    const topCard = discardPileRef.current[discardPileRef.current.length - 1];

    if (!botPlayer) return;

    // Find playable cards
    const playable = botPlayer.cards.filter((c) => canPlayCard(c, topCard, activeProtocolRef.current));

    if (playable.length > 0) {
      // Bot strategic selection: prioritize action cards to trip others!
      const actionCards = playable.filter((c) => c.type !== 'number');
      const chosenCard = actionCards.length > 0 
        ? actionCards[Math.floor(Math.random() * actionCards.length)] 
        : playable[Math.floor(Math.random() * playable.length)];

      playCardFromHand(botIndex, chosenCard.id);
    } else {
      // Draw standard card from pile
      addLog('info', `[PENDING] Server ${botPlayer.name} cache miss! Pulling packet from draw buffer.`);
      const drawn = drawCardForPlayer(botIndex, 1)[0];
      playSound('draw');

      if (drawn && canPlayCard(drawn, topCard, activeProtocolRef.current)) {
        // Played immediately!
        addLog('success', `[INFO] Server ${botPlayer.name} hot-pushed freshly compiled drawn packet: ${drawn.url}`);
        
        // Timeout to simulate playing drawn card naturally
        botTimerRef.current = setTimeout(() => {
          playCardFromHand(botIndex, drawn.id);
        }, 800);
      } else {
        // Pass to next server
        addLog('info', `[PASS] Server ${botPlayer.name} passed loop turn.`);
        const updatedPlayersPass = playersRef.current.map((p, idx) => {
          if (idx === botIndex) {
            return { ...p, statusMsg: 'Awaiting port signal...' };
          }
          return p;
        });
        updatePlayers(updatedPlayersPass);
        const nextIndex = getNextTurnIndex(gameDirectionRef.current, botIndex, playersRef.current.length);
        updateCurrentPlayerIndex(nextIndex);

        if (isMultiplayerRef.current) {
          writeRoomSync({
            players: updatedPlayersPass,
            currentPlayerIndex: nextIndex,
            logs: [...logs, { id: `log-${Math.random().toString(36).substring(2, 9)}`, timestamp: new Date().toLocaleTimeString(), type: 'info', message: `Server ${botPlayer.name} passed loop turn.` }]
          });
        }
      }
    }
    
    setIsBotThinking(false);
  };

  // Determine standard style per protocol
  const getProtocolVisualDetails = (proto: Protocol) => {
    switch (proto) {
      case 'https':
        return {
          textColor: 'text-rose-400',
          borderColor: 'border-rose-500/80',
          bgColor: 'bg-rose-500/10',
          glowText: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
          label: 'HTTPS (Red)',
          icon: <Lock className="w-4 h-4 text-rose-400" />
        };
      case 'http':
        return {
          textColor: 'text-sky-400',
          borderColor: 'border-sky-500/80',
          bgColor: 'bg-sky-500/10',
          glowText: 'shadow-[0_0_15px_rgba(14,165,233,0.3)]',
          label: 'HTTP (Blue)',
          icon: <Unlock className="w-4 h-4 text-sky-400" />
        };
      case 'ftp':
        return {
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/80',
          bgColor: 'bg-emerald-500/10',
          glowText: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          label: 'FTP (Green)',
          icon: <FolderSync className="w-4 h-4 text-emerald-400" />
        };
      case 'ws':
        return {
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/80',
          bgColor: 'bg-amber-500/10',
          glowText: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
          label: 'WebSocket (Yellow)',
          icon: <Zap className="w-4 h-4 text-amber-400" />
        };
      default:
        return {
          textColor: 'text-purple-400',
          borderColor: 'border-purple-500/80',
          bgColor: 'bg-purple-500/10',
          glowText: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
          label: 'Wild Host',
          icon: <Globe className="w-4 h-4 text-purple-400" />
        };
    }
  };

  const activeProtoDetails = getProtocolVisualDetails(activeProtocol);
  const topDiscardCard = discardPile[discardPile.length - 1];

  // Format countdown starting from specified limit, or count up if unlimited
  const formatTimerResult = (sec: number) => {
    if (timeLimitMinutes === 0) {
      // Count up (elapsed)
      const mins = Math.floor(sec / 60);
      const secs = sec % 60;
      return `∞ ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      // Count down (remaining)
      const totalTime = timeLimitMinutes * 60;
      const remaining = Math.max(0, totalTime - sec);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Curved layout calculators for seats
  const getFanStyle = (idx: number, total: number, seat: 'left' | 'top' | 'right') => {
    if (total === 0) return {};
    const mid = (total - 1) / 2;
    const diff = idx - mid;
    const isMobile = windowWidth < 640;
    
    if (seat === 'left') {
      const angle = diff * (isMobile ? 8 : 12);
      const offset = diff * (isMobile ? 4 : 8);
      return {
        transform: `rotate(${angle - 70}deg) translateY(${offset}px) translateZ(0)`,
        zIndex: idx,
      };
    }
    if (seat === 'right') {
      const angle = diff * (isMobile ? 8 : 12);
      const offset = diff * (isMobile ? 4 : 8);
      return {
        transform: `rotate(${angle + 70}deg) translateY(${offset}px) translateZ(0)`,
        zIndex: idx,
      };
    }
    if (seat === 'top') {
      const angle = diff * (isMobile ? 6 : 10);
      const offset = diff * (isMobile ? 6 : 12);
      return {
        transform: `rotate(${angle + 180}deg) translateX(${offset}px) translateZ(0)`,
        zIndex: idx,
      };
    }
    return {};
  };

  // Spacing for human fanned card cluster
  const getHumanCardStyle = (idx: number, total: number) => {
    if (total === 0) return {};
    const mid = (total - 1) / 2;
    const diff = idx - mid;
    const isMobile = windowWidth < 640;
    
    // Mathematically bounded overlap calculation to prevent cards from overflowing and overlapping outer buttons
    const targetCenterWidth = isMobile ? Math.max(150, windowWidth - 145) : windowWidth < 768 ? 340 : 500;
    const cardWidth = isMobile ? 72 : 88; // fits w-18 and w-22 compact hand sizes
    const maxOverlap = isMobile ? 26 : 38;
    
    let overlap = maxOverlap;
    if (total > 1) {
      overlap = (targetCenterWidth - cardWidth) / (total - 1);
      overlap = Math.min(maxOverlap, Math.max(isMobile ? 10 : 15, overlap));
    }
    
    let rotateScale = isMobile ? 4.0 : 6.5;
    if (total > 8) {
      rotateScale = rotateScale * (8 / total);
    }
    
    const rotate = diff * rotateScale;
    const translateY = Math.abs(diff) * (total > 10 ? 0.8 : 1.8) + (diff * diff * (isMobile ? 0.25 : 0.45));
    const translateX = diff * overlap;
    
    return {
      transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`,
      zIndex: idx,
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 font-sans text-slate-100 select-none overflow-x-hidden relative">
      <h1 className="sr-only">URL UNO - Web Protocol Card Game Console</h1>

      {/* Decorative Widescreen Gaming Console Box Container */}
      <div className="w-full max-w-5xl h-[78vh] sm:h-[82vh] min-h-[640px] sm:min-h-[700px] md:min-h-[770px] max-h-[840px] rounded-3xl relative border-8 border-slate-900 bg-gradient-to-b from-[#29b6f6] via-[#4fc3f7] to-[#e0f7fa] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col justify-between">
        
        {/* Floating Cartoon Clouds Background Elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div 
            animate={{ x: [0, 400, 0] }}
            transition={{ duration: 75, repeat: Infinity, ease: 'linear' }}
            className="absolute top-8 left-10 w-24 h-10 bg-white/70 rounded-full blur-[1px]"
          />
          <motion.div 
            animate={{ x: [0, -350, 0] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute top-16 right-16 w-32 h-12 bg-white/60 rounded-full blur-[2px]"
          />
          <motion.div 
            animate={{ x: [0, 250, 0] }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute top-36 left-1/4 w-20 h-8 bg-sky-200/50 rounded-full"
          />

          {/* Lush Green Curvaceous Hills Background Overlay (mimicking the background terrain) */}
          <div className="absolute -bottom-12 -left-20 w-80 h-48 bg-gradient-to-t from-emerald-500/80 to-teal-400/50 rounded-full blur-sm" />
          <div className="absolute -bottom-16 -right-20 w-80 h-48 bg-gradient-to-t from-emerald-500/80 to-teal-400/50 rounded-full blur-sm" />
        </div>

        {/* ----------------- TOP CONTROLS ----------------- */}
        <div className="w-full p-3 flex justify-between items-center z-30 relative pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Ticking Timer capsule */}
            <div className="bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-slate-900 text-slate-950 rounded-full flex items-center gap-1.5 px-3 py-1 sm:py-1.5 shadow-md select-none">
              <Clock className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black tracking-wider font-mono leading-none">
                {formatTimerResult(secondsElapsed)}
              </span>
            </div>

            {/* Private Room / Multiplayer Trigger Button */}
            <button
              onClick={() => setIsRoomDialogOpen(true)}
              title="Open Private Rooms & Joins Console"
              className={`border-2 border-slate-900 border-b-4 border-b-slate-900 hover:brightness-105 active:border-b-2 active:translate-y-[2px] rounded-full flex items-center gap-1 px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition-all ${
                isMultiplayer 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 animate-pulse' 
                  : 'bg-rose-500 hover:bg-rose-600 text-slate-100'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>{isMultiplayer ? `ROOM: ${roomId}` : 'MULTIPLAYER (10p)'}</span>
            </button>
          </div>

          {/* Top Right Utilities buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Logs button */}
            <button
              onClick={() => setIsLogsOpen(true)}
              title="Show Stream Logs"
              className="bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-slate-900 border-b-4 border-b-slate-900 hover:brightness-105 active:border-b-2 active:translate-y-[2px] rounded-xl w-10 h-10 flex items-center justify-center shadow-md cursor-pointer text-slate-900 font-extrabold transition-all"
            >
              <History className="w-5 h-5 text-slate-900" style={{ strokeWidth: 2.5 }} />
            </button>

            {/* Gear config button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Game Sandbox Configuration"
              className="bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-slate-900 border-b-4 border-b-slate-900 hover:brightness-105 active:border-b-2 active:translate-y-[2px] rounded-xl w-10 h-10 flex items-center justify-center shadow-md cursor-pointer text-slate-900 font-extrabold transition-all"
            >
              <Sliders className="w-5 h-5 text-slate-900" style={{ strokeWidth: 2.5 }} />
            </button>
          </div>
        </div>

        {/* ================= CENTRAL TABLE ENVIRONMENT ================= */}
        <div 
          style={{
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
          }}
          className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[210px] h-[210px] sm:w-[330px] sm:h-[330px] md:w-[370px] md:h-[370px] bg-gradient-to-br from-[#3e2511] via-[#1a0e05] to-[#040200] p-1 sm:p-1.5 md:p-2 shadow-[0_20px_40px_rgba(0,0,0,0.85)] z-10 select-none border border-[#1f1105]/50 flex items-center justify-center animate-fade-in"
        >
          {/* Beveled wood face inner edge */}
          <div 
            style={{
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
            }}
            className="w-full h-full bg-gradient-to-tr from-[#633a19] via-[#8c5a2e] via-[#9e6a3c] to-[#4d290e] flex items-center justify-center relative p-1 sm:p-2 md:p-3 shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)]"
          >
            {/* Center Felt Dark Inlay region */}
            <div 
              style={{
                clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
              }}
              className="w-full h-full bg-gradient-to-b from-[#1b1008] via-[#110904] to-[#0d0602] border border-[#301c0a]/50 relative flex items-center justify-center p-2 shadow-[inset_0_12px_36px_rgba(0,0,0,0.9)]"
            >
              
              {/* Wooden Inlay guidelines */}
              <div 
                style={{
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                }}
                className="absolute inset-[10px] border border-dashed border-[#5e381b]/10 pointer-events-none" 
              />
              <div 
                style={{
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                }}
                className="absolute inset-[25px] border border-[#52331b]/5 pointer-events-none" 
              />

              {/* UNO brand subtle textured label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-[-12deg] skew-x-[-10deg]">
                <span className="text-[70px] sm:text-[140px] font-sans font-black italic tracking-tighter text-white tracking-widest drop-shadow-[4px_4px_0px_#111]">
                  UNO
                </span>
              </div>

              {/* 3D Arrow Direction flow path (Clockwise / Counter-Clockwise) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.svg
                  viewBox="0 0 200 200"
                  className={`w-[86%] h-[86%] pointer-events-none ${
                    gameDirection === 'clockwise' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                  }`}
                  animate={{ rotate: gameDirection === 'clockwise' ? 360 : -360 }}
                  transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                >
                  {/* Orbit Track path */}
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                    className="opacity-30"
                  />
                  
                  {/* Glowing Flow curved arrows */}
                  <g transform={gameDirection === 'clockwise' ? '' : 'translate(200 0) scale(-1 1)'}>
                    {/* Three symmetrical glowing curved segment curves with arrowheads */}
                    <g transform="rotate(0 100 100)">
                      <path d="M 100 28 A 72 72 0 0 1 146 46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      <polygon points="141,39 153,45 140,53" fill="currentColor" />
                    </g>
                    <g transform="rotate(120 100 100)">
                      <path d="M 100 28 A 72 72 0 0 1 146 46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      <polygon points="141,39 153,45 140,53" fill="currentColor" />
                    </g>
                    <g transform="rotate(240 100 100)">
                      <path d="M 100 28 A 72 72 0 0 1 146 46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                      <polygon points="141,39 153,45 140,53" fill="currentColor" />
                    </g>
                  </g>
                </motion.svg>
              </div>

              {/* Draw and Discard deck central panel */}
              <div className="flex items-center justify-center gap-3 sm:gap-10 relative z-20">
                
                {/* Draw Stack */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    disabled={currentPlayerIndex !== 0 || gameStatus !== 'playing' || !!drawnPlayableCard}
                    onClick={handleHumanDraw}
                    className={`group relative outline-none border-0 ${
                      currentPlayerIndex === 0 && !drawnPlayableCard
                        ? 'cursor-pointer hover:scale-105 transition-transform'
                        : 'opacity-80'
                    }`}
                  >
                    {/* Visual Cards stack pile underneath */}
                    <div className="absolute -bottom-1 -right-1 w-16 sm:w-24 h-24 sm:h-36 bg-slate-900 border border-slate-700 rounded-lg -z-10 shadow" />
                    <div className="absolute -bottom-2 -right-2 w-16 sm:w-24 h-24 sm:h-36 bg-slate-950 border border-slate-800 rounded-lg -z-20 shadow" />
                    
                    {/* Top draw card */}
                    <UnoCardComponent card={{} as UnoCard} faceDown={true} size="sm" />
                    
                    {currentPlayerIndex === 0 && !drawnPlayableCard && (
                      <div className="absolute inset-0 bg-indigo-500/10 hover:bg-transparent rounded-lg flex items-center justify-center transition-colors">
                        <span className="bg-slate-950/95 border border-amber-400 text-amber-400 text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow animate-bounce">
                          DRAW
                        </span>
                      </div>
                    )}
                  </button>
                  <span className="text-[9px] font-mono text-amber-250/70 font-extrabold uppercase mt-1">
                    DECK: {deck.length} pg
                  </span>
                </div>

                {/* Discard Pile */}
                <div className="flex flex-col items-center gap-1">
                  {topDiscardCard ? (
                    <div className="relative">
                      {/* Overlap background layers simulating piles */}
                      <div className="absolute top-1 left-1 w-16 sm:w-24 h-24 sm:h-36 bg-[#090d16]/30 border border-slate-800 rounded-lg -z-10 rotate-3" />
                      <UnoCardComponent card={topDiscardCard} size="sm" disabled={true} />
                    </div>
                  ) : (
                    <div className="w-16 sm:w-24 h-24 sm:h-36 rounded-xl border-2 border-dashed border-slate-400/50 flex items-center justify-center text-slate-850 font-mono text-xs select-none">
                      Empty
                    </div>
                  )}
                  {topDiscardCard && (
                    <span className="text-[9px] font-mono text-amber-250/70 font-extrabold uppercase mt-1">
                      SUIT: {activeProtocol.toUpperCase()}
                    </span>
                  )}
                </div>

              </div>

              {/* Dynamic Active suit status ring banner overlay */}
              <div className={`absolute bottom-1 sm:bottom-2 px-3 py-1 rounded-full border ${activeProtoDetails.borderColor} ${activeProtoDetails.bgColor} flex items-center gap-1.5 shadow-md z-30 pointer-events-none scale-80 sm:scale-95`}>
                {activeProtoDetails.icon}
                <span className="text-[8px] sm:text-[10px] font-mono font-bold tracking-wider uppercase text-slate-100">
                  ACTIVE SUIT: <span className={activeProtoDetails.textColor}>{activeProtocol.toUpperCase()}</span>
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* ================= SIDES PLAYERS CARDS & AVATARS ================= */}
        {(() => {
          const renderedPlayersList = (() => {
            if (players.length === 0) return [];
            const localIdx = isMultiplayer ? myIndex : 0;
            if (localIdx === -1 || localIdx >= players.length) return players;
            return [...players.slice(localIdx), ...players.slice(0, localIdx)];
          })();

          const opponents = renderedPlayersList.slice(1);
          const numOpponents = opponents.length;

          // Distribute opponent count clockwise
          let leftCount = 0;
          let topCount = 0;
          let rightCount = 0;

          for (let i = 0; i < numOpponents; i++) {
            if (i % 3 === 0) leftCount++;
            else if (i % 3 === 1) topCount++;
            else rightCount++;
          }

          let leftIdx = 0;
          let topIdx = 0;
          let rightIdx = 0;

          return opponents.map((oppPlayer, idx) => {
            const originalIndex = players.indexOf(oppPlayer);
            
            let side: 'left' | 'top' | 'right' = 'left';
            let sideIndex = 0;
            let sideTotal = 1;

            if (idx % 3 === 0) {
              side = 'left';
              sideIndex = leftIdx++;
              sideTotal = leftCount;
            } else if (idx % 3 === 1) {
              side = 'top';
              sideIndex = topIdx++;
              sideTotal = topCount;
            } else {
              side = 'right';
              sideIndex = rightIdx++;
              sideTotal = rightCount;
            }

            // Absolute positioning depending on side, with responsive adjustments
            let containerStyle: React.CSSProperties = {};
            const isMobile = windowWidth < 640;

            if (side === 'left') {
              containerStyle = {
                position: 'absolute',
                left: isMobile ? '8px' : '16px',
                top: `${20 + (sideIndex + 0.5) * (45 / sideTotal)}%`,
                transform: 'translateY(-50%)',
              };
            } else if (side === 'right') {
              containerStyle = {
                position: 'absolute',
                right: isMobile ? '8px' : '16px',
                top: `${20 + (sideIndex + 0.5) * (45 / sideTotal)}%`,
                transform: 'translateY(-50%)',
              };
            } else { // top side
              containerStyle = {
                position: 'absolute',
                top: isMobile ? '8px' : '16px',
                left: `${15 + (sideIndex + 0.5) * (70 / sideTotal)}%`,
                transform: 'translateX(-50%)',
              };
            }

            const isActiveTurn = currentPlayerIndex === originalIndex;

            return (
              <div 
                key={oppPlayer.id} 
                style={containerStyle}
                className="flex flex-col items-center gap-1 z-20"
              >
                {/* Active spoken speech bubble overlay */}
                {activeSpeech[oppPlayer.id] && (
                  <div className="absolute bottom-18 left-1/2 -translate-x-1/2 bg-black text-white font-sans font-black text-[10px] px-2.5 py-1.5 rounded-xl shadow-xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
                    {activeSpeech[oppPlayer.id]}
                    <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r-2 border-b-2 border-slate-900 rotate-45" />
                  </div>
                )}
                
                {/* Speech status description */}
                {!activeSpeech[oppPlayer.id] && oppPlayer.statusMsg && isActiveTurn && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-700 text-[10px] sm:text-xs px-2 py-0.5 rounded shadow text-slate-300 font-mono whitespace-nowrap max-w-[130px] truncate">
                    {oppPlayer.statusMsg}
                  </div>
                )}

                {/* Profile wrapper bubble */}
                <div className={`relative px-1 pb-1 pt-1 rounded-2xl border-4 ${
                  isActiveTurn
                    ? 'bg-amber-300 border-slate-900 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.65)] scale-105 z-30'
                    : 'bg-emerald-950 border-slate-900 text-white'
                } transition-all duration-200 flex flex-col items-center justify-center text-center shadow w-18 h-18 sm:w-20 sm:h-20`}>
                  
                  {/* Flashing "PLAYING" Badge */}
                  {isActiveTurn && (
                    <div className="absolute -top-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[6.5px] sm:text-[7.5px] font-black px-1.5 py-0.5 rounded-full border border-slate-950 shadow uppercase tracking-wider animate-bounce select-none z-30 whitespace-nowrap leading-none">
                      PLAYING
                    </div>
                  )}

                  {/* Active pulsing ring */}
                  {isActiveTurn && (
                    <div className="absolute inset-[-4px] rounded-2xl border-4 border-amber-400 animate-ping opacity-75 pointer-events-none" />
                  )}

                  <span className="text-lg leading-none">{oppPlayer.avatar}</span>
                  <span className={`text-[8.5px] sm:text-[9.5px] font-sans font-extrabold leading-none text-center px-0.5 line-clamp-2 max-w-full mt-0.5 ${
                    isActiveTurn ? 'text-slate-950' : 'text-slate-100'
                  }`}>
                    {oppPlayer.name}
                  </span>
                  <span className={`text-[8px] font-mono font-bold px-1 rounded block mt-0.5 whitespace-nowrap leading-tight ${
                    isActiveTurn ? 'text-amber-950 bg-slate-950/10' : 'text-emerald-100 bg-slate-900/40'
                  }`}>
                    {oppPlayer.cards.length} pkg
                  </span>
                  
                  {/* PING warnings */}
                  {oppPlayer.cards.length === 1 && !unoDeclared[oppPlayer.id] && (
                    <div className="absolute -top-2.5 -right-2 bg-rose-600 text-white font-mono font-bold text-[7px] px-1 rounded animate-bounce border border-rose-400 uppercase">
                      PING!
                    </div>
                  )}
                </div>

                {/* Fanning packets deck */}
                <div className="relative h-12 w-20 flex items-center justify-center">
                  {Array.from({ length: Math.min(6, oppPlayer.cards.length) }).map((_, fanIdx) => {
                    const style = getFanStyle(fanIdx, Math.min(6, oppPlayer.cards.length), side);
                    return (
                      <div key={fanIdx} className="absolute" style={style}>
                        <UnoCardComponent card={{} as UnoCard} faceDown={true} size="xs" disabled={true} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}


        {/* ---------- SPEAKER MUTE AUDIO BUTTON ---------- */}
        <div className="absolute right-3 top-[32%] z-30">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Game' : 'Unmute Game'}
            className="bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-slate-900 border-b-4 border-b-slate-900 hover:brightness-105 active:border-b-2 active:translate-y-[2px] rounded-xl w-10 h-10 flex items-center justify-center shadow-md transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-slate-900 animate-pulse" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>
        </div>


        {/* ================= LOWER CONTROL CONSOLE ROW ================= */}
        <div className="w-full p-3 sm:p-4 flex justify-between items-end z-30 relative pointer-events-none mt-auto">
          
          {/* ----- BOTTOM LEFT: QUICK CHAT smiley FACE BUTTON ----- */}
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              title="Quick Network Messages"
              className="bg-gradient-to-b from-slate-900 to-black border-2 border-slate-950 border-b-4 border-b-black hover:brightness-110 active:border-[1.5px] active:translate-y-[2px] text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0"
            >
              <MessageSquare className="w-5 h-5 text-white animate-pulse" style={{ strokeWidth: 2.5 }} />
            </button>
            <span className="text-[9px] font-mono font-extrabold tracking-wider uppercase text-slate-950 mt-1 select-none">
              Chat
            </span>
          </div>

          {/* ----- BOTTOM CENTER: VAIBHAV PATIL (YOUR HAND) ----- */}
          {(() => {
            const localPlayerIdx = isMultiplayer ? myIndex : 0;
            const humanPlayerObj = players[localPlayerIdx];
            if (!humanPlayerObj) return null;

            const isYourTurn = currentPlayerIndex === localPlayerIdx;

            return (
              <div className="pointer-events-auto flex flex-col items-center w-full max-w-[300px] sm:max-w-[440px] md:max-w-[600px] mb-0 relative group z-30">
                {/* Actively spoken quote speech bubble overlay */}
                {activeSpeech[humanPlayerObj.id] && (
                  <div className="absolute bottom-[235px] left-1/2 -translate-x-1/2 bg-black text-white font-sans font-black text-[11px] px-3.5 py-1.5 rounded-xl shadow-xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
                    {activeSpeech[humanPlayerObj.id]}
                    <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black border-r-2 border-b-2 border-slate-900 rotate-45" />
                  </div>
                )}

                {/* State instruction header bar */}
                <div className="absolute top-[-70px] left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow backdrop-blur whitespace-nowrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${isYourTurn ? 'bg-emerald-500 animate-ping' : 'bg-slate-700'}`} />
                  <span className="text-[11px] font-mono text-slate-200">
                    {isYourTurn ? (
                      <span className="text-emerald-400 font-extrabold uppercase">YOUR TURN: POST PACKET SUIT</span>
                    ) : (
                      <span className="text-slate-400 font-semibold uppercase">WAITING_ON_OPS...</span>
                    )}
                  </span>
                </div>

                {/* Hand fanning array viewport container: larger, bottom-aligned, compact padding to avoid layout occlusion */}
                <div className="relative h-26 sm:h-30 w-full flex items-end justify-center z-10 select-none pb-3 sm:pb-4">
                  {(() => {
                    const sortedUserCards = sortUserCards(humanPlayerObj.cards || []);
                    return sortedUserCards.map((card, idx) => {
                      const isPlayable = isYourTurn && !drawnPlayableCard && canPlayCard(card, topDiscardCard, activeProtocol);
                      const fanStyle = getHumanCardStyle(idx, sortedUserCards.length);
                      return (
                        <div
                          key={`${card.id}-${idx}`}
                          className="absolute cursor-pointer transition-transform duration-200 origin-bottom hover:!z-50"
                          style={fanStyle}
                        >
                          {/* Hover slider helper using nested wrapper styling to avoid jitter */}
                          <div className="hover:-translate-y-8 hover:scale-[1.03] transition-all duration-200 ease-out origin-bottom">
                            <UnoCardComponent
                              card={card}
                              size="hand"
                              isPlayable={isPlayable}
                              disabled={!isPlayable}
                              onClick={() => {
                                if (isPlayable) playCardFromHand(localPlayerIdx, card.id);
                              }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {humanPlayerObj.cards?.length === 0 && (
                    <div className="w-48 h-20 flex items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-500 font-mono text-xs mb-3">
                      Awaiting connection...
                    </div>
                  )}
                </div>

                {/* Capsule Name Tag with Active golden ring highlight */}
                <div className={`mt-0 px-4 py-1 rounded-full border-2 relative z-20 ${
                  isYourTurn
                    ? 'bg-amber-300 border-slate-900 text-slate-950 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-100'
                } transition-all duration-200`}>
                  <span className="font-sans font-black text-[11px] uppercase tracking-wider block">
                    {humanPlayerObj.name} ({humanPlayerObj.cards?.length || 0} PKTS)
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ----- BOTTOM RIGHT: THE 3D RED "CALL UNO" PUSH-BUTTON ----- */}
          <div className="pointer-events-auto flex flex-col items-center">
            {(() => {
              const localPlayerIdx = isMultiplayer ? myIndex : 0;
              const humanPlayerObj = players[localPlayerIdx];
              const userCardsCount = humanPlayerObj?.cards?.length || 0;
              
              if (!humanPlayerObj || userCardsCount !== 1) return null;
              
              const hasDeclared = unoDeclared[humanPlayerObj.id];

              return (
                <button
                  onClick={handleDeclareUno}
                  disabled={hasDeclared}
                  title={hasDeclared ? "UNO Declared!" : "Declare UNO - Left with 1 card!"}
                  className={`group flex flex-col items-center justify-center relative select-none cursor-pointer outline-none active:scale-95 transition-all w-22 h-22 shrink-0 rounded-full ${
                    hasDeclared 
                      ? 'shadow-[0_0_15px_rgba(34,197,94,0.6)] cursor-default' 
                      : 'animate-bounce shadow-[0_0_25px_rgba(239,68,68,0.85)]'
                  }`}
                >
                  {/* Bulky Gray Mount Base collar */}
                  <div className={`absolute inset-x-0 inset-y-0 rounded-full border-4 transition-all ${
                    hasDeclared 
                      ? 'bg-emerald-950 border-emerald-900 shadow-[inset_0_4px_3px_rgba(0,0,0,0.5)]' 
                      : 'bg-[#334155] border-slate-800 shadow-[0_6px_0_#1e293b,0_10px_20px_rgba(0,0,0,0.5)]'
                  }`} />
                  
                  {/* Push cherry red/emerald green dome */}
                  <div className={`absolute inset-1 rounded-full flex flex-col items-center justify-center select-none active:translate-y-1.5 active:shadow-inner shadow-[inset_0_4px_3px_rgba(255,255,255,0.4)] border overflow-hidden z-10 transition-all ${
                    hasDeclared
                      ? 'bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] border-[#059669]'
                      : 'bg-gradient-to-b from-[#f43f5e] via-[#e11d48] to-[#9f1239] border-[#be123c]'
                  }`}>
                    {/* Visual gloss reflection curve */}
                    <div className="absolute top-1 left-2 w-[70%] h-4 bg-white/20 rounded-[50%] blur-[0.5px]" />
                    <span className="text-[10px] font-sans font-bold text-slate-200 leading-none tracking-tight uppercase">
                      {hasDeclared ? "SAFE" : "CALL"}
                    </span>
                    <span className="text-sm font-sans font-black text-white leading-none uppercase tracking-tighter shadow-sm">
                      UNO
                    </span>
                  </div>
                </button>
              );
            })()}
            <div className="h-4" />
          </div>

        </div>

        {/* --------------------- POPUP MODALS DIRECT PORTAL CONTROLS --------------------- */}

        {/* 1. CONFIG DIALOG COMPONENT OVERLAY */}
        {isSettingsOpen && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fade-in pointer-events-auto">
            <div className="w-full max-w-sm rounded-[24px] border-4 border-slate-800 shadow-2xl relative bg-slate-900 border border-slate-800 p-1">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-[10px] font-bold cursor-pointer border border-slate-700/80 rounded-lg px-2 py-1 bg-slate-950/60 z-20"
              >
                ✕ CLOSE
              </button>
              <GameSettingsComponent
                onStartGame={(b, s, u) => {
                  startNewGame(b, s, u);
                  setIsSettingsOpen(false);
                }}
                currentBotCount={botCount}
                currentBotSpeed={botSpeedMs}
                currentCustomUrls={customUrlsInput}
              />
            </div>
          </div>
        )}

        {/* 2. HISTORY LOGS PORT DIALOG */}
        {isLogsOpen && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fade-in pointer-events-auto">
            <div className="w-full max-w-md rounded-2xl border-4 border-slate-800 shadow-2xl relative bg-slate-950 overflow-hidden flex flex-col p-1">
              <button 
                onClick={() => setIsLogsOpen(false)}
                className="absolute top-3.5 right-4 text-slate-400 hover:text-white font-mono text-[10px] font-bold cursor-pointer border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 bg-slate-900 z-50"
              >
                ✕ CLOSE
              </button>
              <div className="p-2 h-full flex flex-col gap-2">
                <GameLogsComponent logs={logs} onClearLogs={() => setLogs([])} />
              </div>
            </div>
          </div>
        )}

        {/* 3. DRAWN PLAYABLE CARD DRAWER ALERT */}
        {drawnPlayableCard && (
          <div className="absolute top-[75%] left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-905/95 backdrop-blur border border-indigo-500/50 rounded-2xl p-3 flex flex-col items-center justify-between gap-2.5 animate-bounce z-40 shadow-xl pointer-events-auto relative">
            <div className="text-center">
              <span className="text-[10px] font-mono text-indigo-300 block mb-0.5">HOT_PACKET COMPILING MATCH</span>
              <span className="text-xs font-sans font-bold text-white truncate max-w-[280px] block leading-snug">{drawnPlayableCard.url}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => playCardFromHand(0, drawnPlayableCard.id)}
                className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-mono text-[10px] font-bold rounded-lg cursor-pointer shadow transition-all uppercase"
              >
                Post Card
              </button>
              <button
                onClick={handleKeepDrawnCard}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] rounded-lg cursor-pointer transition-all uppercase"
              >
                Keep Hand
              </button>
            </div>
          </div>
        )}

        {/* 4. QUICK CHAT POPUP MENU */}
        {isChatOpen && (
          <div className="absolute bottom-[72px] left-3 sm:left-4 bg-black border-2 border-slate-900 p-2 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 w-44 max-h-56 overflow-y-auto pointer-events-auto animate-fade-in">
            <div className="text-[8px] font-mono text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-900 text-center font-bold">Network Ping Commands</div>
            {[
              "ERR_CONNECTION_REFUSED! ❌",
              "302 Temporary Redirect! ♻️",
              "502 Bad Gateway! ⚠️",
              "Incoming DDoS Traffic! 🔥",
              "DNS Wildcard Transfer! 🌐",
              "Access Token Gained! 🔑",
              "Handshake complete! 🤝",
            ].map((txt) => (
              <button
                key={txt}
                onClick={() => {
                  triggerSpeech('human', txt);
                  setIsChatOpen(false);
                  
                  // Let a random opponent response back over the network handshaking!
                  setTimeout(() => {
                    const randomBotIdx = 1 + Math.floor(Math.random() * (players.length - 1));
                    const randomBot = players[randomBotIdx];
                    if (randomBot) {
                      const responses = [
                        "404 Server Not Found! 😂",
                        "Transmission understood! ✅",
                        "Keep-alive socket OK!",
                        "Firewall mitigating attack!",
                        "Buffering overload..."
                      ];
                      triggerSpeech(randomBot.id, responses[Math.floor(Math.random() * responses.length)]);
                    }
                  }, 1200);
                }}
                className="text-[10px] font-sans font-bold text-left py-1 px-1.5 hover:bg-slate-900 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {txt}
              </button>
            ))}
          </div>
        )}

        {/* INITIAL IDENTITY DISCOVERY PROMPT */}
        {isNamePromptOpen && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
              
              <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
                  <Network className="w-6 h-6 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="text-sm font-sans font-black text-slate-100 uppercase tracking-wider">
                  INITIALIZE OPERATOR IDENTITY
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Authentication is required to route packets and sync dynamic connections.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const nameVal = (formData.get('operatorCodeName') as string || '').trim();
                  if (!nameVal) return;
                  handleNamePromptSubmit(nameVal, tempAvatar);
                }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-mono font-bold text-slate-400 block uppercase tracking-wider">
                    Operator Code Name
                  </label>
                  <input
                    name="operatorCodeName"
                    type="text"
                    required
                    placeholder="e.g. Master_Packeteer, Root_Null"
                    maxLength={15}
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9.5px] font-mono font-bold text-slate-400 block uppercase tracking-wider">
                    Routing Node Icon (Avatar)
                  </label>
                  <div className="grid grid-cols-5 gap-2 bg-slate-950/50 p-2 rounded-xl border border-slate-905">
                    {['💻', '🛡️', '⚙️', '🚀', '📡', '🌐', '🛸', '👾', '🕵️', '🔒'].map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => setTempAvatar(avatar)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all cursor-pointer ${
                          tempAvatar === avatar
                            ? 'bg-indigo-500/20 border border-indigo-500/50 text-white scale-105'
                            : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-mono font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
                >
                  ESTABLISH PORT CONNECTION
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 5. POPUP PROTOCOL COLOR CHOICE DIALOG */}
        <ColorChooserDialog isOpen={isColorChooserOpen} onSelect={resolveWildSelection} />

        {/* 5.5 PRIVATE MULTIPLAYER ROOM DIALOG */}
        <PrivateRoomDialog
          isOpen={isRoomDialogOpen}
          onClose={() => setIsRoomDialogOpen(false)}
          myPlayerId={myPlayerId}
          roomId={roomId}
          isMultiplayer={isMultiplayer}
          players={players}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onLaunchGame={handleLaunchRoomGame}
          onLeaveRoom={handleLeaveRoom}
          userName={userName}
          onChangeUserName={handleSetUserName}
          userAvatar={userAvatar}
          onChangeUserAvatar={handleSetUserAvatar}
          timeLimitMinutes={timeLimitMinutes}
        />

        {/* 6. GAME OVER POPUP PANEL */}
        {gameStatus === 'game-over' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur z-50 flex items-center justify-center p-3 animate-fade-in pointer-events-auto">
            <div className="bg-slate-900 border-4 border-indigo-500/50 rounded-2xl p-6 text-center max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 left-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl" />
              
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-3 animate-bounce">
                <Award className="w-6 h-6 text-indigo-400" />
              </div>

              <h2 className="text-base font-black font-mono tracking-tight text-white mb-1">
                GATEWAY_CLOSE_OK ({winner === 'human' ? 'YOU WON!' : 'SERVER CLUSTER WON!'})
              </h2>
              
              <p className="max-w-md mx-auto text-[10px] text-slate-400 font-mono leading-relaxed mb-4">
                {winner === 'human' 
                  ? 'All local client packets safely routed and resolved through global DNS headers! Excellent deployment!' 
                  : 'A remote server cluster successfully cleared its buffer before local clients could resolve!'}
              </p>

              {/* Stats card */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 border border-slate-800 rounded-xl mb-4 font-mono text-[9px] text-slate-400 text-left">
                <div>
                  <span className="text-slate-500">Winner:</span>{' '}
                  <span className="text-indigo-400 font-bold">{players.find(p => p.id === winner)?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Your Plays:</span>{' '}
                  <span className="text-slate-200 font-bold">{players[0]?.analytics?.cardsPlayed || 0} pkts</span>
                </div>
                <div>
                  <span className="text-slate-500">Turn ticks:</span>{' '}
                  <span className="text-slate-200 font-bold">{turnCounter} rounds</span>
                </div>
                <div>
                  <span className="text-slate-500">Remaining Deck:</span>{' '}
                  <span className="text-slate-200 font-bold">{deck.length} pkts</span>
                </div>
              </div>

              <button
                onClick={() => startNewGame(botCount, botSpeedMs, customUrlsInput)}
                className="py-2 px-5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-mono font-bold text-xs rounded-xl cursor-pointer shadow-lg hover:shadow-indigo-500/20"
              >
                REDEPLOY SERVER GATEWAYS
              </button>
            </div>
          </div>
        )}

      </div>
      
      {/* Small informative prompt indicator */}
      <span className="text-[10px] font-mono text-slate-500 mt-2 select-none">
        URL UNO • Web Protocols & Active Server Sockets • Designed in Morning Dawn theme
      </span>
    </div>
  );
}
