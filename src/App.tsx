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
  const [activeSpeech, setActiveSpeech] = useState<{ [playerId: string]: string }>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(1024);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
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
      name: 'Vaibhav Patil',
      isBot: false,
      cards: [],
      avatar: '💻',
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
    setActiveSpeech({});

    // Initial Logs
    setLogs([]);
    logsStarted.forEach((msg) => addLog('system', msg));
    addLog('info', `[PORT 8080] First starting packet: ${startCard.url}. Active routing suit: ${startCard.protocol.toUpperCase()}`);
    playSound('success');
  };

  // Timer Tick Trigger
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

  // Speech helper
  const triggerSpeech = (playerId: string, msg: string) => {
    setActiveSpeech((prev) => ({ ...prev, [playerId]: msg }));
    playSound('play');
    setTimeout(() => {
      setActiveSpeech((prev) => {
        const copy = { ...prev };
        delete copy[playerId];
        return copy;
      });
    }, 3000);
  };

  // Boot on initial impact
  useEffect(() => {
    startNewGame(botCount, botSpeedMs, customUrlsInput);
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
    updatePlayers((prev) =>
      prev.map((p, idx) => {
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
      })
    );

    // If active card drawn is 1, return it for immediate feedback evaluation
    return drawn;
  };

  // Interactive user call UNO
  const handleDeclareUno = () => {
    const userCards = players[0]?.cards || [];
    if (userCards.length <= 2) {
      setUnoDeclared((prev) => ({ ...prev, human: true }));
      addLog('success', `[INFO] ${players[0].name} declared UNO! Host socket ping verified.`);
      playSound('uno');
    } else {
      addLog('danger', `[FAIL] Penalty! Triggering mock headers too early. Hand still hosts ${userCards.length} packets.`);
      playSound('warn');
    }
  };

  // Interactive firewall audit to catch lies (CATCH!)
  const handleCatchUnoLiar = () => {
    let caughtLiar = false;

    players.forEach((player, idx) => {
      // Human caught a bot server with 1 card who neglected to declare UNO
      if (player.cards.length === 1 && !unoDeclared[player.id]) {
        caughtLiar = true;
        addLog('danger', `[FIREWALL ALERT] Player caught Server ${player.name} leaking open sockets! Injecting 2 packet drops.`);
        
        // Penalize the liar
        drawCardForPlayer(idx, 2);
        
        // Reset declaration status
        setUnoDeclared((prev) => ({ ...prev, [player.id]: true }));
        playSound('alert');
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
    
    // Write analytics update
    updatePlayers((prev) =>
      prev.map((p, idx) => {
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
      })
    );

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

    // Auto trigger bot declaring UNO
    if (nextHand.length === 1) {
      if (activePlayer.isBot) {
        // 85% chance bot declares UNO instantly
        const success = Math.random() < 0.85;
        if (success) {
          setUnoDeclared((prev) => ({ ...prev, [activePlayer.id]: true }));
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
  };

  // Human draws card
  const handleHumanDraw = () => {
    if (currentPlayerIndexRef.current !== 0 || gameStatus !== 'playing' || drawnPlayableCard) return;

    const topCard = discardPileRef.current[discardPileRef.current.length - 1];
    const drawn = drawCardForPlayer(0, 1)[0];
    playSound('draw');

    if (drawn) {
      addLog('info', `Local Client GET request: Drew card ${drawn.url}`);
      
      // Standard UNO: If drawn card matches, player can play it immediately!
      if (canPlayCard(drawn, topCard, activeProtocolRef.current)) {
        setDrawnPlayableCard(drawn);
        addLog('success', `[HOT_MODULE] Drawn card is playable! Decide whether to POST or KEEP.`);
      } else {
        // Go to next player
        const nextIndex = getNextTurnIndex(gameDirectionRef.current, 0, playersRef.current.length);
        updateCurrentPlayerIndex(nextIndex);
      }
    }
  };

  // Keep drawn card instead of playing it
  const handleKeepDrawnCard = () => {
    setDrawnPlayableCard(null);
    addLog('info', `Local Client decided to cache drawn card hand-buffer.`);
    const nextIndex = getNextTurnIndex(gameDirectionRef.current, 0, playersRef.current.length);
    updateCurrentPlayerIndex(nextIndex);
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

    // Bot matches turn - compute delay move
    setIsBotThinking(true);
    updatePlayers((prev) =>
      prev.map((p, idx) => {
        if (idx === currentPlayerIndex) {
          return { ...p, statusMsg: 'Compiling target headers...' };
        }
        return p;
      })
    );

    botTimerRef.current = setTimeout(() => {
      executeBotMove();
    }, botSpeedMs);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [currentPlayerIndex, gameStatus, turnCounter, botSpeedMs]);

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
        updatePlayers((prev) =>
          prev.map((p, idx) => {
            if (idx === botIndex) {
              return { ...p, statusMsg: 'Awaiting port signal...' };
            }
            return p;
          })
        );
        const nextIndex = getNextTurnIndex(gameDirectionRef.current, botIndex, playersRef.current.length);
        updateCurrentPlayerIndex(nextIndex);
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

  // Format countdown starting from 5:00
  const formatTimerResult = (sec: number) => {
    const totalTime = 300;
    const remaining = Math.max(0, totalTime - sec);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    const cardWidth = isMobile ? 88 : 104; // fits w-22 and w-26 sizes
    const maxOverlap = isMobile ? 32 : 46;
    
    let overlap = maxOverlap;
    if (total > 1) {
      overlap = (targetCenterWidth - cardWidth) / (total - 1);
      overlap = Math.min(maxOverlap, Math.max(isMobile ? 13 : 18, overlap));
    }
    
    let rotateScale = isMobile ? 4.5 : 7;
    if (total > 8) {
      rotateScale = rotateScale * (8 / total);
    }
    
    const rotate = diff * rotateScale;
    const translateY = Math.abs(diff) * (total > 10 ? 1.0 : 2.2) + (diff * diff * (isMobile ? 0.35 : 0.55));
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
      <div className="w-full max-w-5xl aspect-[1.8/1] min-h-[520px] sm:min-h-[580px] md:min-h-[630px] rounded-3xl relative border-8 border-slate-900 bg-gradient-to-b from-[#29b6f6] via-[#4fc3f7] to-[#e0f7fa] shadow-2xl overflow-hidden flex flex-col justify-between">
        
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
          {/* Ticking Timer capsule */}
          <div className="pointer-events-auto bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-slate-900 text-slate-950 rounded-full flex items-center gap-1.5 px-3 py-1 sm:py-1.5 shadow-md select-none hover:scale-103 transition-transform">
            <Clock className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-black tracking-wider font-mono leading-none">
              {formatTimerResult(secondsElapsed)}
            </span>
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
        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] sm:w-[450px] sm:h-[450px] md:w-[490px] md:h-[490px] rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 via-green-500 to-lime-300 shadow-[inset_-10px_-10px_30px_rgba(0,0,0,0.45),_0_10px_25px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 border-emerald-400/90 z-10 select-none">
          
          {/* Subtle Crater highlights for 3D globe styling */}
          <div className="absolute top-8 sm:top-12 left-10 sm:left-16 w-8 sm:w-12 h-6 sm:h-8 bg-emerald-700/20 rounded-full blur-[1px] rotate-12" />
          <div className="absolute bottom-12 sm:bottom-20 left-8 sm:left-12 w-10 sm:w-16 h-7 sm:h-10 bg-emerald-700/25 rounded-full blur-[1px] -rotate-12" />
          <div className="absolute top-18 sm:top-28 right-10 sm:right-16 w-9 sm:w-14 h-5 sm:h-8 bg-emerald-700/15 rounded-full blur-[1px]" />
          
          {/* Cyberspace communication network lines */}
          <div className="absolute inset-2 sm:inset-4 border border-emerald-300/15 rounded-full pointer-events-none" />
          <div className="absolute inset-8 sm:inset-14 border border-emerald-300/15 rounded-full pointer-events-none" />
          <div className="absolute inset-16 sm:inset-28 border border-emerald-300/10 rounded-full pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-emerald-300/25 to-transparent pointer-events-none" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/25 to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 rotate-[-12deg] skew-x-[-10deg]">
            <span className="text-[70px] sm:text-[140px] font-sans font-black italic tracking-tighter text-white tracking-widest drop-shadow-[2px_2px_0px_#14532d] sm:drop-shadow-[4px_4px_0px_#14532d]">
              UNO
            </span>
          </div>

          {/* Directional Orbit loop pointer dashboard matching clock queue */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full p-2 z-0">
            <motion.div
              animate={{ rotate: gameDirection === 'clockwise' ? 360 : -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              className="w-[84%] h-[84%] border-2 sm:border-4 border-dashed border-amber-400/35 rounded-full flex items-center justify-center"
            >
              <div className="text-[7px] sm:text-[9px] font-mono font-bold tracking-[0.2em] sm:tracking-[0.4em] text-emerald-800 uppercase select-none">
                {gameDirection === 'clockwise' ? '>>> CLOCKWISE >>>' : '<<< REVERSE <<<'}
              </div>
            </motion.div>
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
              <span className="text-[9px] font-mono text-emerald-950 font-extrabold uppercase mt-1">
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
                <span className="text-[9px] font-mono text-emerald-950 font-extrabold uppercase mt-1">
                  SUIT: {activeProtocol.toUpperCase()}
                </span>
              )}
            </div>

          </div>

          {/* Dynamic Active suit status ring banner overlay */}
          <div className={`absolute top-[68%] px-3 py-1 rounded-full border ${activeProtoDetails.borderColor} ${activeProtoDetails.bgColor} flex items-center gap-1.5 shadow-md z-30 pointer-events-none scale-90`}>
            {activeProtoDetails.icon}
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-slate-100">
              ACTIVE SUIT: <span className={activeProtoDetails.textColor}>{activeProtocol.toUpperCase()}</span>
            </span>
          </div>

        </div>

        {/* ================= SIDES PLAYERS CARDS & AVATARS ================= */}

        {/* ---------- BOT 0: RUSHIKESH (LEFT CENTER) ---------- */}
        {players[1] ? (
          <div className="absolute left-3 sm:left-4 top-[48%] -translate-y-1/2 flex flex-col items-center gap-1.5 z-20">
            {/* Action Speeches bubble overlay */}
            {activeSpeech[players[1].id] && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white text-slate-850 font-sans font-bold text-[10px] px-2.5 py-1.5 rounded-xl shadow-xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
                {activeSpeech[players[1].id]}
                <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-slate-900 rotate-45" />
              </div>
            )}
            
            {/* Speech bubble status from player logic */}
            {!activeSpeech[players[1].id] && players[1].statusMsg && currentPlayerIndex === 1 && (
              <div className="absolute -top-10 left-12 bg-slate-950/85 border border-slate-700 text-xs px-2 py-0.5 rounded shadow text-slate-300 font-mono max-w-[130px] truncate">
                {players[1].statusMsg}
              </div>
            )}

            {/* Profile circular avatar box */}
            <div className={`relative px-1 pb-1 pt-1.5 rounded-2xl border-4 ${
              currentPlayerIndex === 1
                ? 'bg-amber-300 border-slate-900 text-slate-950 shadow-md scale-105'
                : 'bg-emerald-900 border-slate-900 text-white'
            } transition-all flex flex-col items-center w-18 h-18 text-center shadow`}>
              <span className="text-xl leading-none">{players[1].avatar}</span>
              <span className="text-[10px] font-sans font-bold truncate max-w-[62px] mt-1 text-slate-900">
                {players[1].name}
              </span>
              <span className="text-[8px] font-mono font-bold text-emerald-100 bg-slate-950/40 px-1 rounded block mt-0.5">
                {players[1].cards.length} cards
              </span>
              
              {/* Leaking leak alert UNO bubble */}
              {players[1].cards.length === 1 && !unoDeclared[players[1].id] && (
                <div className="absolute -top-2.5 -right-2 bg-rose-600 text-white font-mono font-bold text-[7px] px-1 rounded animate-bounce border border-rose-400 uppercase">
                  PING!
                </div>
              )}
            </div>

            {/* Core fanning card indicator along border dome */}
            <div className="relative h-14 w-20 flex items-center justify-center">
              {Array.from({ length: Math.min(8, players[1].cards.length) }).map((_, idx) => {
                const style = getFanStyle(idx, Math.min(8, players[1].cards.length), 'left');
                return (
                  <div key={idx} className="absolute" style={style}>
                    <UnoCardComponent card={{} as UnoCard} faceDown={true} size="xs" disabled={true} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="absolute left-4 top-[48%] -translate-y-1/2 flex flex-col items-center gap-1 bg-slate-950/40 border border-dashed border-slate-800 p-3 rounded-2xl z-20">
            <span className="text-[8px] font-mono text-slate-500 uppercase">OFFLINE_PORT</span>
          </div>
        )}

        {/* ---------- BOT 1: JAYDEEP JOSHI (TOP CENTER) ---------- */}
        {players[2] ? (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-20">
            {/* Actively spoken quote speech bubble overlay */}
            {activeSpeech[players[2].id] && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white text-slate-850 font-sans font-bold text-[10px] px-2.5 py-1.5 rounded-xl shadow-xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
                {activeSpeech[players[2].id]}
                <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-slate-900 rotate-45" />
              </div>
            )}

            {!activeSpeech[players[2].id] && players[2].statusMsg && currentPlayerIndex === 2 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-700 text-xs px-2 py-0.5 rounded shadow text-slate-300 font-mono">
                {players[2].statusMsg}
              </div>
            )}

            {/* Profile Container */}
            <div className={`relative px-2 py-1 rounded-2xl border-4 ${
              currentPlayerIndex === 2
                ? 'bg-amber-300 border-slate-900 text-slate-950 shadow-md scale-105'
                : 'bg-emerald-900 border-slate-900 text-white'
            } transition-all flex flex-col items-center text-center shadow`}>
              <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{players[2].avatar}</span>
                <div className="text-left">
                  <span className="text-[10px] font-sans font-black leading-none block truncate max-w-[80px] text-slate-900">
                    {players[2].name}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-slate-100 mt-0.5 leading-none block">
                    {players[2].cards.length} PACKETS
                  </span>
                </div>
              </div>

              {/* Ping warning logo */}
              {players[2].cards.length === 1 && !unoDeclared[players[2].id] && (
                <div className="absolute -top-2 -right-3 bg-rose-600 text-white font-mono font-bold text-[7px] px-1 rounded animate-bounce border border-rose-400 uppercase">
                  PING!
                </div>
              )}
            </div>

            {/* Fanning packets card deck */}
            <div className="relative h-10 w-24 flex items-center justify-center">
              {Array.from({ length: Math.min(8, players[2].cards.length) }).map((_, idx) => {
                const style = getFanStyle(idx, Math.min(8, players[2].cards.length), 'top');
                return (
                  <div key={idx} className="absolute" style={style}>
                    <UnoCardComponent card={{} as UnoCard} faceDown={true} size="xs" disabled={true} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-slate-950/40 border border-dashed border-slate-800 p-2 rounded-2xl z-20">
            <span className="text-[8px] font-mono text-slate-500">CLOSED_SOCKET</span>
          </div>
        )}

        {/* ---------- BOT 2: GUEST055985 (RIGHT CENTER) ---------- */}
        {players[3] ? (
          <div className="absolute right-3 sm:right-4 top-[48%] -translate-y-1/2 flex flex-col items-center gap-1.5 z-20">
            {/* Actively spoken quote speech bubble overlay */}
            {activeSpeech[players[3].id] && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white text-slate-850 font-sans font-bold text-[10px] px-2.5 py-1.5 rounded-xl shadow-xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
                {activeSpeech[players[3].id]}
                <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-slate-900 rotate-45" />
              </div>
            )}

            {!activeSpeech[players[3].id] && players[3].statusMsg && currentPlayerIndex === 3 && (
              <div className="absolute -top-10 right-12 bg-slate-950/85 border border-slate-700 text-xs px-2 py-0.5 rounded shadow text-slate-300 font-mono max-w-[130px] truncate">
                {players[3].statusMsg}
              </div>
            )}

            {/* Profile Circle Avatar container with beautiful golden active outline! */}
            <div className={`relative px-1 pb-1 pt-1.5 rounded-2xl border-4 ${
              currentPlayerIndex === 3
                ? 'bg-amber-300 border-slate-900 text-slate-950 shadow-md scale-105'
                : 'bg-emerald-900 border-slate-900 text-white'
            } transition-all flex flex-col items-center w-18 h-18 text-center shadow`}>
              <span className="text-xl leading-none">{players[3].avatar}</span>
              <span className="text-[10px] font-sans font-bold truncate max-w-[62px] mt-1 text-slate-900">
                {players[3].name}
              </span>
              <span className="text-[8px] font-mono font-bold text-emerald-100 bg-slate-950/40 px-1 rounded block mt-0.5">
                {players[3].cards.length} cards
              </span>

              {/* Ping warning logo */}
              {players[3].cards.length === 1 && !unoDeclared[players[3].id] && (
                <div className="absolute -top-2.5 -left-2 bg-rose-600 text-white font-mono font-bold text-[7px] px-1 rounded animate-bounce border border-rose-400 uppercase">
                  PING!
                </div>
              )}
            </div>

            {/* Dynamic Card fan deck rotated outwards */}
            <div className="relative h-14 w-20 flex items-center justify-center">
              {Array.from({ length: Math.min(8, players[3].cards.length) }).map((_, idx) => {
                const style = getFanStyle(idx, Math.min(8, players[3].cards.length), 'right');
                return (
                  <div key={idx} className="absolute" style={style}>
                    <UnoCardComponent card={{} as UnoCard} faceDown={true} size="xs" disabled={true} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="absolute right-4 top-[48%] -translate-y-1/2 flex flex-col items-center gap-1 bg-slate-950/40 border border-dashed border-slate-800 p-3 rounded-2xl z-20">
            <span className="text-[8px] font-mono text-slate-500 uppercase">CLOSED_PORT</span>
          </div>
        )}


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
              className="bg-gradient-to-b from-amber-300 to-amber-500 border-2 border-slate-900 border-b-4 border-b-slate-900 hover:brightness-105 active:border-b-2 active:translate-y-[2px] text-slate-900 rounded-full w-12 h-12 flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0"
            >
              <MessageSquare className="w-6 h-6 text-slate-900" style={{ strokeWidth: 2.5 }} />
            </button>
            <span className="text-[9px] font-mono font-extrabold tracking-wider uppercase text-slate-950 mt-1 select-none">
              Chat
            </span>
          </div>

          {/* ----- BOTTOM CENTER: VAIBHAV PATIL (YOUR HAND) ----- */}
          <div className="pointer-events-auto flex flex-col items-center w-full max-w-[300px] sm:max-w-[440px] md:max-w-[600px] mb-0 relative group z-30">
            
            {/* Actively spoken quote speech bubble overlay */}
            {activeSpeech['human'] && (
              <div className="absolute bottom-[235px] left-1/2 -translate-x-1/2 bg-white text-slate-850 font-sans font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
                {activeSpeech['human']}
                <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r-2 border-b-2 border-slate-900 rotate-45" />
              </div>
            )}

            {/* State instruction header bar */}
            <div className="absolute top-[-70px] left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow backdrop-blur whitespace-nowrap">
              <span className={`w-2.5 h-2.5 rounded-full ${currentPlayerIndex === 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-700'}`} />
              <span className="text-[11px] font-mono text-slate-200">
                {currentPlayerIndex === 0 ? (
                  <span className="text-emerald-400 font-extrabold uppercase">YOUR TURN: POST PACKET SUIT</span>
                ) : (
                  <span className="text-slate-400 font-semibold uppercase">WAITING_ON_OPS...</span>
                )}
              </span>
            </div>

            {/* Hand fanning array viewport container: larger, bottom-aligned, pb-12 creates space for name tag */}
            <div className="relative h-32 sm:h-36 w-full flex items-end justify-center z-10 select-none pb-12">
              {players[0]?.cards?.map((card, idx) => {
                const isPlayable = currentPlayerIndex === 0 && !drawnPlayableCard && canPlayCard(card, topDiscardCard, activeProtocol);
                const fanStyle = getHumanCardStyle(idx, players[0].cards.length);
                return (
                  <div
                    key={card.id}
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
                          if (isPlayable) playCardFromHand(0, card.id);
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {players[0]?.cards?.length === 0 && (
                <div className="w-48 h-20 flex items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-500 font-mono text-xs mb-10">
                  Awaiting connection...
                </div>
              )}
            </div>

            {/* Capsule Name Tag with Active golden ring highlight */}
            <div className={`mt-0 px-4 py-1 rounded-full border-2 relative z-20 ${
              currentPlayerIndex === 0
                ? 'bg-amber-300 border-slate-900 text-slate-950 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            } transition-all duration-200`}>
              <span className="font-sans font-black text-[11px] uppercase tracking-wider block">
                {players[0]?.name || 'Vaibhav Patil'} ({players[0]?.cards?.length || 0} PKTS)
              </span>
            </div>

          </div>

          {/* ----- BOTTOM RIGHT: THE 3D RED "CALL UNO" PUSH-BUTTON ----- */}
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              onClick={handleDeclareUno}
              title="Declare UNO - Left with 1 card!"
              className="group flex flex-col items-center justify-center relative select-none cursor-pointer outline-none active:scale-95 transition-all w-22 h-22 shrink-0 rounded-full"
            >
              {/* Bulky Gray Mount Base collar (representing standard chunky 3D buttons) */}
              <div className="absolute inset-x-0 inset-y-0 bg-[#334155] rounded-full shadow-[0_6px_0_#1e293b,0_10px_20px_rgba(0,0,0,0.5)] border-4 border-slate-800" />
              
              {/* Push cherry red dome */}
              <div className="absolute inset-1 bg-gradient-to-b from-[#f43f5e] via-[#e11d48] to-[#9f1239] rounded-full flex flex-col items-center justify-center select-none active:translate-y-1.5 active:shadow-inner shadow-[inset_0_4px_3px_rgba(255,255,255,0.4)] border border-[#be123c] overflow-hidden z-10 transition-transform">
                {/* Visual gloss reflection curve */}
                <div className="absolute top-1 left-2 w-[70%] h-4 bg-white/20 rounded-[50%] blur-[0.5px]" />
                <span className="text-[10px] font-sans font-bold text-slate-200 leading-none tracking-tight uppercase">
                  CALL
                </span>
                <span className="text-sm font-sans font-black text-white leading-none uppercase tracking-tighter shadow-sm">
                  UNO
                </span>
              </div>
            </button>
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
          <div className="absolute bottom-[72px] left-3 sm:left-4 bg-slate-950/95 border-2 border-slate-800 p-2 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 w-44 max-h-56 overflow-y-auto backdrop-blur-sm pointer-events-auto animate-fade-in">
            <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-850 text-center font-bold">Network Ping Commands</div>
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

        {/* 5. POPUP PROTOCOL COLOR CHOICE DIALOG */}
        <ColorChooserDialog isOpen={isColorChooserOpen} onSelect={resolveWildSelection} />

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
