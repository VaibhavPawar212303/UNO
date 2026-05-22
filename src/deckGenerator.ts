import { UnoCard, Protocol, CardType } from './types';

// Helper to generate unique IDs
const generateId = () => `card-${Math.random().toString(36).substring(2, 11)}`;

// Preseeded high-quality web URLs categorized by protocols
const PROTOCOL_SITES: Record<Exclude<Protocol, 'wild'>, { domain: string; path: string }[]> = {
  https: [
    { domain: 'google.com', path: '/search' },
    { domain: 'github.com', path: '/trending' },
    { domain: 'youtube.com', path: '/watch' },
    { domain: 'wikipedia.org', path: '/wiki/Internet' },
    { domain: 'netflix.com', path: '/browse' },
    { domain: 'chatgpt.com', path: '/chat' },
    { domain: 'amazon.com', path: '/cart' },
    { domain: 'stripe.com', path: '/v3/checkout' },
    { domain: 'figma.com', path: '/file/design' },
    { domain: 'reddit.com', path: '/r/programming' },
  ],
  http: [
    { domain: 'unsecured-blog.net', path: '/posts/102' },
    { domain: 'legacy-forum.org', path: '/memberlist.php' },
    { domain: 'classic-arcade.com', path: '/play/asteroids' },
    { domain: 'plaintext-auth.co', path: '/login' },
    { domain: 'guestbook-host.net', path: '/sign.cgi' },
    { domain: 'retro-news.info', path: '/headlines' },
    { domain: 'personal-homepage.cz', path: '/index.html' },
    { domain: 'temp-files.is', path: '/download/temp' },
    { domain: 'school-portal.edu', path: '/grades' },
    { domain: 'local-router.test:80', path: '/admin' },
  ],
  ftp: [
    { domain: 'speedtest.tele2.net', path: '/100mb.zip' },
    { domain: 'debian.org', path: '/pub/debian/iso-images' },
    { domain: 'nasa.gov', path: '/shuttle/logs/telemetry' },
    { domain: 'archive.org', path: '/pub/movies/classic' },
    { domain: 'backup-vault.cz', path: '/dumps/db-weekly.sql' },
    { domain: 'leaked-source.is', path: '/database/credentials' },
    { domain: 'university-mirror.edu', path: '/theses/pdf' },
    { domain: 'drivers-host.tw', path: '/nvidia/gpu-drivers.run' },
    { domain: 'oldgames.de', path: '/patches/doom2' },
    { domain: 'seismograph.jp', path: '/raw/earthquake-data' },
  ],
  ws: [
    { domain: 'crypto-ticker.binance', path: '/live-feed' },
    { domain: 'rtm.slack.com', path: '/chat/gateway' },
    { domain: 'gaming-lobby.epic', path: '/matchmaking/v2' },
    { domain: 'stock-feed.nasdaq', path: '/realtime/quotes' },
    { domain: 'canvas.miro.com', path: '/sync/draw' },
    { domain: 'smart-home.local:81', path: '/iot/sensors' },
    { domain: 'notion.so', path: '/docs/live-editing' },
    { domain: 'stream.spotify.com', path: '/audio/playback' },
    { domain: 'odds.draftkings', path: '/live-bets/sports' },
    { domain: 'radar.noaa.gov', path: '/stream/precipitation' },
  ],
};

const WILD_TEMPLATES = [
  { domain: 'localhost:3000', path: '/admin/dashboard' },
  { domain: '127.0.0.1:8080', path: '/dev-console' },
  { domain: '0.0.0.0:5000', path: '/super-gateway' },
];

const WILD_4_TEMPLATES = [
  { domain: 'botnet.cnc', path: '/attack?target=target-ip' },
  { domain: '192.168.1.1', path: '/ping-flood-packet' },
  { domain: 'anonymous-portal.onion', path: '/ddos-amplifier' },
];

// Helper to determine descriptions
function getDescription(protocol: Protocol, type: CardType, val: string | number): string {
  if (type === 'skip') {
    return '404 NOT FOUND: Skips the next server (player) from processing this request.';
  }
  if (type === 'reverse') {
    return '302 REDIRECT: Redirects the game loop in the opposite flow direction.';
  }
  if (type === 'draw2') {
    return '502 BAD GATEWAY: Server overload! Next player must download (draw) 2 packets.';
  }
  if (type === 'wild') {
    return 'DNS REWRITE (*): Map any domain! Set the active protocol address (change suit color).';
  }
  if (type === 'wild4') {
    return 'DDoS ATTACK (+4): Torrential flooding! Change active protocol and force next player to draw 4 packets.';
  }
  return `GET Request: A safe standard packet carrying data value '${val}'.`;
}

