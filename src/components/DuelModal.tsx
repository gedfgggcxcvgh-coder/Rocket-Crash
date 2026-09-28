import React, { useState } from 'react';
import { DuelState } from '../types/game';
import { Swords, X, Trophy, Zap, Coins } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  activeDuel: DuelState | null;
  onStartDuel: (wager: number, opponentName: string, opponentAvatar: string) => void;
  onCancelDuel: () => void;
}

const BOT_OPPONENTS = [
  { name: 'Tuấn_TayTo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan', title: 'Thần Bài Vũ Trụ' },
  { name: 'Bảo_AllIn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao', title: 'Vua Gồng Lãi' },
  { name: 'Phúc_KhôMáu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Phuc', title: 'Sát Thủ Tên Lửa' },
  { name: 'ĐạiGia_SàiGòn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DaiGia', title: 'Đại Gia Tên Lửa' },
];

const WAGER_OPTIONS = [100000, 500000, 1000000, 5000000];

export const DuelModal: React.FC<DuelModalProps> = ({
  isOpen,
  onClose,
  balance,
  activeDuel,
  onStartDuel,
  onCancelDuel,
}) => {
  const [selectedWager, setSelectedWager] = useState<number>(500000);
  const [selectedBotIndex, setSelectedBotIndex] = useState<number>(0);

  if (!isOpen) return null;

  const bot = BOT_OPPONENTS[selectedBotIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                THÁCH ĐẤU SOLO 1V1
              </h2>
              <p className="text-xs text-slate-400">Chốt lời ở hệ số cao hơn đối thủ để ăn trọn tiền cược!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeDuel && activeDuel.active ? (
          /* Active Duel HUD */
          <div className="bg-slate-950 border border-red-500/40 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 animate-pulse" /> Đang Thách Đấu Solo
              </span>
              <span className="text-xs font-extrabold text-amber-400">
                Tiền Cược: {activeDuel.wager.toLocaleString('vi-VN')} Xu
              </span>
            </div>

            <div className="flex items-center justify-around gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              {/* User */}
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-bold text-white">Bạn</span>
                <span className="text-xs text-emerald-400 font-bold">
                  {activeDuel.userMult ? `${activeDuel.userMult.toFixed(2)}x` : 'Đang gồng...'}
                </span>
              </div>

              <div className="text-red-500 font-black text-lg">VS</div>

              {/* Opponent */}
              <div className="flex flex-col items-center gap-1 text-center">
                <img src={activeDuel.opponentAvatar} alt="Opponent" className="w-8 h-8 rounded-full border border-red-500" />
                <span className="text-xs font-bold text-white">{activeDuel.opponentName}</span>
                <span className="text-xs text-amber-400 font-bold">
                  {activeDuel.opponentMult ? `${activeDuel.opponentMult.toFixed(2)}x` : 'Đang gồng...'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onCancelDuel();
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              Hủy Thách Đấu
            </button>
          </div>
        ) : (
          /* Setup New Duel */
          <div className="flex flex-col gap-5">
            {/* Select Opponent */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">1. Chọn đối thủ thách đấu:</label>
              <div className="grid grid-cols-2 gap-2">
                {BOT_OPPONENTS.map((b, idx) => (
                  <button
                    key={b.name}
                    onClick={() => setSelectedBotIndex(idx)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      selectedBotIndex === idx
                        ? 'bg-red-950/30 border-red-500 text-white shadow-md shadow-red-500/10'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <img src={b.avatar} alt={b.name} className="w-8 h-8 rounded-xl shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate text-white">{b.name}</div>
                      <div className="text-[10px] text-amber-400 font-medium">{b.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Select Wager */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">2. Chọn mức tiền thách đấu:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WAGER_OPTIONS.map(w => (
                  <button
                    key={w}
                    onClick={() => setSelectedWager(w)}
                    className={`py-2 px-1 rounded-xl border text-xs font-extrabold transition-all ${
                      selectedWager === w
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {(w / 1000).toLocaleString()}K Xu
                  </button>
                ))}
              </div>
            </div>

            {/* Start Challenge Button */}
            <button
              onClick={() => {
                if (balance >= selectedWager) {
                  sounds.playWarpSpeed();
                  onStartDuel(selectedWager, bot.name, bot.avatar);
                  onClose();
                } else {
                  sounds.playErrorBeep();
                }
              }}
              disabled={balance < selectedWager}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-40 text-white font-extrabold text-sm transition-all active:scale-95 shadow-xl shadow-red-600/25 flex items-center justify-center gap-2"
            >
              <Swords className="w-4 h-4" />
              <span>
                Thách Đấu Chiếm Ngai ({selectedWager.toLocaleString('vi-VN')} Xu)
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
