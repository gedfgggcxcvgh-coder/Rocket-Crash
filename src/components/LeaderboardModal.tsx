import React, { useState } from 'react';
import { LeaderboardItem } from '../types/game';
import { Trophy, Crown, Flame, X, Sparkles } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LeaderboardItem[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, items }) => {
  const [activeTab, setActiveTab] = useState<'PROFIT' | 'MULTIPLIER'>('PROFIT');

  if (!isOpen) return null;

  const sortedItems = [...items].sort((a, b) => {
    if (activeTab === 'PROFIT') {
      return b.totalProfit - a.totalProfit;
    }
    return b.highestMultiplier - a.highestMultiplier;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                BẢNG XẾP HẠNG CAO THỦ
              </h2>
              <p className="text-xs text-slate-400">Vinh danh các đại gia gồng lãi khủng nhất server</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('PROFIT')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PROFIT'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Top Lợi Nhuận Khủng</span>
          </button>

          <button
            onClick={() => setActiveTab('MULTIPLIER')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'MULTIPLIER'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Top Hệ Số Cao Nhất</span>
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-2">
          {sortedItems.slice(0, 10).map((item, index) => {
            const rank = index + 1;
            const isTop1 = rank === 1;
            const isTop2 = rank === 2;
            const isTop3 = rank === 3;

            return (
              <div
                key={`${item.id || item.username}-${index}`}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isTop1
                    ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-950/40 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : isTop2
                    ? 'bg-gradient-to-r from-slate-800/40 via-slate-900/20 to-slate-950/40 border-slate-400/50'
                    : isTop3
                    ? 'bg-gradient-to-r from-amber-900/20 via-slate-900/20 to-slate-950/40 border-amber-800/50'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                      isTop1
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                        : isTop2
                        ? 'bg-slate-300 text-slate-950 shadow-md'
                        : isTop3
                        ? 'bg-amber-700 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rank}`}
                  </div>

                  {/* Avatar & User Details */}
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.avatar}
                      alt={item.username}
                      className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{item.username}</span>
                        {item.vipTitle && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            {item.vipTitle}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono-numbers">
                        Hệ số đỉnh nhất: {item.highestMultiplier.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score / Win Amount */}
                <div className="text-right">
                  {activeTab === 'PROFIT' ? (
                    <div>
                      <div className="font-mono-numbers font-black text-amber-400 text-xs">
                        +{item.totalProfit.toLocaleString('vi-VN')}
                      </div>
                      <span className="text-[10px] text-amber-500 font-bold">Xu lãi</span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-mono-numbers font-black text-emerald-400 text-sm">
                        {item.highestMultiplier.toFixed(2)}x
                      </div>
                      <span className="text-[10px] text-emerald-500 font-bold">Gồng đỉnh</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