// Generate the fully functional deck
export function generateDefaultDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  const protocols: Exclude<Protocol, 'wild'>[] = ['https', 'http', 'ftp', 'ws'];

  protocols.forEach((protocol) => {
    const sites = PROTOCOL_SITES[protocol];

    // Numbers 0-9
    // Standard UNO has 1 of '0', and 2 of each of '1'-'9'
    for (let val = 0; val <= 9; val++) {
      const isZero = val === 0;
      const count = isZero ? 1 : 2;

      for (let c = 0; c < count; c++) {
        // Pick a matching domain/path procedurally or wrap around
        const siteIndex = (val + c * 3) % sites.length;
        const site = sites[siteIndex];
        const formattedUrl = `${protocol}://${site.domain}${site.path}`;

        deck.push({
          id: generateId(),
          protocol,
          type: 'number',
          value: val,
          url: formattedUrl,
          domain: site.domain,
          path: site.path,
          description: getDescription(protocol, 'number', val),
        });
      }
    }

    // Skips (404 Not Found), Reverses (302 Redirect), Draw 2s (502 Bad Gateway)
    // 2 of each per protocol
    for (let c = 0; c < 2; c++) {
      // Skip
      const skipSite = sites[(1 + c * 4) % sites.length];
      deck.push({
        id: generateId(),
        protocol,
        type: 'skip',
        value: '404',
        url: `${protocol}://${skipSite.domain}/404-error`,
        domain: skipSite.domain,
        path: '/404-error',
        description: getDescription(protocol, 'skip', '404'),
      });

      // Reverse
      const revSite = sites[(2 + c * 4) % sites.length];
      deck.push({
        id: generateId(),
        protocol,
        type: 'reverse',
        value: '302',
        url: `${protocol}://${revSite.domain}/302-redirect`,
        domain: revSite.domain,
        path: '/302-redirect',
        description: getDescription(protocol, 'reverse', '302'),
      });

      // Draw 2
      const drawSite = sites[(3 + c * 4) % sites.length];
      deck.push({
        id: generateId(),
        protocol,
        type: 'draw2',
        value: '502',
        url: `${protocol}://${drawSite.domain}/502-bad-gateway`,
        domain: drawSite.domain,
        path: '/502-bad-gateway',
        description: getDescription(protocol, 'draw2', '502'),
      });
    }
  });

  // Wild Cards (4 DNS Wilds)
  for (let c = 0; c < 4; c++) {
    const wildSite = WILD_TEMPLATES[c % WILD_TEMPLATES.length];
    deck.push({
      id: generateId(),
      protocol: 'wild',
      type: 'wild',
      value: '*',
      url: `http://${wildSite.domain}${wildSite.path}`,
      domain: wildSite.domain,
      path: wildSite.path,
      description: getDescription('wild', 'wild', '*'),
    });
  }

  // Wild Draw 4 Cards (4 DDoS Attack)
  for (let c = 0; c < 4; c++) {
    const ddosSite = WILD_4_TEMPLATES[c % WILD_4_TEMPLATES.length];
    deck.push({
      id: generateId(),
      protocol: 'wild',
      type: 'wild4',
      value: 'DDoS',
      url: `http://${ddosSite.domain}${ddosSite.path}`,
      domain: ddosSite.domain,
      path: ddosSite.path,
      description: getDescription('wild', 'wild4', 'DDoS'),
    });
  }

  return deck;
}

// Parses raw user text into dynamic UNO cards
export function parseUserUrls(inputText: string): UnoCard[] {
  if (!inputText.trim()) return [];

  const lines = inputText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const parsedCards: UnoCard[] = [];

  const cardTypes: CardType[] = ['number', 'number', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];

  lines.forEach((line, index) => {
    let protocol: Protocol = 'https';
    let domain = 'custom-site.com';
    let path = '/page';
    let type: CardType = cardTypes[index % cardTypes.length];
    let value: number | string = index % 10;

    try {
      // Try to parse as real URL
      const urlString = line.startsWith('http') ? line : `https://${line}`;
      const parsed = new URL(urlString);
      
      const parsedProto = parsed.protocol.replace(':', '');
      if (['https', 'http', 'ftp', 'ws'].includes(parsedProto)) {
        protocol = parsedProto as Protocol;
      }
      domain = parsed.hostname;
      path = parsed.pathname;
      if (parsed.search) path += parsed.search;
    } catch {
      // Fallback if not a perfectly formatted URL
      domain = line.split('/')[0] || 'custom-domain';
      path = line.substring(domain.length) || '/index';
    }

    // Set value and type depending on round-robin assignment
    if (type === 'skip') {
      value = '404';
    } else if (type === 'reverse') {
      value = '302';
    } else if (type === 'draw2') {
      value = '502';
    } else if (type === 'wild') {
      protocol = 'wild';
      value = '*';
    } else if (type === 'wild4') {
      protocol = 'wild';
      value = 'DDoS';
    }

    parsedCards.push({
      id: generateId(),
      protocol,
      type,
      value,
      url: line,
      domain,
      path,
      description: getDescription(protocol, type, value),
    });
  });

  return parsedCards;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: UnoCard[]): UnoCard[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = newDeck[i];
    newDeck[i] = newDeck[j];
    newDeck[j] = temp;
  }
  return newDeck;
}

// Matching checker based on URL UNO parameters
export function canPlayCard(card: UnoCard, topCard: UnoCard, activeProtocol: Protocol): boolean {
  // Wildcards can be played anytime on anything
  if (card.protocol === 'wild') return true;

  // Standard checks:
  // 1. Matches active protocol (color)
  if (card.protocol === activeProtocol) return true;

  // 2. Matches action/type/number value
  if (card.type === topCard.type && card.value === topCard.value) return true;

  // 3. SPECIAL DOMAIN MATCHING: For URL flavor, if the hostname domains match (e.g., both are stripe.com cards)
  if (card.domain !== '' && card.domain === topCard.domain) return true;

  // Otherwise, cannot play
  return false;
}
