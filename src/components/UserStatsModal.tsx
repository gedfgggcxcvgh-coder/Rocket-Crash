import React from 'react';
import { UserStats } from '../types/game';
import { Trophy, Award, TrendingUp, DollarSign, X, RotateCcw, Rocket, Sparkles, ShieldCheck } from 'lucide-react';
import { calculateRankFromExp } from '../utils/rankSystem';

interface UserStatsModalProps {
  stats: UserStats;
  isOpen: boolean;
  onClose: () => void;
  onResetStats: () => void;
}

export const UserStatsModal: React.FC<UserStatsModalProps> = ({
  stats,
  isOpen,
  onClose,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const winRate = stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : '0.0';
  const rank = calculateRankFromExp(stats.rankExp || 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Thống Kê & Cấp Bậc Cá Nhân</h3>
              <p className="text-xs text-slate-400">Dữ liệu tổng hợp từ cả hai trò chơi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rank Banner */}
        <div className={`p-4 rounded-2xl border ${rank.border} bg-slate-950/80 flex flex-col gap-2.5 shadow-lg ${rank.glow}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{rank.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black uppercase ${rank.color}`}>
                    {rank.tierName} {rank.division}
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded font-bold bg-slate-800 text-slate-300">
                    Cấp {rank.level}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{rank.title}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-amber-400 block">
                {rank.currentExp.toLocaleString('vi-VN')} EXP
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                +{rank.perkBonusPercent}% Thưởng Faucet
              </span>
            </div>
          </div>

          {/* EXP Progress Bar */}
          <div className="w-full">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
              <span>Tiến trình thăng cấp</span>
              <span>{rank.progressPercent}% ({rank.expInLevel.toLocaleString('vi-VN')} / {rank.expNeededInLevel.toLocaleString('vi-VN')} EXP)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                style={{ width: `${rank.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1 text-[11px]">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Tổng ván đã chơi
            </span>
            <span className="text-xl font-bold font-mono-numbers text-white">
              {stats.totalGames}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1 text-[11px]">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Tỷ lệ thắng
            </span>
            <span className="text-xl font-bold font-mono-numbers text-emerald-400">
              {winRate}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {stats.wins} thắng / {stats.losses} thua
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1 text-[11px]">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              Lợi nhuận ròng
            </span>
            <span
              className={`text-xl font-bold font-mono-numbers ${
                stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {stats.totalProfit >= 0 ? '+' : ''}
              {stats.totalProfit.toLocaleString('vi-VN')} Xu
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1 text-[11px]">
              <Rocket className="w-3.5 h-3.5 text-purple-400" />
              Hệ số cao nhất (Rocket)
            </span>
            <span className="text-xl font-bold font-mono-numbers text-amber-400">
              {stats.highestMultiplier > 0 ? `${stats.highestMultiplier.toFixed(2)}x` : '-'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-400">
          <span>Tổng số tiền đã đặt cược:</span>
          <span className="font-mono-numbers font-bold text-white">
            {stats.totalWagered.toLocaleString('vi-VN')} Xu
          </span>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onResetStats}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại thống kê</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
