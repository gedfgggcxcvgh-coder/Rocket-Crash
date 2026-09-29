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
  | 'WARP_NITRO'            // Tăng tốc phản lực siêu tốc x2
  | 'ALIEN_SHIELD'          // UFO cấp khiên năng lượng bảo hiểm 100% cược nếu nổ
  | 'COSMIC_AIRDROP'        // Rương tiếp tế vũ trụ bay lơ lửng, bấm nhận Xu
  | 'ENGINE_OVERHEAT'       // Cảnh báo quá nhiệt động cơ thót tim
  | 'LUCKY_ENVELOPE'        // Lì xì đại gia rơi lấp lánh
  | 'BLACK_HOLE_GRAVITY'    // Lỗ Đen Vũ Trụ: Hút trọng lực & x3 siêu tốc sau thoát hiểm
  | 'COSMIC_JACKPOT_RAIN'   // Mưa Sao Sa Jackpot: Rơi ngôi sao may mắn nhận Xu
  | 'VIP_DIAMOND_CHEST'     // Rương Kim Cương Hoàng Gia: Thưởng Khủng 5K - 15K Xu
  | 'SOLAR_FLARE_BOOST';    // Bão Mặt Trời Bức Phá: Quang phổ bão lửa tăng tốc phi mã

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

export type ComCutPhase = 'BETTING' | 'SHAKING' | 'OPENING' | 'RESULT';
export type ComCutBetType = 'COM' | 'CUT' | 'BAO_COM' | 'BAO_CUT' | 'COM_GA' | 'CUT_RUOI';

export interface ComCutHistoryItem {
  id: string;
  roundNumber: number;
  dices: [number, number, number];
  total: number;
  result: 'COM' | 'CUT';
  isBao: boolean;
  time: string;
}

export interface ComCutBotBet {
  id: string;
  name: string;
  avatar: string;
  side: 'COM' | 'CUT';
  amount: number;
}

export interface ComCutGameState {
  roundNumber: number;
  phase: ComCutPhase;
  timeLeft: number;
  phaseStartTime: number;
  phaseDuration: number;
  dices: [number, number, number];
  diceRotations: [number, number, number];
  outcome: 'COM' | 'CUT';
  total: number;
  isBao: boolean;
  isBaoCom: boolean;
  isBaoCut: boolean;
  poolCom: number;
  poolCut: number;
  countCom: number;
  countCut: number;
  recentLiveBets: ComCutBotBet[];
  history: ComCutHistoryItem[];
  serverTime?: number;
  userBets?: Record<ComCutBetType, number>;
}
