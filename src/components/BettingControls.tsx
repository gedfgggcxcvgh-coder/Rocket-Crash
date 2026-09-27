import React, { useState } from 'react';
import { GamePhase } from '../types/game';
import { PlusCircle, Zap, Shield, ArrowUpRight } from 'lucide-react';
import { sounds } from '../utils/audio';

interface BettingControlsProps {
  phase: GamePhase;
  balance: number;
  currentMultiplier: number;
  userBet: number;
  userCashedOut: boolean;
  userCashoutMultiplier?: number;
  autoCashoutEnabled: boolean;
  autoCashoutTarget: number;
  onSetAutoCashoutEnabled: (enabled: boolean) => void;
  onSetAutoCashoutTarget: (target: number) => void;
  onPlaceBet: (amount: number) => void;
  onCancelBet: () => void;
  onCashout: () => void;
  onAddFunds: (amount: number) => void;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  phase,
  balance,
  currentMultiplier,
  userBet,
  userCashedOut,
  userCashoutMultiplier,
  autoCashoutEnabled,
  autoCashoutTarget,
  onSetAutoCashoutEnabled,
  onSetAutoCashoutTarget,
  onPlaceBet,
  onCancelBet,
  onCashout,
  onAddFunds,
}) => {
  const [betInput, setBetInput] = useState<string>('500');
  const numericBet = Math.max(10, Math.min(balance, parseInt(betInput, 10) || 0));

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setBetInput(val);
  };

  const handleQuickAdd = (delta: number) => {
    sounds.playClick();
    const current = parseInt(betInput, 10) || 0;
    const next = Math.min(balance, Math.max(10, current + delta));
    setBetInput(next.toString());
  };

  const handleQuickMultiply = (factor: number) => {
    sounds.playClick();
    const current = parseInt(betInput, 10) || 0;
    let next = Math.floor(current * factor);
    if (next < 10) next = 10;
    if (next > balance) next = balance;
    setBetInput(next.toString());
  };

  const handleMax = () => {
    sounds.playClick();
    setBetInput(balance.toString());
  };

  const projectedWin = Math.floor(userBet * currentMultiplier);

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 md:p-5 shadow-xl flex flex-col gap-4">
      {/* Top row: Balance & Faucet */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-400">Số dư ví của bạn</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-amber-400">
              {balance.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs uppercase font-bold text-amber-500/80 tracking-wider">Xu</span>
          </div>
        </div>

        <button
          onClick={() => onAddFunds(500000)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/50 hover:bg-emerald-900/80 text-emerald-400 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Nhận 500.000 Xu miễn phí để trải nghiệm cược"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+500.000 Xu Miễn Phí</span>
        </button>
      </div>

      {/* Main Execution Button - Positioned at top for quick reaction & visibility */}
      <div className="w-full">
        {/* State 1: Active In-Flight with User Bet Placed -> CASH OUT BUTTON */}
        {phase === 'FLYING' && userBet > 0 && !userCashedOut && (
          <button
            type="button"
            onClick={onCashout}
            className="w-full py-4 px-6 rounded-2xl font-black text-xl md:text-2xl transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98] text-slate-950 shadow-xl shadow-emerald-500/25 border-2 border-emerald-300 animate-pulse cursor-pointer group"
          >
            <Zap className="w-7 h-7 text-slate-950 fill-current animate-bounce shrink-0" />
            <div className="flex flex-col items-center leading-none">
              <span>DỪNG LẠI & CHỐT LỜI (CASH OUT)</span>
              <span className="text-sm font-bold font-mono-numbers opacity-90 mt-1">
                Nhận +{projectedWin.toLocaleString('vi-VN')} Xu tại {currentMultiplier.toFixed(2)}x
                {autoCashoutEnabled ? ` (Tự động tại ${autoCashoutTarget.toFixed(2)}x)` : ''}
              </span>
            </div>
          </button>
        )}

        {/* State 2: Active In-Flight and User Cashed Out */}
        {phase === 'FLYING' && userCashedOut && (
          <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-center font-semibold text-sm flex items-center justify-center gap-2">
            <span>🎉 Bạn đã chốt lời thành công tại {userCashoutMultiplier?.toFixed(2)}x (+{(Math.floor(userBet * (userCashoutMultiplier || 1))).toLocaleString('vi-VN')} Xu)! Chờ vòng tiếp theo...</span>
          </div>
        )}

        {/* State 3: Active In-Flight but User didn't place bet */}
        {phase === 'FLYING' && userBet === 0 && (
          <div className="w-full py-3.5 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-center font-medium text-sm flex items-center justify-center gap-2">
            <span>🚀 Tên lửa đang bay ở mốc</span>
            <span className="text-amber-400 font-bold font-mono-numbers text-base">{currentMultiplier.toFixed(2)}x</span>
            <span>- Đợi vòng tới để cược!</span>
          </div>
        )}

        {/* State 4: COUNTDOWN -> Place Bet OR Cancel Bet */}
        {phase === 'COUNTDOWN' && (
          <>
            {userBet > 0 ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 py-3 px-4 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-between text-amber-300 text-sm font-semibold">
                  <span>Đã đặt cược: {userBet.toLocaleString('vi-VN')} Xu</span>
                  <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
                    Sắp cất cánh...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCancelBet}
                  className="py-3 px-6 rounded-xl bg-red-950/80 border border-red-600/50 hover:bg-red-900/80 text-red-300 text-sm font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  HỦY CƯỢC
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onPlaceBet(numericBet)}
                disabled={numericBet <= 0 || numericBet > balance}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] text-slate-950 font-black text-lg md:text-xl shadow-lg shadow-amber-500/20 border border-yellow-300 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>ĐẶT CƯỢC ({numericBet.toLocaleString('vi-VN')} XU)</span>
                <ArrowUpRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}

        {/* State 5: CRASHED state */}
        {phase === 'CRASHED' && (
          <div className="w-full py-3.5 px-4 rounded-xl bg-red-950/50 border border-red-800/40 text-red-300 text-center text-sm font-semibold flex items-center justify-center gap-2">
            <span>Tên lửa đã nổ! Đang khởi tạo vòng mới...</span>
          </div>
        )}
      </div>

      {/* Main Bet Formulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 border-t border-slate-800/60">
        {/* Left: Bet amount input and quick buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <label htmlFor="bet-input" className="font-medium">
              Số tiền cược (Xu)
            </label>
            <span>Tối thiểu: 10 Xu</span>
          </div>

          <div className="relative flex items-center">
            <input
              id="bet-input"
              type="text"
              value={betInput}
              onChange={handleBetChange}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-lg font-bold font-mono-numbers text-white focus:outline-none focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed pr-14"
              placeholder="500"
            />
            <span className="absolute right-4 text-xs font-bold text-slate-500 uppercase pointer-events-none">
              Xu
            </span>
          </div>

          {/* Quick adjustment buttons */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleQuickAdd(100)}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold font-mono-numbers text-slate-200 transition-colors disabled:opacity-40"
            >
              +100
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(500)}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold font-mono-numbers text-slate-200 transition-colors disabled:opacity-40"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdd(1000)}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold font-mono-numbers text-slate-200 transition-colors disabled:opacity-40"
            >
              +1K
            </button>
            <button
              type="button"
              onClick={() => handleQuickMultiply(0.5)}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold font-mono-numbers text-slate-200 transition-colors disabled:opacity-40"
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => handleQuickMultiply(2)}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-bold font-mono-numbers text-slate-200 transition-colors disabled:opacity-40"
            >
              2X
            </button>
            <button
              type="button"
              onClick={handleMax}
              disabled={userBet > 0 && phase !== 'CRASHED'}
              className="py-1.5 rounded-lg bg-amber-950/70 border border-amber-600/40 hover:bg-amber-900/60 active:bg-amber-800 text-xs font-bold font-mono-numbers text-amber-300 transition-colors disabled:opacity-40"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Right: Auto Cashout Settings */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                onChange={e => onSetAutoCashoutEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className="font-medium text-slate-200">Tự động chốt lời (Auto Cashout)</span>
            </label>
            <span className="text-[11px] text-slate-500">Dừng ngay khi đạt mốc</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="number"
              step="0.1"
              min="1.1"
              max="500"
              disabled={!autoCashoutEnabled || (userBet > 0 && phase !== 'CRASHED')}
              value={autoCashoutTarget}
              onChange={e => onSetAutoCashoutTarget(Math.max(1.1, parseFloat(e.target.value) || 2.0))}
              className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-lg font-bold font-mono-numbers text-white focus:outline-none transition-all pr-12 ${
                autoCashoutEnabled
                  ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                  : 'border-slate-800 opacity-50 cursor-not-allowed'
              }`}
              placeholder="2.00"
            />
            <span className="absolute right-4 text-xs font-bold text-slate-500 uppercase pointer-events-none">
              x
            </span>
          </div>

          {/* Quick presets for auto multiplier up to high-flying values */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {[2.0, 3.0, 5.0, 10.0, 25.0, 50.0].map(val => (
              <button
                key={val}
                type="button"
                disabled={!autoCashoutEnabled || (userBet > 0 && phase !== 'CRASHED')}
                onClick={() => {
                  sounds.playClick();
                  onSetAutoCashoutTarget(val);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold font-mono-numbers transition-colors ${
                  autoCashoutTarget === val && autoCashoutEnabled
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
                }`}
              >
                {val}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          Thuật toán Crash ngẫu nhiên & công bằng (Provably Fair)
        </span>
        <span className="text-slate-500">Mô phỏng giải trí • Rút thưởng kịp thời</span>
      </div>
    </div>
  );
};
