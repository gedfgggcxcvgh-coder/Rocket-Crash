import React, { useState } from 'react';
import { UnifiedLeaderboardItem, RankTierId } from '../types/game';
import { calculateRankFromUserStats, calculateRankFromExp, STAR_RANK_CONFIGS } from '../utils/rankSystem';
import {
  Trophy,
  Crown,
  Flame,
  X,
  Sparkles,
  Rocket,
  ShieldCheck,
  Zap,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  Info,
  User,
  Star,
  Swords
} from 'lucide-react';

interface UnifiedLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: UnifiedLeaderboardItem[];
  currentUserExp: number;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
}

export const UnifiedLeaderboardModal: React.FC<UnifiedLeaderboardModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUserExp,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERALL' | 'ROCKET' | 'COMCUT' | 'RANKS'>('OVERALL');

  if (!isOpen) return null;

  const myRank = calculateRankFromExp(currentUserExp);

  // Sorting logic based on active tab
  const sortedItems = [...items].sort((a, b) => {
    if (activeTab === 'OVERALL') {
      // Sort by Rank EXP then Total Profit
      if (b.rankExp !== a.rankExp) return b.rankExp - a.rankExp;
      return b.totalProfit - a.totalProfit;
    }
    if (activeTab === 'ROCKET') {
      // Sort by Rocket Profit or Highest Multiplier
      const profA = a.rocketProfit ?? a.totalProfit;
      const profB = b.rocketProfit ?? b.totalProfit;
      if (profB !== profA) return profB - profA;
      return b.highestMultiplier - a.highestMultiplier;
    }
    if (activeTab === 'COMCUT') {
      // Sort by ComCut Profit then Bao Wins
      const baoA = a.comCutBaoWins || 0;
      const baoB = b.comCutBaoWins || 0;
      const profA = a.comCutProfit ?? (a.totalProfit * 0.5);
      const profB = b.comCutProfit ?? (b.totalProfit * 0.5);
      if (profB !== profA) return profB - profA;
      return baoB - baoA;
    }
    return 0;
  });

  const myStandingIndex = sortedItems.findIndex(i => i.isCurrentUser || i.id === currentUserId);
  const myStanding = myStandingIndex !== -1 ? myStandingIndex + 1 : '-';

  const getRankBadgeClass = (tierId: RankTierId) => {
    switch (tierId) {
      case 'LEGEND':
        return 'bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 text-yellow-300 border-yellow-300/80 shadow-md shadow-yellow-500/20';
      case 'MASTER':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-md shadow-rose-500/20';
      case 'DIAMOND':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-md shadow-purple-500/20';
      case 'PLATINUM':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/20';
      case 'GOLD':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/20';
      case 'SILVER':
        return 'bg-slate-700/40 text-slate-200 border-slate-500/60';
      default:
        return 'bg-amber-900/30 text-amber-500 border-amber-800/60';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-display tracking-tight">
                  BẢNG XẾP HẠNG & CẤP BẬC
                </h2>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40">
                  LIÊN GAME
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Vinh danh cao thủ Tên Lửa Crash & Tài Xỉu Cơm Hay Cứt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User's Personal Rank Snapshot Banner */}
        <div className={`p-3 sm:p-3.5 rounded-2xl border ${myRank.border} bg-slate-950/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg ${myRank.glow}`}>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <img
                src={currentUserAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=You'}
                alt="Avatar"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover bg-slate-800 border-2 border-amber-400/80 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 text-sm">{myRank.icon}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs sm:text-sm truncate">
                  {currentUserName || 'Bạn'}
                </span>
                <span className={`text-[10px] px-2 py-0.2 rounded font-black border ${getRankBadgeClass(myRank.tierId)}`}>
                  {myRank.icon} {myRank.tierName} {myRank.division} ({myRank.starsVisual})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                Cấp {myRank.level} • <span className="text-yellow-400 font-mono-numbers font-bold">{myRank.totalStars} SAO ⭐</span>
                {myRank.perkBonusPercent > 0 && (
                  <span className="ml-1.5 text-emerald-400 font-bold">
                    (+{myRank.perkBonusPercent}% Thưởng Faucet)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar to next rank tier */}
          <div className="flex flex-col items-end w-full sm:w-48 shrink-0">
            <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Hạng server: <strong className="text-amber-400 font-mono font-bold">#{myStanding}</strong></span>
              <span className="font-mono text-slate-300">{myRank.progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${myRank.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Segmented Filter Control */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-2xl shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('OVERALL')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'OVERALL'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="truncate">🏆 Toàn Sàn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROCKET')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ROCKET'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="truncate">🚀 Tên Lửa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMCUT')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'COMCUT'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-xs">🍚</span>
            <span className="truncate">Cơm & Cứt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RANKS')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'RANKS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span className="truncate">👑 Cấp Bậc</span>
          </button>
        </div>

        {/* Content Body */}
        {activeTab === 'RANKS' ? (
          /* Rank Tiers Showcase */
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[460px] custom-scrollbar">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed mb-3">
              <strong className="text-amber-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Cách Tăng Hạng Rank Liên Game:
              </strong>
              Cược và thắng Xu ở cả hai game <strong>Tên Lửa Crash</strong> và <strong>Cơm Hay Cứt</strong> để tích lũy EXP. Thắng Solo 1v1 hoặc trúng Bão x30 sẽ nhận thưởng EXP khổng lồ! Cấp bậc càng cao, quyền lợi nhận Xu miễn phí hàng ngày càng lớn!
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STAR_RANK_CONFIGS.map(tier => {
                const isCurrent = myRank.level === tier.level;
                const isUnlocked = myRank.level >= tier.level;

                return (
                  <div
                    key={`${tier.id}-${tier.level}`}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                      isCurrent
                        ? 'bg-amber-950/30 border-amber-400 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800/80'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{tier.icon}</span>
                        <div>
                          <span className="font-extrabold text-xs text-white">
                            {tier.name} {tier.division}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Cấp {tier.level}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[9px] px-2 py-0.5 rounded font-black bg-amber-500 text-slate-950 uppercase shadow-sm">
                          BẠN ĐANG Ở ĐÂY
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ĐÃ ĐẠT
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-medium">
                          Khóa
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300 font-medium flex items-center justify-between border-t border-slate-800/60 pt-2">
                      <span>Yêu cầu: <strong className="font-mono text-yellow-400 font-semibold">{tier.minStars} SAO ⭐</strong></span>
                      <span className="text-emerald-400 font-bold">+{tier.perkBonusPercent}% Faucet</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Leaderboard Table List */
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px] custom-scrollbar">
            {sortedItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Chưa có dữ liệu xếp hạng. Hãy tham gia cược để xuất hiện tại đây!
              </div>
            ) : (
              sortedItems.slice(0, 15).map((item, index) => {
                const rankNum = index + 1;
                const isTop1 = rankNum === 1;
                const isTop2 = rankNum === 2;
                const isTop3 = rankNum === 3;
                const isMe = item.isCurrentUser || item.id === currentUserId;

                const itemRank = calculateRankFromExp(item.rankExp);

                return (
                  <div
                    key={`${item.id || item.username}-${index}`}
                    className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isMe
                        ? 'bg-amber-950/30 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : isTop1
                        ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-950/40 border-amber-500/60 shadow-md shadow-amber-500/10'
                        : isTop2
                        ? 'bg-gradient-to-r from-slate-800/40 via-slate-900/20 to-slate-950/40 border-slate-400/50'
                        : isTop3
                        ? 'bg-gradient-to-r from-amber-900/20 via-slate-900/20 to-slate-950/40 border-amber-800/50'
                        : 'bg-slate-950/50 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Position + Avatar + Name + Rank Badge */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Rank Position */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                          isTop1
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30'
                            : isTop2
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 shadow-md'
                            : isTop3
                            ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : rankNum}
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={item.avatar}
                          alt={item.username}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover bg-slate-800 border border-slate-700"
                        />
                        {isTop1 && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1" />
                        )}
                      </div>

                      {/* Info & Badges */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[110px] sm:max-w-[160px]">
                            {item.username}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-black">
                              BẠN
                            </span>
                          )}
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-black border ${getRankBadgeClass(itemRank.tierId)}`}>
                            {itemRank.icon} {itemRank.tierName} {itemRank.division}
                          </span>
                        </div>

                        {/* Breakdown tag */}
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                          <span>Cấp {itemRank.level}</span>
                          <span className="text-slate-600">•</span>
                          {activeTab === 'OVERALL' && (
                            <span className="text-amber-400/90 font-mono">
                              {item.rankExp.toLocaleString('vi-VN')} EXP
                            </span>
                          )}
                          {activeTab === 'ROCKET' && (
                            <span className="text-purple-400 font-mono font-semibold">
                              Max {item.highestMultiplier.toFixed(2)}x
                            </span>
                          )}
                          {activeTab === 'COMCUT' && (
                            <span className="text-amber-400 font-mono font-semibold">
                              {item.comCutBaoWins || 0} lần trúng Bão
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Profit & Score */}
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black font-mono-numbers text-amber-400 block">
                        +{item.totalProfit.toLocaleString('vi-VN')} Xu
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.wins} ván thắng
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cập nhật bảng xếp hạng liên game trực tiếp</span>
          </span>
          <span className="text-amber-400 font-semibold font-mono">
            {sortedItems.length} tài khoản xếp hạng
          </span>
        </div>
      </div>
    </div>
  );
};
