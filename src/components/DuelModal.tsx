import React, { useState } from 'react';
import { DuelState } from '../types/game';
import { Swords, X, Trophy, Zap, Coins, Crown, Flame, Skull, Shield, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

export interface DuelBotOpponent {
  id: string;
  name: string;
  avatar: string;
  title: string;
  difficulty: 'DỄ' | 'VỪA' | 'KHÓ' | 'CAO THỦ' | 'ÁC MỘNG';
  difficultyStars: string;
  difficultyColor: string;
  badgeBg: string;
  minTarget: number;
  maxTarget: number;
  description: string;
  quote: string;
  suggestedWager: number;
}

export const BOT_OPPONENTS: DuelBotOpponent[] = [
  {
    id: 'son_nontay',
    name: 'Sơn_NonTay',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Son',
    title: 'Thần Rút Sớm',
    difficulty: 'DỄ',
    difficultyStars: '⭐',
    difficultyColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    minTarget: 1.40,
    maxTarget: 1.95,
    description: 'Chuyên nhảy non, thích ăn chắc mặc bền. Rất dễ bị khuất phục nếu bạn dám gồng qua mốc 2.0x!',
    quote: 'Em ăn non sống lâu, bác có gan thì vượt qua em nhé!',
    suggestedWager: 200000,
  },
  {
    id: 'tuan_tayto',
    name: 'Tuấn_TayTo',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan',
    title: 'Thần Bài Vũ Trụ',
    difficulty: 'VỪA',
    difficultyStars: '⭐⭐',
    difficultyColor: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
    badgeBg: 'bg-sky-500/20 text-sky-300',
    minTarget: 2.20,
    maxTarget: 3.80,
    description: 'Kỷ luật và gan lì. Luôn chờ đợi nhịp bay ổn định để chốt ở khoảng 2.5x - 3.5x.',
    quote: 'Tay to không lo chết đói, vào đây xem ai lì đòn hơn!',
    suggestedWager: 500000,
  },
  {
    id: 'bao_allin',
    name: 'Bảo_AllIn',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao',
    title: 'Vua Gồng Lãi',
    difficulty: 'KHÓ',
    difficultyStars: '⭐⭐⭐',
    difficultyColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    minTarget: 3.80,
    maxTarget: 8.00,
    description: 'Bàn tay kim cương không biết sợ! Chỉ chốt khi chạm đỉnh cao, khó lòng hạ gục trừ khi tàu nổ sớm.',
    quote: 'Không nhân 5 nhân 10 thì chơi làm gì, vào đây solo khô máu!',
    suggestedWager: 1000000,
  },
  {
    id: 'khang_bipvcl',
    name: 'Khang_BịpVcl',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Khang',
    title: 'Chiến Thần Tâm Lý',
    difficulty: 'CAO THỦ',
    difficultyStars: '⭐⭐⭐⭐',
    difficultyColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    badgeBg: 'bg-purple-500/20 text-purple-300',
    minTarget: 2.50,
    maxTarget: 9.50,
    description: 'AI quỷ quyệt thích ứng cao. Phân tích nhịp độ trận đấu để gài bẫy và bóp nghẹt tâm lý đối phương.',
    quote: 'Để xem tâm lý của bạn vững đến đâu, cẩn thận sập bẫy nhé!',
    suggestedWager: 2500000,
  },
  {
    id: 'anhba_baosan',
    name: 'AnhBa_BaoSàn',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnhBa',
    title: 'Trùm Cuối Cá Mập',
    difficulty: 'ÁC MỘNG',
    difficultyStars: '⭐⭐⭐⭐⭐',
    difficultyColor: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
    badgeBg: 'bg-rose-500/20 text-rose-300',
    minTarget: 4.50,
    maxTarget: 14.00,
    description: 'Huyền thoại tài phiệt vũ trụ, tiền nhiều vô hạn, thần kinh thép. Thách thức lớn nhất sàn đấu!',
    quote: 'Sàn này anh Ba bao trọn gói! Dám đọ độ lì và túi tiền với tao không?',
    suggestedWager: 5000000,
  },
];

const WAGER_OPTIONS = [200000, 500000, 1000000, 2500000, 5000000, 10000000];

interface DuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  activeDuel: DuelState | null;
  onStartDuel: (
    wager: number,
    opponentName: string,
    opponentAvatar: string,
    opponentTitle?: string,
    opponentDifficulty?: 'DỄ' | 'VỪA' | 'KHÓ' | 'CAO THỦ' | 'ÁC MỘNG',
    opponentQuote?: string,
    minTarget?: number,
    maxTarget?: number
  ) => void;
  onCancelDuel: () => void;
}

