import { RankTierId, RankTierInfo } from '../types/game';

export interface CalculatedRank {
  tierId: RankTierId;
  tierName: string;
  division: string;
  level: number;
  currentExp: number;
  minExp: number;
  maxExp: number;
  expInLevel: number;
  expNeededInLevel: number;
  progressPercent: number;
  icon: string;
  color: string;
  badgeBg: string;
  border: string;
  glow: string;
  title: string;
  perkBonusPercent: number;
  dailyBonusAmount: number;
}

export const RANK_TIERS_CONFIG: RankTierInfo[] = [
  {
    id: 'BRONZE',
    name: 'Đồng',
    division: 'I',
    level: 1,
    minExp: 0,
    maxExp: 5000,
    icon: '🥉',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-800/30 text-amber-500 border border-amber-700/50',
    border: 'border-amber-700/60',
    title: 'Tân Binh Vũ Trụ',
    perkBonusPercent: 0,
  },
  {
    id: 'BRONZE',
    name: 'Đồng',
    division: 'II',
    level: 2,
    minExp: 5000,
    maxExp: 15000,
    icon: '🥉',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-800/30 text-amber-500 border border-amber-700/50',
    border: 'border-amber-700/60',
    title: 'Tân Binh Lão Luyện',
    perkBonusPercent: 5,
  },
  {
    id: 'BRONZE',
    name: 'Đồng',
    division: 'III',
    level: 3,
    minExp: 15000,
    maxExp: 30000,
    icon: '🥉',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-800/30 text-amber-500 border border-amber-700/50',
    border: 'border-amber-700/60',
    title: 'Phi Công Tập Sự',
    perkBonusPercent: 10,
  },
  {
    id: 'SILVER',
    name: 'Bạc',
    division: 'I',
    level: 4,
    minExp: 30000,
    maxExp: 50000,
    icon: '🥈',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-700/40 text-slate-200 border border-slate-500/50',
    border: 'border-slate-400/60',
    title: 'Thợ Săn Tên Lửa',
    perkBonusPercent: 15,
  },
  {
    id: 'SILVER',
    name: 'Bạc',
    division: 'II',
    level: 5,
    minExp: 50000,
    maxExp: 80000,
    icon: '🥈',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-700/40 text-slate-200 border border-slate-500/50',
    border: 'border-slate-400/60',
    title: 'Bậc Thầy Lắc Bát',
    perkBonusPercent: 20,
  },
  {
    id: 'SILVER',
    name: 'Bạc',
    division: 'III',
    level: 6,
    minExp: 80000,
    maxExp: 120000,
    icon: '🥈',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-700/40 text-slate-200 border border-slate-500/50',
    border: 'border-slate-400/60',
    title: 'Cao Thủ Cầu Kèo',
    perkBonusPercent: 25,
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'I',
    level: 7,
    minExp: 120000,
    maxExp: 180000,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Bậc Thầy Chốt Lời',
    perkBonusPercent: 30,
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'II',
    level: 8,
    minExp: 180000,
    maxExp: 260000,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Đại Gia Sàn Đấu',
    perkBonusPercent: 35,
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'III',
    level: 9,
    minExp: 260000,
    maxExp: 360000,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Thần Tài Gõ Cửa',
    perkBonusPercent: 40,
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    division: 'VIP',
    level: 10,
    minExp: 360000,
    maxExp: 550000,
    icon: '💠',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-md shadow-cyan-500/20',
    border: 'border-cyan-400',
    title: 'Chiến Hạm Bất Bại',
    perkBonusPercent: 50,
  },
  {
    id: 'DIAMOND',
    name: 'Kim Cương',
    division: 'VIP',
    level: 11,
    minExp: 550000,
    maxExp: 1000000,
    icon: '💎',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/25 text-purple-300 border border-purple-400/60 shadow-lg shadow-purple-500/30',
    border: 'border-purple-400',
    title: 'Gồng Thủ Kim Cương',
    perkBonusPercent: 70,
  },
  {
    id: 'MASTER',
    name: 'Cao Thủ',
    division: 'PRO',
    level: 12,
    minExp: 1000000,
    maxExp: 2000000,
    icon: '👑',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/25 text-rose-300 border border-rose-400/60 shadow-lg shadow-rose-500/30 ring-1 ring-rose-400/40',
    border: 'border-rose-400',
    title: 'Chiến Thần Vũ Trụ',
    perkBonusPercent: 100,
  },
  {
    id: 'LEGEND',
    name: 'Đại Cao Thủ',
    division: 'MYTHIC',
    level: 13,
    minExp: 2000000,
    maxExp: 5000000,
    icon: '🌌',
    color: 'text-yellow-300',
    badgeBg: 'bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 text-yellow-200 border border-yellow-300/80 shadow-xl shadow-yellow-500/40 ring-1 ring-yellow-400/50 animate-pulse',
    border: 'border-yellow-300',
    title: 'Thần Bài Vũ Trụ 👑✨',
    perkBonusPercent: 150,
  },
];

