import { RankTierId, RankTierInfo } from '../types/game';

export interface CalculatedRank {
  tierId: RankTierId;
  tierName: string;
  division: string;
  level: number;
  totalStars: number;
  starsInDivision: number;
  starsNeededInDivision: number;
  progressPercent: number;
  starsVisual: string;
  icon: string;
  color: string;
  badgeBg: string;
  border: string;
  glow: string;
  title: string;
  perkBonusPercent: number;
  dailyBonusAmount: number;
  protectionPoints: number; // 0 - 100 (Điểm bảo hiểm rank)
}

export interface StarRankConfig {
  id: RankTierId;
  name: string;
  division: string;
  level: number;
  minStars: number;
  maxStars: number;
  starsInRank: number;
  icon: string;
  color: string;
  badgeBg: string;
  border: string;
  title: string;
  perkBonusPercent: number;
}

export const STAR_RANK_CONFIGS: StarRankConfig[] = [
  // 🥉 ĐỒNG (Bronze) - 3 Hạng, 3 Sao / Hạng
  {
    id: 'BRONZE',
    name: 'Đồng',
    division: 'III',
    level: 1,
    minStars: 0,
    maxStars: 2,
    starsInRank: 3,
    icon: '🥉',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-900/40 text-amber-500 border border-amber-700/60',
    border: 'border-amber-700',
    title: 'Tân Binh Vũ Trụ',
    perkBonusPercent: 0,
  },
  {
    id: 'BRONZE',
    name: 'Đồng',
    division: 'II',
    level: 2,
    minStars: 3,
    maxStars: 5,
    starsInRank: 3,
    icon: '🥉',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-900/40 text-amber-500 border border-amber-700/60',
    border: 'border-amber-700',
    title: 'Tân Binh Lão Luyện',
    perkBonusPercent: 5,
  },
  {
    id: 'BRONZE',
    name: 'Đồng',
    division: 'I',
    level: 3,
    minStars: 6,
    maxStars: 8,
    starsInRank: 3,
    icon: '🥉',
    color: 'text-amber-600',
    badgeBg: 'bg-amber-900/40 text-amber-500 border border-amber-700/60',
    border: 'border-amber-700',
    title: 'Phi Công Tập Sự',
    perkBonusPercent: 10,
  },

  // 🥈 BẠC (Silver) - 3 Hạng, 3 Sao / Hạng
  {
    id: 'SILVER',
    name: 'Bạc',
    division: 'III',
    level: 4,
    minStars: 9,
    maxStars: 11,
    starsInRank: 3,
    icon: '🥈',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-800/60 text-slate-200 border border-slate-500/60',
    border: 'border-slate-400',
    title: 'Thợ Săn Tên Lửa',
    perkBonusPercent: 15,
  },
  {
    id: 'SILVER',
    name: 'Bạc',
    division: 'II',
    level: 5,
    minStars: 12,
    maxStars: 14,
    starsInRank: 3,
    icon: '🥈',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-800/60 text-slate-200 border border-slate-500/60',
    border: 'border-slate-400',
    title: 'Bậc Thầy Lắc Bát',
    perkBonusPercent: 20,
  },
  {
    id: 'SILVER',
    name: 'Bạc',
    division: 'I',
    level: 6,
    minStars: 15,
    maxStars: 17,
    starsInRank: 3,
    icon: '🥈',
    color: 'text-slate-300',
    badgeBg: 'bg-slate-800/60 text-slate-200 border border-slate-500/60',
    border: 'border-slate-400',
    title: 'Cao Thủ Cầu Kèo',
    perkBonusPercent: 25,
  },

  // 🥇 VÀNG (Gold) - 4 Hạng, 4 Sao / Hạng
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'IV',
    level: 7,
    minStars: 18,
    maxStars: 21,
    starsInRank: 4,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Bậc Thầy Chốt Lời',
    perkBonusPercent: 30,
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'III',
    level: 8,
    minStars: 22,
    maxStars: 25,
    starsInRank: 4,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Đại Gia Sàn Đấu',
    perkBonusPercent: 35,
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'II',
    level: 9,
    minStars: 26,
    maxStars: 29,
    starsInRank: 4,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Thần Tài Gõ Cửa',
    perkBonusPercent: 40,
  },
  {
    id: 'GOLD',
    name: 'Vàng',
    division: 'I',
    level: 10,
    minStars: 30,
    maxStars: 33,
    starsInRank: 4,
    icon: '🥇',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-amber-500/20',
    border: 'border-amber-400',
    title: 'Vua Bát Vàng 👑',
    perkBonusPercent: 45,
  },

  // 💠 BẠCH KIM (Platinum) - 4 Hạng, 4 Sao / Hạng
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    division: 'IV',
    level: 11,
    minStars: 34,
    maxStars: 37,
    starsInRank: 4,
    icon: '💠',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-cyan-500/20',
    border: 'border-cyan-400',
    title: 'Chiến Hạm Bất Bại',
    perkBonusPercent: 55,
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    division: 'III',
    level: 12,
    minStars: 38,
    maxStars: 41,
    starsInRank: 4,
    icon: '💠',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-cyan-500/20',
    border: 'border-cyan-400',
    title: 'Siêu Cấp Thắng Cầu',
    perkBonusPercent: 60,
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    division: 'II',
    level: 13,
    minStars: 42,
    maxStars: 45,
    starsInRank: 4,
    icon: '💠',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-cyan-500/20',
    border: 'border-cyan-400',
    title: 'Thánh Bẻ Cầu Bệt',
    perkBonusPercent: 65,
  },
  {
    id: 'PLATINUM',
    name: 'Bạch Kim',
    division: 'I',
    level: 14,
    minStars: 46,
    maxStars: 49,
    starsInRank: 4,
    icon: '💠',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-cyan-500/20',
    border: 'border-cyan-400',
    title: 'Bạch Kim Huyền Thoại 💠✨',
    perkBonusPercent: 70,
  },

  // 💎 KIM CƯƠNG (Diamond) - 5 Hạng, 5 Sao / Hạng
  {
    id: 'DIAMOND',
    name: 'Kim Cương',
    division: 'V',
    level: 15,
    minStars: 50,
    maxStars: 54,
    starsInRank: 5,
    icon: '💎',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/25 text-purple-300 border border-purple-400/70 shadow-purple-500/30',
    border: 'border-purple-400',
    title: 'Gồng Thủ Kim Cương',
    perkBonusPercent: 80,
  },
  {
    id: 'DIAMOND',
    name: 'Kim Cương',
    division: 'I',
    level: 16,
    minStars: 55,
    maxStars: 74,
    starsInRank: 5,
    icon: '💎',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/25 text-purple-300 border border-purple-400/70 shadow-purple-500/30',
    border: 'border-purple-400',
    title: 'Đỉnh Phong Kim Cương 💎✨',
    perkBonusPercent: 90,
  },

  // 👑 CAO THỦ (Master)
  {
    id: 'MASTER',
    name: 'Cao Thủ',
    division: 'PRO',
    level: 17,
    minStars: 75,
    maxStars: 124,
    starsInRank: 50,
    icon: '👑',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/25 text-rose-300 border border-rose-400/80 shadow-rose-500/40 ring-1 ring-rose-400/50',
    border: 'border-rose-400',
    title: 'Chiến Thần Vũ Trụ 👑',
    perkBonusPercent: 120,
  },

  // 🏆 THÁCH ĐẤU (Legend)
  {
    id: 'LEGEND',
    name: 'Thách Đấu',
    division: 'TOP 50',
    level: 18,
    minStars: 125,
    maxStars: 99999,
    starsInRank: 999,
    icon: '🌌',
    color: 'text-yellow-300',
    badgeBg: 'bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 text-yellow-200 border border-yellow-300/90 shadow-yellow-500/50 ring-1 ring-yellow-400/60 animate-pulse',
    border: 'border-yellow-300',
    title: 'Thần Bài Vũ Trụ 👑✨',
    perkBonusPercent: 180,
  },
];