export const DuelModal: React.FC<DuelModalProps> = ({
  isOpen,
  onClose,
  balance,
  activeDuel,
  onStartDuel,
  onCancelDuel,
}) => {
  const [selectedBotIndex, setSelectedBotIndex] = useState<number>(1);
  const bot = BOT_OPPONENTS[selectedBotIndex] || BOT_OPPONENTS[0];
  const [selectedWager, setSelectedWager] = useState<number>(bot.suggestedWager);

  if (!isOpen) return null;

  const handleSelectBot = (idx: number) => {
    setSelectedBotIndex(idx);
    setSelectedWager(BOT_OPPONENTS[idx].suggestedWager);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400">
              <Swords className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                ĐẤU TRƯỜNG SOLO 1V1 CHIẾM NGAI
              </h2>
              <p className="text-xs text-slate-400">
                Thách đấu các Boss AI nâng cấp: Chốt lời cao hơn đối thủ để ăn trọn toàn bộ hũ cược!
              </p>
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
                <Zap className="w-4 h-4 animate-pulse" /> Đang Thách Đấu Solo Trực Tiếp
              </span>
              <span className="text-xs font-extrabold text-amber-400">
                Tổng Hũ: {(activeDuel.wager * 2).toLocaleString('vi-VN')} Xu
              </span>
            </div>

            <div className="flex items-center justify-around gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              {/* User */}
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-bold text-white">Bạn</span>
                <span className="text-xs text-emerald-400 font-bold">
                  {activeDuel.userMult ? `${activeDuel.userMult.toFixed(2)}x` : 'Đang bay...'}
                </span>
              </div>

              <div className="text-red-500 font-black text-lg">VS</div>

              {/* Opponent */}
              <div className="flex flex-col items-center gap-1 text-center">
                <img
                  src={activeDuel.opponentAvatar}
                  alt="Opponent"
                  className="w-9 h-9 rounded-full border border-red-500"
                />
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">1. Chọn Boss AI Thách Đấu:</label>
                <span className="text-[11px] text-amber-400 font-semibold">5 Cấp Độ AI</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BOT_OPPONENTS.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBot(idx)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      selectedBotIndex === idx
                        ? 'bg-red-950/40 border-red-500 text-white shadow-lg shadow-red-500/10 ring-1 ring-red-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={b.avatar}
                        alt={b.name}
                        className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 object-cover"
                      />
                      {b.difficulty === 'ÁC MỘNG' && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-extrabold text-xs truncate text-white">
                          {b.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${b.difficultyColor}`}
                        >
                          {b.difficultyStars} {b.difficulty}
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400 font-semibold mb-1">
                        {b.title} ({b.minTarget}x - {b.maxTarget}x)
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Boss Preview Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={bot.avatar}
                  alt={bot.name}
                  className="w-11 h-11 rounded-2xl border border-red-500/40 bg-slate-900 object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{bot.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${bot.badgeBg}`}>
                      {bot.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300 italic mt-0.5">
                    "{bot.quote}"
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Dải Chốt Dự Kiến</span>
                <span className="text-xs font-mono font-bold text-red-400">
                  {bot.minTarget.toFixed(2)}x ~ {bot.maxTarget.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Select Wager */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300">2. Chọn mức cược thách đấu:</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {WAGER_OPTIONS.map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSelectedWager(w)}
                    className={`py-2 px-1 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                      selectedWager === w
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
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
              type="button"
              onClick={() => {
                if (balance >= selectedWager) {
                  sounds.playWarpSpeed();
                  onStartDuel(
                    selectedWager,
                    bot.name,
                    bot.avatar,
                    bot.title,
                    bot.difficulty,
                    bot.quote,
                    bot.minTarget,
                    bot.maxTarget
                  );
                  onClose();
                } else {
                  sounds.playErrorBeep();
                }
              }}
              disabled={balance < selectedWager}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 text-white font-black text-sm transition-all active:scale-95 shadow-xl shadow-red-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Swords className="w-5 h-5 animate-pulse" />
              <span>
                Thách Đấu {bot.name} ({selectedWager.toLocaleString('vi-VN')} Xu)
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