export function calculateRankFromExp(exp: number): CalculatedRank {
  const currentExp = Math.max(0, Math.floor(exp || 0));

  let matchedConfig = RANK_TIERS_CONFIG[0];
  for (let i = 0; i < RANK_TIERS_CONFIG.length; i++) {
    const config = RANK_TIERS_CONFIG[i];
    if (currentExp >= config.minExp) {
      matchedConfig = config;
    } else {
      break;
    }
  }

  const isMaxTier = matchedConfig.level === RANK_TIERS_CONFIG[RANK_TIERS_CONFIG.length - 1].level;
  const expInLevel = currentExp - matchedConfig.minExp;
  const expNeededInLevel = isMaxTier ? matchedConfig.maxExp - matchedConfig.minExp : matchedConfig.maxExp - matchedConfig.minExp;
  const progressPercent = isMaxTier && currentExp >= matchedConfig.maxExp
    ? 100
    : Math.min(100, Math.max(0, Math.floor((expInLevel / expNeededInLevel) * 100)));

  const dailyBonusAmount = 500000 + (500000 * (matchedConfig.perkBonusPercent / 100));

  let glow = 'shadow-slate-800';
  if (matchedConfig.id === 'GOLD') glow = 'shadow-amber-500/20';
  if (matchedConfig.id === 'PLATINUM') glow = 'shadow-cyan-500/25';
  if (matchedConfig.id === 'DIAMOND') glow = 'shadow-purple-500/30';
  if (matchedConfig.id === 'MASTER') glow = 'shadow-rose-500/40';
  if (matchedConfig.id === 'LEGEND') glow = 'shadow-yellow-500/50';

  return {
    tierId: matchedConfig.id,
    tierName: matchedConfig.name,
    division: matchedConfig.division,
    level: matchedConfig.level,
    currentExp,
    minExp: matchedConfig.minExp,
    maxExp: matchedConfig.maxExp,
    expInLevel,
    expNeededInLevel,
    progressPercent,
    icon: matchedConfig.icon,
    color: matchedConfig.color,
    badgeBg: matchedConfig.badgeBg,
    border: matchedConfig.border,
    glow,
    title: matchedConfig.title,
    perkBonusPercent: matchedConfig.perkBonusPercent,
    dailyBonusAmount,
  };
}

// EXP calculations across BOTH games
export function calcRocketBetExp(betAmount: number): number {
  return Math.max(1, Math.floor(betAmount / 1000));
}

export function calcRocketCashoutExp(winAmount: number, multiplier: number): number {
  let exp = Math.max(1, Math.floor(winAmount / 500));
  if (multiplier >= 25.0) exp += 1500;
  else if (multiplier >= 10.0) exp += 600;
  else if (multiplier >= 5.0) exp += 250;
  else if (multiplier >= 3.0) exp += 100;
  return exp;
}

export function calcComCutBetExp(betAmount: number): number {
  return Math.max(1, Math.floor(betAmount / 1000));
}

export function calcComCutWinExp(winAmount: number, isBao: boolean): number {
  let exp = Math.max(1, Math.floor(winAmount / 500));
  if (isBao) exp += 2000; // Bonus massive EXP for hitting Triple/Bão
  return exp;
}

export function calcDuelWinExp(wager: number): number {
  return 500 + Math.floor(wager / 2000);
}