// Main 5v5 MOBA Star Rank Calculator
export function calculateRankFromStars(stars: number, protectionPoints: number = 0): CalculatedRank {
  const totalStars = Math.max(0, Math.floor(stars || 0));

  let matched = STAR_RANK_CONFIGS[0];
  for (let i = 0; i < STAR_RANK_CONFIGS.length; i++) {
    if (totalStars >= STAR_RANK_CONFIGS[i].minStars) {
      matched = STAR_RANK_CONFIGS[i];
    } else {
      break;
    }
  }

  const isMasterOrLegend = matched.id === 'MASTER' || matched.id === 'LEGEND';
  const starsInDivision = isMasterOrLegend
    ? totalStars - matched.minStars
    : totalStars - matched.minStars;

  const starsNeededInDivision = matched.starsInRank;

  // Build star visual representation (e.g. ⭐⭐⭐☆☆ or ⭐x15)
  let starsVisual = '';
  if (isMasterOrLegend) {
    starsVisual = `⭐x${starsInDivision}`;
  } else {
    const filled = Math.min(starsNeededInDivision, Math.max(0, starsInDivision));
    const empty = Math.max(0, starsNeededInDivision - filled);
    starsVisual = '⭐'.repeat(filled) + '☆'.repeat(empty);
  }

  const progressPercent = isMasterOrLegend
    ? 100
    : Math.min(100, Math.max(0, Math.floor((starsInDivision / starsNeededInDivision) * 100)));

  const dailyBonusAmount = 500000 + 500000 * (matched.perkBonusPercent / 100);

  let glow = 'shadow-slate-800';
  if (matched.id === 'GOLD') glow = 'shadow-amber-500/30';
  if (matched.id === 'PLATINUM') glow = 'shadow-cyan-500/30';
  if (matched.id === 'DIAMOND') glow = 'shadow-purple-500/40';
  if (matched.id === 'MASTER') glow = 'shadow-rose-500/50';
  if (matched.id === 'LEGEND') glow = 'shadow-yellow-500/60';

  return {
    tierId: matched.id,
    tierName: matched.name,
    division: matched.division,
    level: matched.level,
    totalStars,
    starsInDivision,
    starsNeededInDivision,
    progressPercent,
    starsVisual,
    icon: matched.icon,
    color: matched.color,
    badgeBg: matched.badgeBg,
    border: matched.border,
    glow,
    title: matched.title,
    perkBonusPercent: matched.perkBonusPercent,
    dailyBonusAmount,
    protectionPoints: Math.min(100, Math.max(0, protectionPoints)),
  };
}

