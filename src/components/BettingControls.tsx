import React, { useState } from 'react';
import { GamePhase } from '../types/game';
import { PlusCircle, Zap, Shield, ArrowUpRight, Sparkles, Swords, Trophy } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SingleBetPanelProps {
  title: string;
  badgeText: string;
  badgeColorClass: string;
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
}

const SingleBetPanel: React.FC<SingleBetPanelProps> = ({
  title,
  badgeText,
  badgeColorClass,
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
}) => {
  const [betInput, setBetInput] = useState<string>('50000');

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

  const numericBet = Math.max(10, Math.min(balance, parseInt(betInput, 10) || 0));
  const projectedWin = Math.floor(userBet * currentMultiplier);

  return (
    <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3 shadow-inner">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white text-xs">{title}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${badgeColorClass}`}>
            {badgeText}
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div>
        {phase === 'FLYING' && userBet > 0 && !userCashedOut && (
          <button
            type="button"
            onClick={onCashout}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/40 active:scale-[0.98] ring-2 ring-emerald-300/60 animate-pulse cursor-pointer flex flex-col items-center justify-center leading-tight group"
          >
            <div className="flex items-center gap-1.5">
              <span>CHỐT LÃI NGAY</span>
              <span className="text-[9px] bg-slate-950 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold">
                SPACE
              </span>
              <ArrowUpRight className="w-4 h-4 stroke-[3] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-black font-mono-numbers text-slate-950">
                +{projectedWin.toLocaleString('vi-VN')} Xu
              </span>
              <span className="text-[10px] bg-emerald-950/20 px-1 rounded text-slate-900 font-bold">
                (Lãi +{(projectedWin - userBet).toLocaleString('vi-VN')} Xu • {currentMultiplier.toFixed(2)}x)
              </span>
            </div>
          </button>
        )}

        {phase === 'FLYING' && userBet > 0 && userCashedOut && (
          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 font-extrabold text-xs text-center flex flex-col items-center justify-center shadow-lg shadow-emerald-500/10">
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              ✨ ĐÃ CHỐT LÃI THÀNH CÔNG
            </span>
            <span className="font-mono-numbers text-sm text-white font-bold">
              +{Math.floor(userBet * (userCashoutMultiplier || 1.0)).toLocaleString('vi-VN')} Xu ({userCashoutMultiplier?.toFixed(2)}x)
            </span>
          </div>
        )}

        {phase === 'COUNTDOWN' && userBet > 0 && (
          <button
            type="button"
            onClick={onCancelBet}
            className="w-full py-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600/50 text-rose-300 font-bold text-xs transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center"
          >
            <span>HỦY VÉ CƯỢC</span>
            <span className="text-[10px] text-rose-400 font-normal">
              ({userBet.toLocaleString('vi-VN')} Xu)
            </span>
          </button>
        )}

        {((phase === 'COUNTDOWN' && userBet === 0) || (phase === 'FLYING' && userBet === 0) || phase === 'CRASHED') && (
          <button
            type="button"
            disabled={balance < numericBet || numericBet <= 0}
            onClick={() => onPlaceBet(numericBet)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 text-slate-950 font-black text-sm tracking-wide transition-all shadow-md shadow-amber-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group"
          >
            <Zap className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition-transform" />
            <span>
              {phase === 'COUNTDOWN' ? 'ĐẶT CƯỢC VÁN NÀY' : 'ĐẶT CƯỢC VÁN SAU'}
            </span>
            <span className="text-[9px] bg-slate-950/20 text-slate-950 px-1 py-0.5 rounded font-mono font-bold">
              SPACE
            </span>
          </button>
        )}
      </div>

      {/* Bet Amount Input & Quick Modifiers */}
      <div className="flex flex-col gap-1.5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={betInput}
            disabled={userBet > 0}
            onChange={e => setBetInput(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-3 pr-12 py-2 text-xs font-mono-numbers font-bold text-white focus:outline-none focus:border-amber-500 disabled:opacity-60 transition-colors"
            placeholder="Mức cược..."
          />
          <span className="absolute right-3 text-[10px] font-bold text-amber-400 pointer-events-none">
            Xu
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            disabled={userBet > 0}
            onClick={() => handleQuickAdd(10000)}
            className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-[10px] font-semibold text-slate-300 disabled:opacity-50 transition-colors"
          >
            +10K
          </button>

          <button
            type="button"
            disabled={userBet > 0}
            onClick={() => handleQuickAdd(50000)}
            className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-[10px] font-semibold text-slate-300 disabled:opacity-50 transition-colors"
          >
            +50K
          </button>

          <button
            type="button"
            disabled={userBet > 0}
            onClick={() => handleQuickAdd(100000)}
            className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-[10px] font-semibold text-slate-300 disabled:opacity-50 transition-colors"
          >
            +100K
          </button>

          <button
            type="button"
            disabled={userBet > 0}
            onClick={() => handleQuickMultiply(0.5)}
            className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-semibold text-amber-400 disabled:opacity-50 transition-colors"
          >
            1/2
          </button>

          <button
            type="button"
            disabled={userBet > 0}
            onClick={() => handleQuickMultiply(2)}
            className="py-1 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-semibold text-amber-400 disabled:opacity-50 transition-colors"
          >
            2X
          </button>

          <button
            type="button"
            disabled={userBet > 0}
            onClick={() => setBetInput(balance.toString())}
            className="py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-[10px] font-extrabold text-amber-400 disabled:opacity-50 transition-colors"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Auto Cashout Config */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoCashoutEnabled}
            onChange={e => onSetAutoCashoutEnabled(e.target.checked)}
            className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
          />
          <span className="text-[11px] font-semibold text-slate-300">Tự động chốt</span>
        </label>

        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min="1.01"
            max="100.0"
            disabled={!autoCashoutEnabled}
            value={autoCashoutTarget}
            onChange={e => onSetAutoCashoutTarget(parseFloat(e.target.value) || 2.0)}
            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-amber-400 disabled:opacity-40 focus:outline-none"
          />
          <span className="text-[10px] font-bold text-slate-400">x</span>
        </div>
      </div>
    </div>
  );
};

interface BettingControlsProps {
  phase: GamePhase;
  balance: number;
  currentMultiplier: number;

  userBet1: number;
  userCashedOut1: boolean;
  userCashoutMultiplier1?: number;
  autoCashoutEnabled1: boolean;
  autoCashoutTarget1: number;
  onSetAutoCashoutEnabled1: (enabled: boolean) => void;
  onSetAutoCashoutTarget1: (target: number) => void;
  onPlaceBet1: (amount: number) => void;
  onCancelBet1: () => void;
  onCashout1: () => void;

  userBet2: number;
  userCashedOut2: boolean;
  userCashoutMultiplier2?: number;
  autoCashoutEnabled2: boolean;
  autoCashoutTarget2: number;
  onSetAutoCashoutEnabled2: (enabled: boolean) => void;
  onSetAutoCashoutTarget2: (target: number) => void;
  onPlaceBet2: (amount: number) => void;
  onCancelBet2: () => void;
  onCashout2: () => void;

  onAddFunds: (amount: number) => void;
  onOpenGarage?: () => void;
  onOpenDuel?: () => void;
  onOpenLeaderboard?: () => void;
}

export const BettingControls: React.FC<BettingControlsProps> = ({
  phase,
  balance,
  currentMultiplier,
  userBet1,
  userCashedOut1,
  userCashoutMultiplier1,
  autoCashoutEnabled1,
  autoCashoutTarget1,
  onSetAutoCashoutEnabled1,
  onSetAutoCashoutTarget1,
  onPlaceBet1,
  onCancelBet1,
  onCashout1,
  userBet2,
  userCashedOut2,
  userCashoutMultiplier2,
  autoCashoutEnabled2,
  autoCashoutTarget2,
  onSetAutoCashoutEnabled2,
  onSetAutoCashoutTarget2,
  onPlaceBet2,
  onCancelBet2,
  onCashout2,
  onAddFunds,
  onOpenGarage,
  onOpenDuel,
  onOpenLeaderboard,
}) => {
  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 md:p-5 shadow-xl flex flex-col gap-4">
      {/* Top row: Balance, Faucet & Navigation Shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-400">Số dư khả dụng</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono-numbers text-amber-400">
                {balance.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs uppercase font-bold text-amber-500">Xu</span>
            </div>
          </div>

          <button
            onClick={() => onAddFunds(500000)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/50 hover:bg-emerald-900/80 text-emerald-400 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Nhận 500.000 Xu miễn phí"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+500K Xu</span>
          </button>
        </div>

        {/* Feature Hub Buttons */}
        <div className="flex items-center gap-2">
          {onOpenGarage && (
            <button
              onClick={onOpenGarage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              title="Gara Tên Lửa & Vệt Khói Lửa"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gara Skin</span>
            </button>
          )}

          {onOpenDuel && (
            <button
              onClick={onOpenDuel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              title="Thách đấu Solo 1v1 Chiếm Ngai"
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>Solo 1v1</span>
            </button>
          )}

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              title="Bảng xếp hạng cao thủ"
            >
              <Trophy className="w-3.5 h-3.5 text-indigo-400" />
              <span>BXH</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Bet Panels (Side-by-Side Strategy) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <SingleBetPanel
          title="Vé Cược 1"
          badgeText="AN TOÀN"
          badgeColorClass="bg-emerald-950/80 text-emerald-400 border-emerald-800"
          phase={phase}
          balance={balance}
          currentMultiplier={currentMultiplier}
          userBet={userBet1}
          userCashedOut={userCashedOut1}
          userCashoutMultiplier={userCashoutMultiplier1}
          autoCashoutEnabled={autoCashoutEnabled1}
          autoCashoutTarget={autoCashoutTarget1}
          onSetAutoCashoutEnabled={onSetAutoCashoutEnabled1}
          onSetAutoCashoutTarget={onSetAutoCashoutTarget1}
          onPlaceBet={onPlaceBet1}
          onCancelBet={onCancelBet1}
          onCashout={onCashout1}
        />

        <SingleBetPanel
          title="Vé Cược 2"
          badgeText="GỒNG ĐỈNH"
          badgeColorClass="bg-amber-950/80 text-amber-400 border-amber-800"
          phase={phase}
          balance={balance}
          currentMultiplier={currentMultiplier}
          userBet={userBet2}
          userCashedOut={userCashedOut2}
          userCashoutMultiplier={userCashoutMultiplier2}
          autoCashoutEnabled={autoCashoutEnabled2}
          autoCashoutTarget={autoCashoutTarget2}
          onSetAutoCashoutEnabled={onSetAutoCashoutEnabled2}
          onSetAutoCashoutTarget={onSetAutoCashoutTarget2}
          onPlaceBet={onPlaceBet2}
          onCancelBet={onCancelBet2}
          onCashout={onCashout2}
        />
      </div>
    </div>
  );
};
