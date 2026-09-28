import React from 'react';
import { DuelState } from '../types/game';
import { Swords, Trophy, RefreshCw, X, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DuelBannerProps {
  duel: DuelState;
  onRematch: () => void;
  onClose: () => void;
}

export const DuelBanner: React.FC<DuelBannerProps> = ({ duel, onRematch, onClose }) => {
  return (
    <div className="w-full bg-gradient-to-r from-red-950/90 via-slate-900/95 to-red-950/90 border border-red-500/60 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
      {/* Matchup Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 shrink-0">
          <Swords className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-xs uppercase tracking-wide">
              SOLO 1V1 CHIẾM NGAI
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Tổng Hũ: {(duel.wager * 2).toLocaleString('vi-VN')} Xu
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">
            {duel.status === 'WAITING' && 'Đang chờ ván bay tiếp theo...'}
            {duel.status === 'PLAYING' && 'Ván đấu đang diễn ra! Ai gồng hệ số cao hơn sẽ húp hũ!'}
            {duel.status === 'FINISHED' && (duel.resultMessage || 'Kết quả trận đấu')}
          </p>
        </div>
      </div>

      {/* VS Comparison */}
      <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-1.5 shrink-0">
        {/* User */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400">Bạn</span>
          <span className="text-xs font-black font-mono-numbers text-emerald-400">
            {duel.userMult ? `${duel.userMult.toFixed(2)}x` : '0.00x'}
          </span>
        </div>

        <span className="text-red-500 font-black text-xs">VS</span>

        {/* Opponent */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <img
              src={duel.opponentAvatar}
              alt={duel.opponentName}
              className="w-3.5 h-3.5 rounded-full object-cover"
            />
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">
              {duel.opponentName}
            </span>
          </div>
          <span className="text-xs font-black font-mono-numbers text-amber-400">
            {duel.opponentCashedOut
              ? `${duel.opponentMult?.toFixed(2)}x`
              : duel.status === 'FINISHED'
              ? `${duel.opponentMult?.toFixed(2) || '0.00'}x`
              : 'Đang gồng...'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {duel.status === 'FINISHED' && (
          <button
            onClick={() => {
              sounds.playWarpSpeed();
              onRematch();
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs transition-all active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Đấu Lại</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