export function calculateRankFromUserStats(stats: Partial<{ rankStars?: number; rankExp?: number; protectionPoints?: number }>): CalculatedRank {
  const stars = typeof stats?.rankStars === 'number'
    ? stats.rankStars
    : Math.floor((stats?.rankExp || 1000) / 1000);
  const prot = stats?.protectionPoints || 0;
  return calculateRankFromStars(stars, prot);
}

// Backward compatibility helpers
export function calculateRankFromExp(exp: number, protectionPoints: number = 0): CalculatedRank {
  const stars = Math.floor((exp || 1000) / 1000);
  return calculateRankFromStars(stars, protectionPoints);
}

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
  if (isBao) exp += 2000;
  return exp;
}

export function calcDuelWinExp(wager: number): number {
  return 500 + Math.floor(wager / 2000);
}

// MOBA Star Earn / Lose Logic
export function processStarResult(
  currentStars: number,
  isWin: boolean,
  streakCount: number = 0,
  isBigWin: boolean = false,
  protectionPoints: number = 0
): { nextStars: number; nextProtection: number; starChange: number; protectionUsed: boolean; promoted: boolean } {
  let stars = Math.max(0, currentStars || 0);
  let prot = Math.min(100, Math.max(0, protectionPoints || 0));
  let change = 0;
  let protectionUsed = false;

  const oldRank = calculateRankFromStars(stars, prot);

  if (isWin) {
    let earned = 1;
    // Win streak bonus
    if (streakCount >= 3) earned += 1;
    // Big win bonus (e.g., 10x or Bão)
    if (isBigWin) earned += 1;

    stars += earned;
    change = earned;
    prot = Math.min(100, prot + 15); // Add protection points on win
  } else {
    // Loss
    if (prot >= 100) {
      // Protection active! Keep stars, consume protection points
      prot = 0;
      protectionUsed = true;
      change = 0;
    } else {
      // Lose 1 star, unless at 0 stars in Bronze III
      if (stars > 0) {
        stars -= 1;
        change = -1;
      }
      prot = Math.min(100, prot + 5);
    }
  }

  const newRank = calculateRankFromStars(stars, prot);
  const promoted = newRank.level > oldRank.level;

  return {
    nextStars: stars,
    nextProtection: prot,
    starChange: change,
    protectionUsed,
    promoted,
  };
}
