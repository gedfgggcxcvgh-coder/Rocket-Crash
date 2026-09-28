import React from 'react';
import { DuelState, GamePhase } from '../types/game';
import { Swords, RefreshCw, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DuelBannerProps {
  duel: DuelState;
  currentMultiplier: number;
  phase: GamePhase;
  userCashedOut: boolean;
  userCashoutMultiplier?: number;
  onRematch: () => void;
  onClose: () => void;
}

export const DuelBanner: React.FC<DuelBannerProps> = ({
  duel,
  currentMultiplier,
  phase,
  userCashedOut,
  userCashoutMultiplier,
  onRematch,
  onClose,
}) => {
  // User live status calculation
  let userDisplayMult = '0.00x';
  let userSubtext = 'Chưa cược';
  let userColorClass = 'text-slate-400';

  if (userCashedOut || (duel.status === 'FINISHED' && duel.userMult !== undefined && duel.userMult > 0)) {
    const val = userCashoutMultiplier || duel.userMult || 0;
    userDisplayMult = `${val.toFixed(2)}x`;
    userSubtext = 'Đã Chốt';
    userColorClass = 'text-emerald-400 font-extrabold';
  } else if (phase === 'FLYING' && duel.status === 'PLAYING') {
    userDisplayMult = `${currentMultiplier.toFixed(2)}x`;
    userSubtext = 'Đang Bay 🔥';
    userColorClass = 'text-emerald-400 font-black animate-pulse';
  } else if (duel.status === 'FINISHED') {
    const val = duel.userMult || 0;
    userDisplayMult = val > 0 ? `${val.toFixed(2)}x` : '0.00x';
    userSubtext = val > 0 ? 'Đã Chốt' : 'Nổ (0x)';
    userColorClass = val > 0 ? 'text-emerald-400' : 'text-red-400';
  } else if (phase === 'COUNTDOWN') {
    userDisplayMult = '1.00x';
    userSubtext = 'Chuẩn bị...';
    userColorClass = 'text-slate-300';
  }

  // Opponent live status calculation
  let oppDisplayMult = '0.00x';
  let oppSubtext = 'Chưa cược';
  let oppColorClass = 'text-slate-400';

  if (duel.opponentCashedOut) {
    const val = duel.opponentMult || 0;
    oppDisplayMult = `${val.toFixed(2)}x`;
    oppSubtext = 'Đã Chốt';
    oppColorClass = 'text-amber-400 font-extrabold';
  } else if (phase === 'FLYING' && duel.status === 'PLAYING') {
    oppDisplayMult = `${currentMultiplier.toFixed(2)}x`;
    oppSubtext = 'Đang Gồng...';
    oppColorClass = 'text-amber-400 font-black animate-pulse';
  } else if (duel.status === 'FINISHED') {
    const val = duel.opponentMult || 0;
    oppDisplayMult = val > 0 ? `${val.toFixed(2)}x` : '0.00x';
    oppSubtext = val > 0 ? 'Đã Chốt' : 'Nổ (0x)';
    oppColorClass = val > 0 ? 'text-amber-400' : 'text-red-400';
  } else if (phase === 'COUNTDOWN') {
    oppDisplayMult = '1.00x';
    oppSubtext = 'Chuẩn bị...';
    oppColorClass = 'text-slate-300';
  }

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

      {/* VS Comparison (Live Animated) */}
      <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-xl px-5 py-2 shrink-0">
        {/* User */}
        <div className="flex flex-col items-center min-w-[70px]">
          <span className="text-[10px] font-bold text-slate-400">Bạn</span>
          <span className={`text-sm font-black font-mono-numbers my-0.5 ${userColorClass}`}>
            {userDisplayMult}
          </span>
          <span className="text-[9px] font-medium text-slate-400">
            {userSubtext}
          </span>
        </div>

        <span className="text-red-500 font-black text-xs px-1">VS</span>

        {/* Opponent */}
        <div className="flex flex-col items-center min-w-[80px]">
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
          <span className={`text-sm font-black font-mono-numbers my-0.5 ${oppColorClass}`}>
            {oppDisplayMult}
          </span>
          <span className="text-[9px] font-medium text-slate-400">
            {oppSubtext}
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
