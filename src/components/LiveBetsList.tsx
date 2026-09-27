import React from 'react';
import { PlayerBet } from '../types/game';
import { Users, CheckCircle2, XCircle } from 'lucide-react';

interface LiveBetsListProps {
  players: PlayerBet[];
  currentMultiplier: number;
}

export const LiveBetsList: React.FC<LiveBetsListProps> = ({ players, currentMultiplier }) => {
  const totalWagered = players.reduce((acc, p) => acc + p.betAmount, 0);
  const cashedOutCount = players.filter(p => p.status === 'WON').length;

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-slate-200">Người chơi trong phòng</span>
          <span className="text-xs bg-slate-800 text-slate-300 font-mono-numbers px-2 py-0.5 rounded-full">
            {players.length}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono-numbers">
          Tổng cược: <span className="text-amber-400 font-semibold">{totalWagered.toLocaleString('vi-VN')} Xu</span>
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
        {players.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Chưa có người chơi nào tham gia vòng này.
          </div>
        ) : (
          players.map(player => {
            const isWon = player.status === 'WON';
            const isLost = player.status === 'LOST';

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all text-xs ${
                  player.isCurrentUser
                    ? 'bg-amber-950/30 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700'
                }`}
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className="w-7 h-7 rounded-full object-cover bg-slate-800 border border-slate-700"
                    />
                    {isWon && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full" />
                    )}
                    {isLost && (
                      <XCircle className="w-3.5 h-3.5 text-red-400 absolute -bottom-1 -right-1 bg-slate-950 rounded-full" />
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      {player.username}
                      {player.isCurrentUser && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-medium">
                          BẠN
                        </span>
                      )}
                    </span>
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
                        {currentMultiplier.toFixed(2)}x...
                      </span>
                      <span className="text-[11px] text-slate-500">Đang bay</span>
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
        <span className="text-slate-500">Mô phỏng sảnh cộng đồng</span>
      </div>
    </div>
  );
};
