import React, { useState } from 'react';
import { PlayerBet } from '../types/game';
import { Users, CheckCircle2, XCircle, User, Crown, Gem, Shield, Zap, Sparkles } from 'lucide-react';

interface LiveBetsListProps {
  players: PlayerBet[];
  currentMultiplier: number;
}

export const LiveBetsList: React.FC<LiveBetsListProps> = ({ players, currentMultiplier }) => {
  const [tab, setTab] = useState<'all' | 'whale' | 'diamond' | 'my'>('all');

  const totalWagered = players.reduce((acc, p) => acc + p.betAmount, 0);
  const cashedOutCount = players.filter(p => p.status === 'WON').length;
  const whaleCount = players.filter(p => p.isWhale || p.betAmount >= 5000000).length;
  const diamondCount = players.filter(p => p.botArchetype === 'DIAMOND').length;

  const displayedPlayers = players.filter(p => {
    if (tab === 'my') return p.isCurrentUser;
    if (tab === 'whale') return p.isWhale || p.betAmount >= 5000000;
    if (tab === 'diamond') return p.botArchetype === 'DIAMOND';
    return true;
  });

  const getBadgeStyle = (badge?: string, archetype?: string, isWhale?: boolean) => {
    if (isWhale || archetype === 'WHALE') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30';
    }
    if (archetype === 'DIAMOND') {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm';
    }
    if (archetype === 'SAFE') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (archetype === 'MARTINGALE') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (archetype === 'ORACLE') {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-slate-200">Phòng Chơi Trực Tiếp</span>
          <span className="text-xs bg-slate-800 text-slate-300 font-mono-numbers px-2 py-0.5 rounded-full">
            {players.length}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono-numbers">
          Tổng cược: <span className="text-amber-400 font-semibold">{totalWagered.toLocaleString('vi-VN')} Xu</span>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl mb-2.5 text-[11px]">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center cursor-pointer ${
            tab === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tất Cả ({players.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('whale')}
          className={`py-1.5 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            tab === 'whale'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <Crown className="w-3 h-3 text-amber-400" />
          <span>Cá Mập ({whaleCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('diamond')}
          className={`py-1.5 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            tab === 'diamond'
              ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-purple-300'
          }`}
        >
          <Gem className="w-3 h-3 text-purple-400" />
          <span>Gồng ({diamondCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('my')}
          className={`py-1.5 px-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            tab === 'my'
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-emerald-300'
          }`}
        >
          <User className="w-3 h-3 text-emerald-400" />
          <span>Của Tôi ({players.filter(p => p.isCurrentUser).length})</span>
        </button>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px] custom-scrollbar">
        {displayedPlayers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {tab === 'my'
              ? 'Bạn chưa đặt cược ván này.'
              : tab === 'whale'
              ? 'Không có cá mập nào tham gia vòng này.'
              : tab === 'diamond'
              ? 'Không có gồng thủ nào trong vòng này.'
              : 'Chưa có người chơi nào tham gia vòng này.'}
          </div>
        ) : (
          displayedPlayers.map(player => {
            const isWon = player.status === 'WON';
            const isLost = player.status === 'LOST';
            const isWhale = player.isWhale || player.betAmount >= 5000000;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all text-xs ${
                  player.isCurrentUser
                    ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/20'
                    : isWhale
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700'
                }`}
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className={`w-7 h-7 rounded-full object-cover bg-slate-800 border ${
                        isWhale ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-slate-700'
                      }`}
                    />
                    {isWhale && (
                      <Crown className="w-3 h-3 text-amber-400 absolute -top-1 -left-1 drop-shadow" />
                    )}
                    {isWon && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full" />
                    )}
                    {isLost && (
                      <XCircle className="w-3.5 h-3.5 text-red-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      <span className="truncate">{player.username}</span>
                      {player.isCurrentUser && (
                        <span className="text-[10px] bg-amber-500/25 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold">
                          BẠN
                        </span>
                      )}
                      {player.badge && !player.isCurrentUser && (
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold border ${getBadgeStyle(
                            player.badge,
                            player.botArchetype,
                            isWhale
                          )}`}
                        >
                          {player.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono-numbers">
                      {player.betAmount.toLocaleString('vi-VN')} Xu
                    </span>
                  </div>
                </div>

                {/* Status / Multiplier / Payout */}
                <div className="text-right shrink-0">
                  {isWon ? (
                    <div className="flex flex-col items-end">
                      <span className="text-emerald-400 font-bold font-mono-numbers">
                        {player.cashoutMultiplier?.toFixed(2)}x
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-400/90 font-mono-numbers">
                        +{(player.winAmount || 0).toLocaleString('vi-VN')} Xu
                      </span>
                    </div>
                  ) : isLost ? (
                    <div className="flex flex-col items-end">
                      <span className="text-red-400 font-bold font-mono-numbers">Nổ</span>
                      <span className="text-[11px] text-red-500 font-mono-numbers">
                        -{player.betAmount.toLocaleString('vi-VN')} Xu
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-amber-400/80 font-bold font-mono-numbers animate-pulse">
                        {currentMultiplier.toFixed(2)}x
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-numbers">
                        {currentMultiplier >= 3.0 && player.botArchetype === 'DIAMOND'
                          ? '💎 Đang gồng căng!'
                          : isWhale
                          ? '🐋 Sóng lớn...'
                          : 'Đang bay...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Đã chốt lời: {cashedOutCount}/{players.length} người</span>
        <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          AI Bots Hoạt Động
        </span>
      </div>
    </div>
  );
};
