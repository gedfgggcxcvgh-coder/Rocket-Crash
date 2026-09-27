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
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  badge?: string;
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
  // Interactive object coordinates on canvas (normalized 0 to 1)
  targetPos?: { x: number; y: number; size: number };
}
