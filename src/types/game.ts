export type GamePhase = 'COUNTDOWN' | 'FLYING' | 'CRASHED';

export type FlightMode = 'HIGH_FLYER' | 'MOONSHOT' | 'CLASSIC';

export type BotArchetype = 'DIAMOND' | 'SAFE' | 'WHALE' | 'MARTINGALE' | 'ORACLE';

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
  badgeColor?: string;
  botArchetype?: BotArchetype;
  isWhale?: boolean;
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

export type RankTierId = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'LEGEND';

export interface RankTierInfo {
  id: RankTierId;
  name: string;
  division: string;
  level: number;
  minExp: number;
  maxExp: number;
  icon: string;
  color: string;
  badgeBg: string;
  border: string;
  title: string;
  perkBonusPercent: number;
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
  rankExp?: number;
  rankStars?: number;
  protectionPoints?: number;
  rankLevel?: number;
  rankTier?: RankTierId;
  rocketGames?: number;
  rocketWins?: number;
  rocketProfit?: number;
  comCutGames?: number;
  comCutWins?: number;
  comCutProfit?: number;
  comCutBaoWins?: number;
  duelWins?: number;
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
  opponentTitle?: string;
  opponentDifficulty?: 'DỄ' | 'VỪA' | 'KHÓ' | 'CAO THỦ' | 'ÁC MỘNG';
  opponentQuote?: string;
  wager: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  userMult?: number;
  opponentMult?: number;
  opponentTargetMult?: number;
  opponentCashedOut?: boolean;
  winner?: 'USER' | 'OPPONENT' | 'DRAW';
  resultMessage?: string;
}

export interface UnifiedLeaderboardItem {
  id: string;
  username: string;
  avatar: string;
  totalProfit: number;
  totalWagered?: number;
  highestMultiplier: number;
  wins: number;
  totalGames?: number;
  rocketProfit?: number;
  rocketWins?: number;
  comCutProfit?: number;
  comCutWins?: number;
  comCutBaoWins?: number;
  duelWins?: number;
  rankTier: RankTierId;
  rankLevel: number;
  rankExp: number;
  vipTitle: string;
  badge: string;
  isCurrentUser?: boolean;
  isBot?: boolean;
}

export type LeaderboardItem = UnifiedLeaderboardItem;

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

// Com & Cut Dynamic In-Game Events
export type ComCutEventType =
  | 'GOLDEN_STORM'    // Bão Vàng x35
  | 'RED_ENVELOPE'    // Lì Xì Đại Gia Rơi Bàn Cược
  | 'FORTUNE_SHIELD'  // Khiên Thần Tài Hoàn Cược 50%
  | 'CHICKEN_FEAST'   // Tiệc Cơm Gà x10
  | 'GOLDEN_POOP'     // Cứt Bảo Kim Phát Quang
  | 'LUCKY_FRENZY'    // Giờ Vàng Tỷ Lệ x2.1
  | 'DOUBLE_COM_RAIN' // Mưa Cơm Hải Sản x2.50
  | 'POOP_REVERSAL'   // Bẻ Cầu Thần Thánh +30%
  | 'MYSTERY_LUCKY_WHEEL' // Vòng Quay Bát Quái
  | 'METEOR_JACKPOT'  // Mưa Thiên Thạch Nổ Hũ
  | 'GOD_OF_WEALTH_BLESSING'; // Thần Tài Giáng Lâm +88.888 Xu x2 EXP

export interface ComCutActiveEvent {
  id: string;
  type: ComCutEventType;
  title: string;
  description: string;
  icon: string;
  badge: string;
  color: string;
  bgGradient: string;
  multiplierBoost?: number;
  rewardClaimed?: boolean;
  rewardAmount?: number;
  envelopePos?: { x: number; y: number };
}

// Com & Cut Solo 1v1 Boss & Match System
export type ComCutBossDifficulty = 'DỄ' | 'VỪA' | 'KHÓ' | 'CAO THỦ' | 'ÁC MỘNG';

export interface ComCutBoss {
  id: string;
  name: string;
  avatar: string;
  title: string;
  difficulty: ComCutBossDifficulty;
  quote: string;
  trashTalk: {
    win: string[];
    lose: string[];
    pick: string[];
  };
  recommendedWagers: number[];
  border: string;
  glow: string;
  icon: string;
  preferredSide?: 'COM' | 'CUT' | 'BAO' | 'RANDOM';
}

export interface ComCutDuelMatch {
  active: boolean;
  boss: ComCutBoss;
  wager: number;
  mode: 'QUICK' | 'BO3';
  roundNumber: number;
  userScore: number;
  bossScore: number;
  status: 'CHOOSING' | 'SHAKING' | 'ROUND_OVER' | 'MATCH_OVER';
  userPick?: ComCutBetType;
  bossPick?: ComCutBetType;
  dices?: [number, number, number];
  total?: number;
  outcome?: 'COM' | 'CUT';
  isBao?: boolean;
  roundWinner?: 'USER' | 'BOSS' | 'DRAW';
  matchWinner?: 'USER' | 'BOSS' | 'DRAW';
  message?: string;
}

