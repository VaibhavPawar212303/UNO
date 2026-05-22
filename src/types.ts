export type Protocol = 'https' | 'http' | 'ftp' | 'ws' | 'wild';

export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  id: string;
  protocol: Protocol; // replaces UNO color: 'https' = Red, 'http' = Blue, 'ftp' = Green, 'ws' = Yellow, 'wild' = Wild
  type: CardType;    // replaces UNO card type
  value: number | string; // e.g., 0-9, "404", "302", "502", "*", "DDoS"
  url: string;        // Visual URL shown on card (e.g. "https://google.com/search")
  domain: string;     // Parsed domain name (e.g., "google.com")
  path: string;       // Parsed path (e.g., "/search")
  description: string;// Meaningful or funny message explaining card mechanics
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  cards: UnoCard[];
  avatar: string; // Emoji character/avatar
  statusMsg: string; // Speech bubble or subtext (e.g. "My turn!", "Uno!")
  analytics: {
    cardsPlayed: number;
    cardsDrawn: number;
    skipsReceived: number;
  };
}

export interface GameLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'success' | 'danger' | 'system';
  message: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  discardPile: UnoCard[];
  drawPile: UnoCard[];
  gameDirection: 'clockwise' | 'counter-clockwise';
  activeProtocol: Protocol; // The currently active color/protocol in play
  status: 'setup' | 'playing' | 'game-over';
  winnerId: string | null;
  unoDeclared: { [playerId: string]: boolean };
  logs: GameLog[];
  botSpeedMs: number;
  customUrlsInput: string;
  activeTurnHistory: string[]; // logs for current round
}
