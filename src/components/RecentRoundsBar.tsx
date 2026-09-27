import React from 'react';
import { RoundHistory } from '../types/game';
import { ShieldCheck } from 'lucide-react';

interface RecentRoundsBarProps {
  history: RoundHistory[];
  onSelectRound: (round: RoundHistory) => void;
}

export const RecentRoundsBar: React.FC<RecentRoundsBarProps> = ({ history, onSelectRound }) => {
  const getBadgeStyle = (multiplier: number) => {
    if (multiplier < 1.5) {
      return 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700';
    }
    if (multiplier < 2.0) {
      return 'bg-blue-950/60 text-blue-400 border-blue-800/40 hover:border-blue-700';
    }
    if (multiplier < 10.0) {
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40 hover:border-emerald-700';
    }
    return 'bg-amber-950/70 text-amber-300 border-amber-600/50 shadow-sm shadow-amber-500/20 hover:border-amber-400';
  };

  return (
    <div className="w-full flex items-center justify-between gap-3 py-2 px-1">
      <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-400">
        <span>Lịch sử gần đây:</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
        {history.length === 0 ? (
          <span className="text-xs text-slate-500 italic">Đang ghi nhận vòng đấu đầu tiên...</span>
        ) : (
          history.slice(0, 16).map(round => (
            <button
              key={round.id}
              onClick={() => onSelectRound(round)}
              title={`Vòng #${round.id.slice(-4)}: Click để kiểm tra tính công bằng`}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono-numbers whitespace-nowrap transition-all duration-150 cursor-pointer ${getBadgeStyle(
                round.multiplier
              )}`}
            >
              {round.multiplier.toFixed(2)}x
            </button>
          ))
        )}
      </div>

      <button
        onClick={() => history[0] && onSelectRound(history[0])}
        className="hidden md:flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors shrink-0 ml-auto"
        title="Kiểm tra tính minh bạch (Provably Fair)"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Minh bạch</span>
      </button>
    </div>
  );
};
