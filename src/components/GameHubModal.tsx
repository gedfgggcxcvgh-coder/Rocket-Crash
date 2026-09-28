import React from 'react';
import { X, Rocket, Sparkles, Flame, CheckCircle, ChevronRight, Swords, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/audio';

interface GameHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGame: 'ROCKET' | 'COM_CUT';
  onSelectGame: (game: 'ROCKET' | 'COM_CUT') => void;
  balance: number;
}

export const GameHubModal: React.FC<GameHubModalProps> = ({
  isOpen,
  onClose,
  activeGame,
  onSelectGame,
  balance,
}) => {
  if (!isOpen) return null;

  const handleChoose = (game: 'ROCKET' | 'COM_CUT') => {
    sounds.playClick();
    onSelectGame(game);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[10005] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200"
    >
      {/* Quick exit pill button at top right */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-rose-900/80 border border-slate-600 hover:border-rose-400 text-white font-bold text-xs flex items-center gap-1 shadow-2xl cursor-pointer active:scale-95 transition-all"
      >
        ✕ Đóng
      </button>

      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 max-w-xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md">
              ☰
            </div>
            <div>
              <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-1.5 uppercase tracking-wide">
                <span>Chọn Trò Chơi</span>
                <span className="text-[10px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                  GAME HUB
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Chọn sảnh game để tham gia đặt cược trực tuyến</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/80 border border-slate-700 hover:border-rose-400 text-slate-300 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer active:scale-90 transition-all shrink-0"
            title="Đóng menu"
          >
            ✕
          </button>
        </div>

        {/* Modal Body - 2 Game Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          {/* GAME 1: ROCKET CRASH */}
          <div
            onClick={() => handleChoose('ROCKET')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group select-none ${
              activeGame === 'ROCKET'
                ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/50 border-emerald-400 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                : 'bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform shrink-0">
                  🚀
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                      TÊN LỬA VŨ TRỤ
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      CRASH
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                    Tên lửa bay vũ trụ nhân vốn lên tới <strong>x1000 lần</strong>. Chốt lời kịp thời trước khi nổ tung!
                  </p>
                </div>
              </div>

              {activeGame === 'ROCKET' ? (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-black shrink-0 bg-emerald-500/15 border border-emerald-500/40 px-2 py-1 rounded-xl">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>ĐANG CHƠI</span>
                </div>
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              )}
            </div>

            {/* Highlights badges */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300">
              <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 font-semibold">
                <Flame className="w-3 h-3 text-amber-400" /> Hệ số x100+
              </span>
              <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 font-semibold">
                <Swords className="w-3 h-3 text-purple-400" /> Solo 1v1 PvP
              </span>
              <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 font-semibold">
                <Sparkles className="w-3 h-3 text-yellow-400" /> Kho Skin Tên Lửa
              </span>
            </div>
          </div>

          {/* GAME 2: CƠM HAY CỨT */}
          <div
            onClick={() => handleChoose('COM_CUT')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group select-none ${
              activeGame === 'COM_CUT'
                ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-yellow-950/50 border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/40'
                : 'bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800 hover:border-amber-500/60 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
                  🍚
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                      CƠM HAY CỨT
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      SICBO 3D
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                    Xóc đĩa 3 viên xí ngầu 3D chuẩn Macau. Tự tay kéo nặn bát hé lộ kết quả ăn tiền cực đã!
                  </p>
                </div>
              </div>

              {activeGame === 'COM_CUT' ? (
                <div className="flex items-center gap-1 text-amber-400 text-xs font-black shrink-0 bg-amber-500/15 border border-amber-500/40 px-2 py-1 rounded-xl">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>ĐANG CHƠI</span>
                </div>
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              )}
            </div>

            {/* Highlights badges */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-300">
              <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 font-semibold">
                <span>🖐️</span> Nặn Bát 3D Hồi Hộp
              </span>
              <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 font-semibold">
                <span>💥</span> Bão Ăn x30
              </span>
              <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md border border-slate-800 font-semibold">
                <span>🍗</span> Cơm Gà x8
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Info */}
        <div className="pt-3 border-t border-slate-800 shrink-0 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">Số dư ví chung:</span>
            <span className="font-mono-numbers font-black text-amber-300 text-sm">
              {balance.toLocaleString('vi-VN')} Xu
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
