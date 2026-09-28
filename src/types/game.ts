export type GamePhase = 'COUNTDOWN' | 'FLYING' | 'CRASHED';

export type FlightMode = 'HIGH_FLYER' | 'MOONSHOT' | 'CLASSIC';

export interface PlayerBet {
  id: string;
  username: string;
  avatar: string;
  betAmount: number;
  cashoutMultiplier?: number;
  status: 'PENDING' | 'FLYING' | 'WON' | 'LOST';
  winAmount?: number;
  isCurrentUser?: boolean;
  vipTitle?: string;
  badge?: string;
  betIndex?: number;
}

export interface SingleBetState {
  betAmount: number;
  autoCashoutEnabled: boolean;
  autoCashoutTarget: number;
  isPlaced: boolean;
  cashedOut: boolean;
  cashoutMultiplier?: number;
}

export interface RoundHistory {
  id: string;
  multiplier: number;
  timestamp: number;
  seed: string;
  hash: string;
  mode?: FlightMode;
}

export interface UserStats {
  balance: number;
  totalGames: number;
  wins: number;
  losses: number;
  totalProfit: number;
  highestMultiplier: number;
  totalWagered: number;
  equippedSkin?: RocketSkinId;
  unlockedSkins?: RocketSkinId[];
  vipTitle?: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  badge?: string;
  vipTitle?: string;
  text: string;
  time: string;
  isSystem?: boolean;
  type?: 'chat' | 'win' | 'crash';
}

export type FlightEventType = 
  | 'WARP_NITRO'       // Tăng tốc phản lực siêu tốc x2
  | 'ALIEN_SHIELD'     // UFO cấp khiên năng lượng bảo hiểm 100% cược nếu nổ
  | 'COSMIC_AIRDROP'   // Rương tiếp tế vũ trụ bay lơ lửng, bấm nhận Xu
  | 'ENGINE_OVERHEAT'  // Cảnh báo quá nhiệt động cơ thót tim
  | 'LUCKY_ENVELOPE';  // Lì xì đại gia rơi lấp lánh

export interface ActiveFlightEvent {
  id: string;
  type: FlightEventType;
  title: string;
  description: string;
  startedAtMultiplier: number;
  durationMs: number;
  expiresAtTimestamp: number;
  rewardClaimed?: boolean;
  rewardAmount?: number;
  targetPos?: { x: number; y: number; size: number };
}

export type RocketSkinId = 'STANDARD' | 'CYBERPUNK' | 'PHOENIX' | 'UFO_ALIEN' | 'DRAGONFIRE';

export interface RocketSkin {
  id: RocketSkinId;
  name: string;
  price: number;
  description: string;
  effectDescription?: string;
  rarity?: 'THƯỜNG' | 'HIẾM' | 'CỰC HIẾM' | 'HUYỀN THOẠI' | 'THẦN THOẠI';
  glowColor?: string;
  icon: string;
  trailColorHex: string[];
  particleColorHex: string[];
}

export interface JackpotInfo {
  pool: number;
  lastWinner?: string;
  lastWinAmount?: number;
  lastWinMultiplier?: number;
  lastWinTime?: number;
}

export interface DuelState {
  active: boolean;
  opponentName: string;
  opponentAvatar: string;
  wager: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  userMult?: number;
  opponentMult?: number;
  opponentTargetMult?: number;
  opponentCashedOut?: boolean;
  winner?: 'USER' | 'OPPONENT' | 'DRAW';
  resultMessage?: string;
}

export interface LeaderboardItem {
  id: string;
  username: string;
  avatar: string;
  totalProfit: number;
  highestMultiplier: number;
  wins: number;
  vipTitle: string;
  badge: string;
}
