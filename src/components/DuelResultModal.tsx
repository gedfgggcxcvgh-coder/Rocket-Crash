import React, { useEffect } from 'react';
import { DuelState } from '../types/game';
import { Swords, Trophy, RefreshCw, X, Sparkles, AlertCircle, Coins, ArrowRight } from 'lucide-react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';

interface DuelResultModalProps {
  isOpen: boolean;
  duel: DuelState | null;
  onClose: () => void;
  onRematch: () => void;
  onChangeOpponent: () => void;
}

export const DuelResultModal: React.FC<DuelResultModalProps> = ({
  isOpen,
  duel,
  onClose,
  onRematch,
  onChangeOpponent,
}) => {
  useEffect(() => {
    if (isOpen && duel && duel.status === 'FINISHED' && duel.winner === 'USER') {
      try {
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.5 } });
      } catch {}
    }
  }, [isOpen, duel]);

  if (!isOpen || !duel || duel.status !== 'FINISHED') return null;

  const isUserWinner = duel.winner === 'USER';
  const isOpponentWinner = duel.winner === 'OPPONENT';
  const isDraw = duel.winner === 'DRAW';

  const userM = duel.userMult || 0;
  const oppM = duel.opponentMult || 0;
  const totalPot = duel.wager * 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5 overflow-hidden">
        {/* Top ambient glow */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 ${
            isUserWinner ? 'bg-amber-500' : isOpponentWinner ? 'bg-red-600' : 'bg-blue-500'
          }`}
        />

        {/* Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <Swords className="w-3.5 h-3.5 text-red-400" />
          <span>KẾT QUẢ SOLO 1V1</span>
        </div>

        {/* Main Status Headline */}
        <div>
          {isUserWinner && (
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-1 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-display">
                CHIẾN THẮNG RỰC RỠ!
              </h2>
              <p className="text-xs text-amber-300/90 font-medium">
                Bạn đã áp đảo đối thủ và húp trọn hũ cược!
              </p>
            </div>
          )}

          {isOpponentWinner && (
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 mb-1">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-500 to-red-600 font-display">
                THẤT BẠI TIẾC NUỐI!
              </h2>
              <p className="text-xs text-red-300/90 font-medium">
                {duel.opponentName} đã chốt cược bản lĩnh hơn ở ván này.
              </p>
            </div>
          )}

          {isDraw && (
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 mb-1">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-400 font-display">
                BẮT TAY HÒA CƯỢC!
              </h2>
              <p className="text-xs text-blue-300/90 font-medium">
                Cả hai cùng nổ hoặc đạt chung hệ số. Hoàn trả tiền cược!
              </p>
            </div>
          )}
        </div>

        {/* Versus Cards Comparison */}
        <div className="w-full grid grid-cols-2 gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black text-red-400 shadow-md">
            VS
          </div>

          {/* User Side */}
          <div className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
            isUserWinner ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-900/50 border-slate-800'
          }`}>
            <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wide">Bạn</span>
            <div className="text-lg font-black font-mono-numbers my-1 text-emerald-400">
              {userM > 0 ? `${userM.toFixed(2)}x` : <span className="text-red-500 text-xs">CRASH (0x)</span>}
            </div>
            <span className="text-[10px] text-slate-400">
              Cược: {duel.wager.toLocaleString('vi-VN')} Xu
            </span>
          </div>

          {/* Opponent Side */}
          <div className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
            isOpponentWinner ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-900/50 border-slate-800'
          }`}>
            <div className="flex items-center gap-1.5">
              <img src={duel.opponentAvatar} alt={duel.opponentName} className="w-4 h-4 rounded-full" />
              <span className="text-[11px] font-extrabold text-slate-300 truncate max-w-[90px]">
                {duel.opponentName}
              </span>
            </div>
            <div className="text-lg font-black font-mono-numbers my-1 text-amber-400">
              {oppM > 0 ? `${oppM.toFixed(2)}x` : <span className="text-red-500 text-xs">CRASH (0x)</span>}
            </div>
            <span className="text-[10px] text-slate-400">
              Cược: {duel.wager.toLocaleString('vi-VN')} Xu
            </span>
          </div>
        </div>

        {/* Prize Summary Box */}
        <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-bold">Tổng Thưởng Solo:</span>
          </div>
          <span className={`text-sm font-black font-mono-numbers ${
            isUserWinner ? 'text-amber-400' : isOpponentWinner ? 'text-red-400' : 'text-slate-300'
          }`}>
            {isUserWinner
              ? `+${totalPot.toLocaleString('vi-VN')} Xu`
              : isOpponentWinner
              ? `-${duel.wager.toLocaleString('vi-VN')} Xu`
              : `Hoàn ${duel.wager.toLocaleString('vi-VN')} Xu`}
          </span>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2 pt-1">
          <button
            onClick={() => {
              sounds.playWarpSpeed();
              onRematch();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>TÁI ĐẤU VÁN TIẾP THIÊN CƠ</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onChangeOpponent}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
            >
              Đổi Đối Thủ
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
            >
              Đóng Modal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
