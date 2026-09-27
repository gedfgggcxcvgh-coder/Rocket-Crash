import React from 'react';
import { UserStats } from '../types/game';
import { Trophy, Award, TrendingUp, DollarSign, X, RotateCcw } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Thống Kê Cá Nhân Của Bạn</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Tổng ván đã chơi
            </span>
            <span className="text-2xl font-bold font-mono-numbers text-white">
              {stats.totalGames}
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Tỷ lệ thắng
            </span>
            <span className="text-2xl font-bold font-mono-numbers text-emerald-400">
              {winRate}%
            </span>
            <span className="text-[10px] text-slate-500">
              {stats.wins} thắng / {stats.losses} thua
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              Lợi nhuận ròng
            </span>
            <span
              className={`text-2xl font-bold font-mono-numbers ${
                stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {stats.totalProfit >= 0 ? '+' : ''}
              {stats.totalProfit.toLocaleString('vi-VN')} Xu
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col">
            <span className="text-slate-400 mb-1 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Kỷ lục chốt cao nhất
            </span>
            <span className="text-2xl font-bold font-mono-numbers text-amber-400">
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
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại thống kê</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
