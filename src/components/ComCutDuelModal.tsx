import React, { useState, useEffect, useRef } from 'react';
import { ComCutBoss, ComCutBetType, ComCutDuelMatch } from '../types/game';
import { COMCUT_BOSSES, getBossPick, rollSoloDices, checkPickWin } from '../utils/comCutBosses';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Users, Swords, Trophy, X, Shield, Zap, Sparkles, Coins, RefreshCw, Flame, Award,
  Skull, Crown, Layers, ArrowRight, Play, CheckCircle2, AlertTriangle, Star, Check
} from 'lucide-react';
import { ComCutPvpArena } from './ComCutPvpArena';

interface ComCutDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onAwardExp?: (exp: number) => void;
}

type SoloTab = 'PVP_REAL' | 'BOSS_DUEL' | 'STREAK_RUSH' | 'TOWER_GAUNTLET';

const STREAK_MULTIPLIERS = [1.0, 1.98, 3.95, 7.90, 15.80, 31.60, 63.20, 128.0];

const TOWER_FLOORS = [
  { floor: 1, boss: COMCUT_BOSSES[0], multiplier: 1.8, exp: 200, title: 'Tầng 1: Sơn Non Tay', desc: 'Lắc bát nhẹ nhàng, khởi động chuỗi thắng' },
  { floor: 2, boss: COMCUT_BOSSES[1], multiplier: 2.6, exp: 500, title: 'Tầng 2: Thầy Bói Ra Cầu', desc: 'Bát quái hiển linh, quẻ bói đảo chiều' },
  { floor: 3, boss: COMCUT_BOSSES[2], multiplier: 4.2, exp: 1200, title: 'Tầng 3: Tuấn Bẻ Cầu', desc: 'Chuyên gia bẻ gãy mọi cầu bệt' },
  { floor: 4, boss: COMCUT_BOSSES[3], multiplier: 8.5, exp: 2500, title: 'Tầng 4: Thần Cơm Bão x30', desc: 'Bão tam hoa sấm sét giật cấp 12' },
  { floor: 5, boss: COMCUT_BOSSES[4], multiplier: 25.0, exp: 5000, title: 'Tầng 5: Bá Chủ Anh Ba', desc: 'Vua Bát Vàng Huyền Thoại, độc cô cầu bại' },
];

export const ComCutDuelModal: React.FC<ComCutDuelModalProps> = ({
  isOpen,
  onClose,
  balance,
  onUpdateBalance,
  onAwardExp,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<SoloTab>('PVP_REAL');

  // ==================== TAB 1: BOSS DUEL 1V1 ====================
  const [selectedBoss, setSelectedBoss] = useState<ComCutBoss>(COMCUT_BOSSES[0]);
  const [wager, setWager] = useState<number>(100000);
  const [mode, setMode] = useState<'QUICK' | 'BO3' | 'BO5'>('QUICK');
  const [userPick, setUserPick] = useState<ComCutBetType>('COM');
  const [bossPick, setBossPick] = useState<ComCutBetType>('CUT');

  const [match, setMatch] = useState<ComCutDuelMatch | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [lidOpen, setLidOpen] = useState<boolean>(false);
  const [bossComment, setBossComment] = useState<string>('');

  // ==================== TAB 2: STREAK RUSH (CHUỖI SINH TỒN) ====================
  const [streakWager, setStreakWager] = useState<number>(50000);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [streakStatus, setStreakStatus] = useState<'IDLE' | 'PLAYING' | 'WAITING_NEXT' | 'BUSTED' | 'CASHED_OUT'>('IDLE');
  const [streakPick, setStreakPick] = useState<'COM' | 'CUT'>('COM');
  const [streakRolling, setStreakRolling] = useState<boolean>(false);
  const [streakLidOpen, setStreakLidOpen] = useState<boolean>(false);
  const [streakDices, setStreakDices] = useState<[number, number, number] | null>(null);
  const [streakTotal, setStreakTotal] = useState<number>(0);
  const [streakOutcome, setStreakOutcome] = useState<'COM' | 'CUT' | null>(null);
  const [hasStreakShield, setHasStreakShield] = useState<boolean>(false);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('comcut_best_streak') || '0', 10);
  });

  // ==================== TAB 3: TOWER GAUNTLET (LEO THÁP) ====================
  const [towerWager, setTowerWager] = useState<number>(100000);
  const [towerFloor, setTowerFloor] = useState<number>(1);
  const [towerPot, setTowerPot] = useState<number>(0);
  const [towerStatus, setTowerStatus] = useState<'IDLE' | 'FIGHTING' | 'FLOOR_WON' | 'TOWER_CLEAR' | 'FAILED'>('IDLE');
  const [towerUserPick, setTowerUserPick] = useState<ComCutBetType>('COM');
  const [towerBossPick, setTowerBossPick] = useState<ComCutBetType>('CUT');
  const [towerRolling, setTowerRolling] = useState<boolean>(false);
  const [towerLidOpen, setTowerLidOpen] = useState<boolean>(false);
  const [towerDices, setTowerDices] = useState<[number, number, number] | null>(null);
  const [towerTotal, setTowerTotal] = useState<number>(0);
  const [towerOutcome, setTowerOutcome] = useState<'COM' | 'CUT' | null>(null);
  const [towerBossComment, setTowerBossComment] = useState<string>('');

  // Sync boss comment on initial open
  useEffect(() => {
    if (isOpen) {
      setBossComment(selectedBoss.quote);
      setBossPick(getBossPick(selectedBoss, userPick));
      setTowerBossComment(TOWER_FLOORS[towerFloor - 1].boss.quote);
    }
  }, [isOpen, selectedBoss]);

  // Allow ESC key to exit (called unconditionally before early return)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Helper labels
  const getSideLabel = (side: ComCutBetType) => {
    switch (side) {
      case 'COM': return '🍚 CƠM (11-17)';
      case 'CUT': return '💩 CỨT (4-10)';
      case 'BAO_COM': return '🌪️ BÃO CƠM (x30)';
      case 'BAO_CUT': return '💩🌪️ BÃO CỨT (x30)';
      case 'COM_GA': return '🍗 CƠM GÀ (x8)';
      case 'CUT_RUOI': return '🪰 CỨT RUỒI (x8)';
      default: return side;
    }
  };

  // ==================== TAB 1: BOSS DUEL METHODS ====================
  const handleSelectBoss = (b: ComCutBoss) => {
    sounds.playClick();
    setSelectedBoss(b);
    setWager(b.recommendedWagers[0]);
    setBossComment(b.quote);
    setBossPick(getBossPick(b, userPick));
  };

  const handleUserSelectSide = (side: ComCutBetType) => {
    sounds.playClick();
    setUserPick(side);
    const newBossPick = getBossPick(selectedBoss, side);
    setBossPick(newBossPick);

    const talks = selectedBoss.trashTalk.pick;
    setBossComment(talks[Math.floor(Math.random() * talks.length)]);
  };

  const handleStartDuel = () => {
    if (balance < wager) {
      sounds.playErrorBeep();
      return;
    }

    sounds.playBowlSlam();
    onUpdateBalance(balance - wager);

    const initialMatch: ComCutDuelMatch = {
      active: true,
      boss: selectedBoss,
      wager,
      mode: mode === 'BO5' ? 'BO3' : mode, // match type compat
      roundNumber: 1,
      userScore: 0,
      bossScore: 0,
      status: 'CHOOSING',
      userPick,
      bossPick,
    };

    setMatch(initialMatch);
    setIsShaking(true);
    setLidOpen(false);

    sounds.playDiceShaking(2.4);

    setTimeout(() => {
      const roll = rollSoloDices();
      const userWon = checkPickWin(userPick, roll);
      const bossWon = checkPickWin(bossPick, roll);

      let roundWin: 'USER' | 'BOSS' | 'DRAW' = 'DRAW';
      if (userWon && !bossWon) roundWin = 'USER';
      else if (!userWon && bossWon) roundWin = 'BOSS';
      else if (userWon && bossWon) roundWin = 'DRAW';

      const nextUserScore = roundWin === 'USER' ? 1 : 0;
      const nextBossScore = roundWin === 'BOSS' ? 1 : 0;

      setIsShaking(false);
      setLidOpen(true);
      sounds.playLidSlide();

      const requiredWins = mode === 'BO5' ? 3 : mode === 'BO3' ? 2 : 1;
      let isMatchFinished = false;
      let finalWinner: 'USER' | 'BOSS' | 'DRAW' | undefined = undefined;

      if (mode === 'QUICK') {
        isMatchFinished = true;
        finalWinner = roundWin;
      } else {
        if (nextUserScore >= requiredWins) {
          isMatchFinished = true;
          finalWinner = 'USER';
        } else if (nextBossScore >= requiredWins) {
          isMatchFinished = true;
          finalWinner = 'BOSS';
        }
      }

      setMatch({
        ...initialMatch,
        userScore: nextUserScore,
        bossScore: nextBossScore,
        dices: roll.dices,
        total: roll.total,
        outcome: roll.outcome,
        isBao: roll.isBao,
        roundWinner: roundWin,
        status: isMatchFinished ? 'MATCH_OVER' : 'ROUND_OVER',
        matchWinner: finalWinner,
      });

      if (isMatchFinished) {
        if (finalWinner === 'USER') {
          sounds.playWin();
          const winMoney = wager * 2;
          onUpdateBalance(balance - wager + winMoney);
          const expGain = Math.max(150, Math.floor(wager / 500));
          onAwardExp?.(expGain);
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          const wins = selectedBoss.trashTalk.lose;
          setBossComment(wins[Math.floor(Math.random() * wins.length)]);
        } else if (finalWinner === 'BOSS') {
          sounds.playFartSound();
          const loses = selectedBoss.trashTalk.win;
          setBossComment(loses[Math.floor(Math.random() * loses.length)]);
        } else {
          onUpdateBalance(balance);
          setBossComment('Hòa cược rồi! Ván này may cho cả hai bên!');
        }
      } else {
        if (roundWin === 'USER') sounds.playClick();
        else if (roundWin === 'BOSS') sounds.playErrorBeep();
      }
    }, 2400);
  };

  const handleNextRoundBo = () => {
    if (!match) return;
    sounds.playClick();
    setIsShaking(true);
    setLidOpen(false);

    const nextBossPick = getBossPick(selectedBoss, userPick);
    setBossPick(nextBossPick);
    sounds.playDiceShaking(2.4);

    setTimeout(() => {
      const roll = rollSoloDices();
      const userWon = checkPickWin(userPick, roll);
      const bossWon = checkPickWin(nextBossPick, roll);

      let roundWin: 'USER' | 'BOSS' | 'DRAW' = 'DRAW';
      if (userWon && !bossWon) roundWin = 'USER';
      else if (!userWon && bossWon) roundWin = 'BOSS';

      const nextUserScore = match.userScore + (roundWin === 'USER' ? 1 : 0);
      const nextBossScore = match.bossScore + (roundWin === 'BOSS' ? 1 : 0);

      setIsShaking(false);
      setLidOpen(true);
      sounds.playLidSlide();

      const requiredWins = mode === 'BO5' ? 3 : 2;
      let isMatchFinished = false;
      let finalWinner: 'USER' | 'BOSS' | 'DRAW' | undefined = undefined;

      if (nextUserScore >= requiredWins) {
        isMatchFinished = true;
        finalWinner = 'USER';
      } else if (nextBossScore >= requiredWins) {
        isMatchFinished = true;
        finalWinner = 'BOSS';
      }

      setMatch({
        ...match,
        roundNumber: match.roundNumber + 1,
        userScore: nextUserScore,
        bossScore: nextBossScore,
        dices: roll.dices,
        total: roll.total,
        outcome: roll.outcome,
        isBao: roll.isBao,
        roundWinner: roundWin,
        status: isMatchFinished ? 'MATCH_OVER' : 'ROUND_OVER',
        matchWinner: finalWinner,
      });

      if (isMatchFinished) {
        if (finalWinner === 'USER') {
          sounds.playWin();
          const winMoney = match.wager * 2;
          onUpdateBalance(balance + winMoney);
          const expGain = Math.max(300, Math.floor(match.wager / 300));
          onAwardExp?.(expGain);
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
          const loses = selectedBoss.trashTalk.lose;
          setBossComment(loses[Math.floor(Math.random() * loses.length)]);
        } else {
          sounds.playFartSound();
          const wins = selectedBoss.trashTalk.win;
          setBossComment(wins[Math.floor(Math.random() * wins.length)]);
        }
      }
    }, 2400);
  };

  // ==================== TAB 2: STREAK RUSH METHODS ====================
  const currentStreakMult = STREAK_MULTIPLIERS[streakCount] || 1;
  const currentCashoutVal = Math.floor(streakWager * currentStreakMult);

  const handleStartStreakGame = () => {
    if (balance < streakWager) {
      sounds.playErrorBeep();
      return;
    }
    sounds.playBowlSlam();
    onUpdateBalance(balance - streakWager);
    setStreakCount(0);
    setStreakStatus('PLAYING');
    setStreakDices(null);
    setStreakLidOpen(false);
  };

  const handleRollStreak = (side: 'COM' | 'CUT') => {
    if (streakRolling) return;
    setStreakPick(side);
    setStreakRolling(true);
    setStreakLidOpen(false);
    sounds.playDiceShaking(2.2);

    setTimeout(() => {
      const roll = rollSoloDices();
      setStreakDices(roll.dices);
      setStreakTotal(roll.total);
      setStreakOutcome(roll.outcome);
      setStreakRolling(false);
      setStreakLidOpen(true);
      sounds.playLidSlide();

      const won = (side === 'COM' && roll.outcome === 'COM' && !roll.isBao) ||
                  (side === 'CUT' && roll.outcome === 'CUT' && !roll.isBao);

      if (won) {
        const nextStreak = streakCount + 1;
        setStreakCount(nextStreak);
        sounds.playStreakWin(nextStreak);

        if (nextStreak > bestStreak) {
          setBestStreak(nextStreak);
          localStorage.setItem('comcut_best_streak', nextStreak.toString());
        }

        if (nextStreak >= 7) {
          // MAX WIN! Auto cashout
          const maxPrize = Math.floor(streakWager * STREAK_MULTIPLIERS[7]);
          onUpdateBalance(balance + maxPrize);
          setStreakStatus('CASHED_OUT');
          sounds.playWin();
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          onAwardExp?.(1500);
        } else {
          setStreakStatus('WAITING_NEXT');
        }
      } else {
        if (hasStreakShield) {
          sounds.playShieldActivate();
          setHasStreakShield(false);
          setStreakStatus('WAITING_NEXT');
        } else {
          sounds.playFartSound();
          setStreakStatus('BUSTED');
        }
      }
    }, 2200);
  };

  const handleCashoutStreak = () => {
    if (streakCount === 0 || streakStatus !== 'WAITING_NEXT') return;
    sounds.playCashoutWin();
    onUpdateBalance(balance + currentCashoutVal);
    setStreakStatus('CASHED_OUT');
    const expGain = Math.max(100, Math.floor((currentCashoutVal - streakWager) / 400));
    onAwardExp?.(expGain);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
  };

  const handleBuyStreakShield = () => {
    const shieldCost = 30000;
    if (balance < shieldCost || hasStreakShield) {
      sounds.playErrorBeep();
      return;
    }
    sounds.playShieldActivate();
    onUpdateBalance(balance - shieldCost);
    setHasStreakShield(true);
  };

  // ==================== TAB 3: TOWER GAUNTLET METHODS ====================
  const currentFloorData = TOWER_FLOORS[towerFloor - 1];

  const handleStartTowerGauntlet = () => {
    if (balance < towerWager) {
      sounds.playErrorBeep();
      return;
    }
    sounds.playBowlSlam();
    onUpdateBalance(balance - towerWager);
    setTowerFloor(1);
    setTowerPot(Math.floor(towerWager * TOWER_FLOORS[0].multiplier));
    setTowerStatus('FIGHTING');
    setTowerDices(null);
    setTowerLidOpen(false);
    setTowerBossComment(TOWER_FLOORS[0].boss.trashTalk.pick[0]);
  };

  const handleFightTowerFloor = () => {
    if (towerRolling) return;
    setTowerRolling(true);
    setTowerLidOpen(false);
    sounds.playDiceShaking(2.4);

    const floorBoss = currentFloorData.boss;
    const bPick = getBossPick(floorBoss, towerUserPick);
    setTowerBossPick(bPick);

    setTimeout(() => {
      const roll = rollSoloDices();
      setTowerDices(roll.dices);
      setTowerTotal(roll.total);
      setTowerOutcome(roll.outcome);
      setTowerRolling(false);
      setTowerLidOpen(true);
      sounds.playLidSlide();

      const userWon = checkPickWin(towerUserPick, roll);
      const bossWon = checkPickWin(bPick, roll);

      if (userWon && !bossWon) {
        sounds.playTowerAdvance();
        const nextPot = Math.floor(towerWager * currentFloorData.multiplier);
        setTowerPot(nextPot);
        onAwardExp?.(currentFloorData.exp);

        if (towerFloor >= 5) {
          // Cleared Tower Floor 5!
          setTowerStatus('TOWER_CLEAR');
          onUpdateBalance(balance + nextPot);
          sounds.playWin();
          confetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
          setTowerBossComment(floorBoss.trashTalk.lose[0]);
        } else {
          setTowerStatus('FLOOR_WON');
          setTowerBossComment(floorBoss.trashTalk.lose[0]);
        }
      } else {
        sounds.playFartSound();
        setTowerStatus('FAILED');
        setTowerBossComment(floorBoss.trashTalk.win[0]);
      }
    }, 2400);
  };

  const handleAdvanceToNextFloor = () => {
    if (towerFloor < 5) {
      sounds.playClick();
      const nextFloor = towerFloor + 1;
      setTowerFloor(nextFloor);
      setTowerStatus('FIGHTING');
      setTowerDices(null);
      setTowerLidOpen(false);
      setTowerBossComment(TOWER_FLOORS[nextFloor - 1].boss.quote);
    }
  };

  const handleCashoutTower = () => {
    if (towerPot <= 0) return;
    sounds.playCashoutWin();
    onUpdateBalance(balance + towerPot);
    setTowerStatus('IDLE');
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sounds.playClick();
          onClose();
        }
      }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center p-1 sm:p-2 bg-black/90 backdrop-blur-md animate-fadeIn select-none"
    >
      {/* FLOATING UNMISSABLE EXIT BUTTON AT TOP-RIGHT */}
      <button
        type="button"
        onClick={() => {
          sounds.playClick();
          onClose();
        }}
        className="fixed top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-[10002] flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-[0_4px_20px_rgba(220,38,38,0.9)] border-2 border-white cursor-pointer active:scale-95 transition-all"
        title="Thoát ra ngoài (Đóng)"
      >
        <X className="w-4 h-4 stroke-[3]" />
        <span>THOÁT</span>
      </button>

      <div className="w-full max-w-2xl bg-slate-900 border-2 border-amber-500/60 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col h-[96%] sm:h-auto max-h-[96%] sm:max-h-[92%] overflow-hidden relative">
        
        {/* Header with Title, Balance & Exit Button */}
        <div className="p-1.5 sm:p-2.5 bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shrink-0">
              <Swords className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5 leading-none">
                <span>ĐẤU TRƯỜNG SOLO</span>
                <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black">1v1</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-mono font-bold">
              <Coins className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{balance.toLocaleString('vi-VN')} Xu</span>
            </div>
            {/* Direct Close Button in Header */}
            <button
              type="button"
              onClick={() => { sounds.playClick(); onClose(); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 border-2 border-red-500/90 text-red-200 hover:text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
              title="Đóng chế độ solo"
            >
              <X className="w-3.5 h-3.5 text-red-400 stroke-[3]" />
              <span>THOÁT</span>
            </button>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="p-1 sm:p-1.5 bg-slate-950/90 border-b border-slate-800 grid grid-cols-4 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => { sounds.playClick(); setActiveTab('PVP_REAL'); }}
            className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'PVP_REAL'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md ring-1 ring-red-400'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-red-300" />
            <span className="truncate">Người Thật</span>
          </button>

          <button
            type="button"
            onClick={() => { sounds.playClick(); setActiveTab('BOSS_DUEL'); }}
            className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'BOSS_DUEL'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">Đấu Boss</span>
          </button>

          <button
            type="button"
            onClick={() => { sounds.playClick(); setActiveTab('STREAK_RUSH'); }}
            className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'STREAK_RUSH'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md ring-1 ring-orange-300'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">Chuỗi x128</span>
          </button>

          <button
            type="button"
            onClick={() => { sounds.playClick(); setActiveTab('TOWER_GAUNTLET'); }}
            className={`py-1.5 sm:py-2 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'TOWER_GAUNTLET'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md ring-1 ring-purple-300'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 shrink-0" />
            <span className="truncate">Leo Tháp</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-3 space-y-2 sm:space-y-3 scrollbar-thin">

          {/* ==================== TAB 0: SOLO NGƯỜI CHƠI THẬT (PvP 1V1) ==================== */}
          {activeTab === 'PVP_REAL' && (
            <ComCutPvpArena
              balance={balance}
              onUpdateBalance={onUpdateBalance}
              onAwardExp={onAwardExp}
            />
          )}

          {/* ==================== TAB 1: BOSS DUEL 1V1 ==================== */}
          {activeTab === 'BOSS_DUEL' && (
            <>
              {match && match.active ? (
                /* Ongoing Match Arena */
                <div className="flex flex-col gap-1.5 sm:gap-2.5">
                  {/* Match Status Bar */}
                  <div className="p-1.5 sm:p-2 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-black text-amber-400">
                        HIỆP {match.roundNumber} ({mode === 'QUICK' ? '1 Hiệp' : mode === 'BO3' ? 'Bo3' : 'Bo5'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 font-mono font-black text-[11px] sm:text-sm">
                      <span className="text-emerald-400">BẠN: {match.userScore}</span>
                      <span className="text-slate-600">VS</span>
                      <span className="text-rose-400">{match.boss.name}: {match.bossScore}</span>
                    </div>
                  </div>

                  {/* Dual Sides & Shaking Bowl - ALWAYS 3 COLUMNS */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 items-center">
                    {/* User Profile Card */}
                    <div className="flex flex-col items-center p-1.5 sm:p-2 rounded-xl bg-slate-950/70 border border-emerald-500/40 text-center shadow-md">
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-lg sm:text-xl mb-1 shadow-sm">
                        😎
                      </div>
                      <span className="font-extrabold text-white text-[9px] sm:text-xs truncate w-full">Bạn</span>
                      <div className="mt-1 px-1.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[9px] sm:text-xs font-black truncate w-full">
                        {getSideLabel(userPick)}
                      </div>
                    </div>

                    {/* Middle Bowl Arena */}
                    <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-slate-950/90 rounded-xl border border-amber-500/40 min-h-[95px] sm:min-h-[135px]">
                      {isShaking ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-3xl sm:text-4xl animate-bounce">🥣</div>
                          <span className="text-[9px] sm:text-xs font-black text-amber-400 tracking-wider animate-pulse">
                            ĐANG LẮC BÁT...
                          </span>
                        </div>
                      ) : lidOpen && match.dices ? (
                        <div className="flex flex-col items-center gap-1 animate-fadeIn">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            {match.dices.map((d, i) => (
                              <div
                                key={i}
                                className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-100 to-amber-300 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center shadow-md border border-amber-400"
                              >
                                {d >= 4 ? '🍚' : '💩'}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-black text-xs sm:text-sm text-white">
                              {match.total} Điểm
                            </span>
                            <span className={`text-[9px] sm:text-xs px-1.5 py-0.2 rounded-full font-black ${
                              match.outcome === 'COM' ? 'bg-amber-500 text-slate-950' : 'bg-amber-900 text-amber-200'
                            }`}>
                              {match.isBao ? '🌪️ BÃO TAM HOA' : match.outcome === 'COM' ? '🍚 CƠM' : '💩 CỨT'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="text-3xl sm:text-4xl drop-shadow-md">🥣</div>
                          <span className="text-[9px] sm:text-xs font-bold text-slate-400">Bát đã úp kín</span>
                        </div>
                      )}
                    </div>

                    {/* Boss Profile Card */}
                    <div className="flex flex-col items-center p-1.5 sm:p-2 rounded-xl bg-slate-950/70 border border-rose-500/40 text-center shadow-md">
                      <img
                        src={match.boss.avatar}
                        alt={match.boss.name}
                        className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl border-2 border-rose-400 mb-1 shadow-sm object-cover"
                      />
                      <span className="font-extrabold text-white text-[9px] sm:text-xs truncate w-full">{match.boss.name}</span>
                      <div className="mt-1 px-1.5 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[9px] sm:text-xs font-black truncate w-full">
                        {getSideLabel(match.bossPick || bossPick)}
                      </div>
                    </div>
                  </div>

                  {/* Boss Trash Talk */}
                  {bossComment && (
                    <div className="p-1.5 sm:p-2 bg-slate-950 rounded-xl border border-slate-800 text-[10px] sm:text-xs italic text-slate-300 flex items-center gap-1.5">
                      <span className="text-sm shrink-0">{match.boss.icon}</span>
                      <span className="truncate">"{bossComment}"</span>
                    </div>
                  )}

                  {/* Next Round or Finish Controls */}
                  {match.status === 'ROUND_OVER' && (
                    <div className="flex flex-col items-center gap-2 p-3 bg-slate-950 rounded-2xl border border-amber-500/30">
                      <div className="text-sm font-black">
                        {match.roundWinner === 'USER' && (
                          <span className="text-emerald-400">🎉 Bạn thắng Hiệp {match.roundNumber}!</span>
                        )}
                        {match.roundWinner === 'BOSS' && (
                          <span className="text-rose-400">❌ {match.boss.name} thắng Hiệp {match.roundNumber}!</span>
                        )}
                        {match.roundWinner === 'DRAW' && (
                          <span className="text-slate-300">🤝 Hiệp {match.roundNumber} Hòa Điểm!</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleNextRoundBo}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg active:scale-95 cursor-pointer"
                      >
                        ▶️ Hiệp Tiếp Theo
                      </button>
                    </div>
                  )}

                  {match.status === 'MATCH_OVER' && (
                    <div className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-center shadow-2xl ${
                      match.matchWinner === 'USER'
                        ? 'bg-emerald-950/60 border-emerald-500'
                        : match.matchWinner === 'BOSS'
                        ? 'bg-rose-950/60 border-rose-500'
                        : 'bg-slate-950 border-slate-700'
                    }`}>
                      {match.matchWinner === 'USER' && (
                        <>
                          <Crown className="w-8 h-8 text-yellow-400 animate-bounce" />
                          <h3 className="text-base font-black text-emerald-300 uppercase">
                            🏆 BẠN ĐÃ THẮNG SOLO 1V1 HOÀN TOÀN!
                          </h3>
                          <p className="text-xs text-emerald-200">
                            Húp trọn Hũ <strong>+{(match.wager * 2).toLocaleString('vi-VN')} Xu</strong> và nhận EXP Danh Vọng!
                          </p>
                        </>
                      )}
                      {match.matchWinner === 'BOSS' && (
                        <>
                          <Skull className="w-8 h-8 text-rose-400 animate-pulse" />
                          <h3 className="text-base font-black text-rose-300 uppercase">
                            ❌ THẤT BẠI TRƯỚC {match.boss.name}!
                          </h3>
                          <p className="text-xs text-rose-200">
                            Mất {match.wager.toLocaleString('vi-VN')} Xu.
                          </p>
                        </>
                      )}
                      {match.matchWinner === 'DRAW' && (
                        <>
                          <h3 className="text-base font-black text-white uppercase">🤝 TRẬN ĐẤU HÒA!</h3>
                          <p className="text-xs text-slate-300">Đã hoàn lại cược vào ví của bạn.</p>
                        </>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleStartDuel}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-md active:scale-95 cursor-pointer"
                        >
                          🔄 Tái Đấu Ngay
                        </button>
                        <button
                          type="button"
                          onClick={() => setMatch(null)}
                          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-all cursor-pointer"
                        >
                          Chọn Kèo Khác
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Boss Selection & Match Setup */
                <div className="flex flex-col gap-1.5 sm:gap-2.5">
                  {/* Select Boss - 5 items in 1 row on landscape / tablets */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase">1. Chọn Đối Thủ Solo 1v1</span>
                    <div className="grid grid-cols-5 gap-1">
                      {COMCUT_BOSSES.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBoss(b)}
                          className={`p-1 sm:p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col items-center gap-0.5 relative ${
                            selectedBoss.id === b.id
                              ? `${b.border} bg-slate-800/90 ring-2 ring-amber-400 shadow-md scale-[1.02]`
                              : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={b.avatar} alt={b.name} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg border border-slate-700 shadow-sm object-cover" />
                          <span className="font-extrabold text-[8px] sm:text-[9px] text-white text-center leading-tight truncate w-full">
                            {b.name}
                          </span>
                          <span className="text-[6px] sm:text-[7px] px-1 py-0.2 rounded font-black bg-black/60 text-amber-400 leading-none">
                            {b.difficulty}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode & Wager Controls - SIDE BY SIDE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {/* Match Mode */}
                    <div className="p-1.5 sm:p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase">2. Thể Thức Solo</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => { sounds.playClick(); setMode('QUICK'); }}
                          className={`p-1 rounded-lg border text-center cursor-pointer transition-all ${
                            mode === 'QUICK'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="font-black text-white block text-[10px] sm:text-[11px] leading-tight">1 Hiệp</span>
                          <span className="text-[7px] sm:text-[8px] opacity-75 leading-none">Ăn Ngay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { sounds.playClick(); setMode('BO3'); }}
                          className={`p-1 rounded-lg border text-center cursor-pointer transition-all ${
                            mode === 'BO3'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="font-black text-white block text-[10px] sm:text-[11px] leading-tight">Bo3</span>
                          <span className="text-[7px] sm:text-[8px] opacity-75 leading-none">Thắng 2</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { sounds.playClick(); setMode('BO5'); }}
                          className={`p-1 rounded-lg border text-center cursor-pointer transition-all ${
                            mode === 'BO5'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="font-black text-white block text-[10px] sm:text-[11px] leading-tight">Bo5</span>
                          <span className="text-[7px] sm:text-[8px] opacity-75 leading-none">Thắng 3</span>
                        </button>
                      </div>
                    </div>

                    {/* Wager Selection */}
                    <div className="p-1.5 sm:p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase">3. Mức Cược Solo</span>
                        <span className="text-[10px] sm:text-xs font-mono font-black text-amber-400">
                          {wager.toLocaleString('vi-VN')} Xu
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedBoss.recommendedWagers.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => { sounds.playClick(); setWager(amt); }}
                            className={`px-2 py-0.5 rounded-lg border text-[9px] sm:text-[10px] font-mono font-bold cursor-pointer transition-all ${
                              wager === amt
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pick Your Side */}
                  <div className="p-1.5 sm:p-2 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase">
                      4. Chọn Cửa Dự Đoán Của Bạn
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => handleUserSelectSide('COM')}
                        className={`p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          userPick === 'COM'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-400'
                            : 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-850'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">🍚</span>
                        <span>CƠM (11-17)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUserSelectSide('CUT')}
                        className={`p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          userPick === 'CUT'
                            ? 'bg-gradient-to-r from-amber-800 to-amber-900 text-white border-amber-600 shadow-md ring-1 ring-amber-500'
                            : 'bg-slate-900 border-slate-800 text-amber-500 hover:bg-slate-850'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">💩</span>
                        <span>CỨT (4-10)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUserSelectSide('BAO_COM')}
                        className={`p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          userPick === 'BAO_COM'
                            ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow-md ring-1 ring-yellow-400'
                            : 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-850'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">🌪️</span>
                        <span>BÃO CƠM (x30)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUserSelectSide('BAO_CUT')}
                        className={`p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all ${
                          userPick === 'BAO_CUT'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-1 ring-rose-400'
                            : 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-850'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">💩🌪️</span>
                        <span>BÃO CỨT (x30)</span>
                      </button>
                    </div>
                  </div>

                  {/* Launch Duel Button */}
                  <button
                    type="button"
                    onClick={handleStartDuel}
                    disabled={balance < wager}
                    className={`w-full py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                      balance < wager
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25 active:scale-98 cursor-pointer ring-1 ring-amber-300'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
                    <span>
                      {balance < wager
                        ? 'SỐ DƯ KHÔNG ĐỦ ĐẶT CƯỢC'
                        : `XÁC NHẬN SOLO 1V1 • CƯỢC ${wager.toLocaleString('vi-VN')} XU`}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* ==================== TAB 2: STREAK RUSH (CHUỖI SINH TỒN) ==================== */}
          {activeTab === 'STREAK_RUSH' && (
            <div className="flex flex-col gap-1.5 sm:gap-2.5">
              {/* Top Banner Explaining Streak Rush */}
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-orange-950/80 via-amber-950/60 to-slate-950 rounded-xl border border-orange-500/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 animate-pulse shrink-0" />
                  <div>
                    <h3 className="text-[11px] sm:text-xs font-black text-orange-300 uppercase leading-none">
                      CHUỖI SINH TỒN • ĐẾN x128
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-300 hidden xs:block mt-0.5">
                      Đoán đúng liên tiếp để leo thang nhân thưởng. Bấm Chốt Lời bất kỳ lúc nào!
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 block leading-none">Kỷ Lục:</span>
                  <span className="text-[11px] sm:text-xs font-mono font-black text-amber-400">🔥 {bestStreak} Ván</span>
                </div>
              </div>

              {/* Ladder Multiplier Steps - 8 IN 1 ROW */}
              <div className="grid grid-cols-8 gap-1">
                {STREAK_MULTIPLIERS.map((mult, idx) => {
                  const isCurrent = streakCount === idx;
                  const isPassed = streakCount > idx;
                  return (
                    <div
                      key={idx}
                      className={`p-1 rounded-lg border flex flex-col items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-orange-500 text-slate-950 border-orange-300 ring-2 ring-orange-400 font-black scale-105 shadow-md'
                          : isPassed
                          ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                          : 'bg-slate-950/80 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="text-[7px] sm:text-[8px] font-bold uppercase leading-none">V.{idx}</span>
                      <span className="text-[9px] sm:text-[10px] font-black font-mono leading-none mt-0.5">x{mult.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Gameplay Arena */}
              {streakStatus === 'IDLE' || streakStatus === 'BUSTED' || streakStatus === 'CASHED_OUT' ? (
                /* Setup & Wager Selection */
                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5 sm:gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase">Mức Cược Khởi Đầu</span>
                    <span className="text-xs font-mono font-black text-amber-400">
                      {streakWager.toLocaleString('vi-VN')} Xu
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[20000, 50000, 100000, 200000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { sounds.playClick(); setStreakWager(amt); }}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] sm:text-xs font-mono font-bold cursor-pointer transition-all ${
                          streakWager === amt
                            ? 'bg-orange-500 text-slate-950 border-orange-400 font-black shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                      </button>
                    ))}
                  </div>

                  {/* Shield Power-up Purchase */}
                  <div className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className={`w-3.5 h-3.5 ${hasStreakShield ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-200 block leading-tight">Khiên Cứu Mệnh (30K Xu)</span>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 leading-none">Bảo hiểm 1 lần đoán sai</span>
                      </div>
                    </div>
                    {hasStreakShield ? (
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã Bật
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleBuyStreakShield}
                        disabled={balance < 30000}
                        className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-xs cursor-pointer disabled:opacity-50"
                      >
                        Trang Bị
                      </button>
                    )}
                  </div>

                  {streakStatus === 'BUSTED' && (
                    <div className="p-2 bg-rose-950/80 border border-rose-500 rounded-xl text-center">
                      <span className="text-[11px] font-black text-rose-300 block">💀 CHÁY CHUỖI!</span>
                      <span className="text-[9px] text-rose-200">Bạn đã đoán sai. Hãy thử lại để phục thù!</span>
                    </div>
                  )}

                  {streakStatus === 'CASHED_OUT' && (
                    <div className="p-2 bg-emerald-950/80 border border-emerald-500 rounded-xl text-center">
                      <span className="text-[11px] font-black text-emerald-300 block">🎉 CHỐT LỜI THÀNH CÔNG!</span>
                      <span className="text-[9px] text-emerald-200">
                        Đã cộng <strong>+{currentCashoutVal.toLocaleString('vi-VN')} Xu</strong> vào ví!
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStartStreakGame}
                    disabled={balance < streakWager}
                    className="w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    🚀 BẮT ĐẦU CHUỖI ({streakWager.toLocaleString('vi-VN')} XU)
                  </button>
                </div>
              ) : (
                /* Active Playing & Guessing */
                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl border border-orange-500/40 flex flex-col gap-2">
                  {/* Status & Current Pot */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase block leading-none">Chuỗi Hiện Tại:</span>
                      <span className="text-xs sm:text-sm font-black text-orange-400 font-mono">
                        🔥 VÒNG {streakCount}/7 (x{currentStreakMult.toFixed(2)})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase block leading-none">Tiền Thưởng Nếu Chốt:</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                        {currentCashoutVal.toLocaleString('vi-VN')} Xu
                      </span>
                    </div>
                  </div>

                  {/* Bowl & Dice Area */}
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[85px] sm:min-h-[105px]">
                    {streakRolling ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-3xl animate-bounce">🥣</div>
                        <span className="text-[9px] font-black text-amber-400 animate-pulse">ĐANG TUNG XÚC XẮC...</span>
                      </div>
                    ) : streakLidOpen && streakDices ? (
                      <div className="flex flex-col items-center gap-1 animate-fadeIn">
                        <div className="flex items-center gap-1">
                          {streakDices.map((d, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-200 border border-amber-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center shadow-sm"
                            >
                              {d >= 4 ? '🍚' : '💩'}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-white">
                          Tổng: {streakTotal} Điểm • {streakOutcome === 'COM' ? '🍚 CƠM' : '💩 CỨT'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="text-2xl sm:text-3xl">🥣</div>
                        <span className="text-[10px] text-slate-400 font-bold">Hãy chọn Cơm hoặc Cứt</span>
                      </div>
                    )}
                  </div>

                  {/* Guess Buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRollStreak('COM')}
                      disabled={streakRolling}
                      className="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <span>🍚</span>
                      <span>CHỌN CƠM (11-17)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRollStreak('CUT')}
                      disabled={streakRolling}
                      className="py-2 rounded-xl bg-gradient-to-r from-amber-800 to-amber-950 text-white border border-amber-600 font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <span>💩</span>
                      <span>CHỌN CỨT (4-10)</span>
                    </button>
                  </div>

                  {/* Cashout Button */}
                  {streakCount >= 1 && (
                    <button
                      type="button"
                      onClick={handleCashoutStreak}
                      disabled={streakRolling}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-98 cursor-pointer"
                    >
                      💰 CHỐT LỜI • RÚT {currentCashoutVal.toLocaleString('vi-VN')} XU
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: TOWER GAUNTLET (LEO THÁP) ==================== */}
          {activeTab === 'TOWER_GAUNTLET' && (
            <div className="flex flex-col gap-1.5 sm:gap-2.5">
              {/* Tower Banner */}
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-950 via-slate-950 to-indigo-950 rounded-xl border border-purple-500/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-bounce shrink-0" />
                  <div>
                    <h3 className="text-[11px] sm:text-xs font-black text-purple-300 uppercase leading-none">
                      THÁP VUA CƠM CỨT • 5 TẦNG
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-300 hidden xs:block mt-0.5">
                      Hạ gục 5 Boss liên tiếp nhận x25.0 Tiền Cược & Danh Hiệu!
                    </p>
                  </div>
                </div>
              </div>

              {/* Tower Progress Map - 5 IN 1 ROW */}
              <div className="grid grid-cols-5 gap-1">
                {TOWER_FLOORS.map((tf) => {
                  const isCurrent = towerFloor === tf.floor && (towerStatus === 'FIGHTING' || towerStatus === 'FLOOR_WON');
                  const isCleared = towerFloor > tf.floor || towerStatus === 'TOWER_CLEAR';
                  return (
                    <div
                      key={tf.floor}
                      className={`p-1 rounded-lg border flex flex-col items-center text-center transition-all ${
                        isCurrent
                          ? 'bg-purple-600 text-white border-purple-300 ring-1 ring-purple-400 font-black scale-105 shadow-md'
                          : isCleared
                          ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950/80 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="text-[7px] sm:text-[8px] font-bold leading-none">TẦNG {tf.floor}</span>
                      <img src={tf.boss.avatar} alt={tf.boss.name} className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg my-0.5 object-cover" />
                      <span className="text-[8px] sm:text-[9px] font-black font-mono leading-none">x{tf.multiplier}</span>
                    </div>
                  );
                })}
              </div>

              {/* Tower Arena Interface */}
              {towerStatus === 'IDLE' || towerStatus === 'FAILED' || towerStatus === 'TOWER_CLEAR' ? (
                /* Tower Setup */
                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5 sm:gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase">Vé Khiêu Chiến Tháp</span>
                    <span className="text-xs font-mono font-black text-amber-400">
                      {towerWager.toLocaleString('vi-VN')} Xu
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[50000, 100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { sounds.playClick(); setTowerWager(amt); }}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] sm:text-xs font-mono font-bold cursor-pointer transition-all ${
                          towerWager === amt
                            ? 'bg-purple-600 text-white border-purple-400 font-black shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                      </button>
                    ))}
                  </div>

                  {towerStatus === 'FAILED' && (
                    <div className="p-2 bg-rose-950/80 border border-rose-500 rounded-xl text-center">
                      <span className="text-[11px] font-black text-rose-300 block">❌ THẤT BẠI Ở TẦNG {towerFloor}!</span>
                      <span className="text-[9px] text-rose-200">Boss tháp quá mạnh! Hãy luyện tập và thử lại!</span>
                    </div>
                  )}

                  {towerStatus === 'TOWER_CLEAR' && (
                    <div className="p-2 bg-emerald-950/80 border border-emerald-500 rounded-xl text-center">
                      <span className="text-[11px] font-black text-emerald-300 block">👑 PHÁ ĐẢO THÁP THÀNH CÔNG!</span>
                      <span className="text-[9px] text-emerald-200">
                        Nhận trọn Quỹ Thưởng Tầng 5 và +5.000 EXP Danh Vọng!
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStartTowerGauntlet}
                    disabled={balance < towerWager}
                    className="w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    🏰 VÀO THÁP VUA CƠM ({towerWager.toLocaleString('vi-VN')} XU)
                  </button>
                </div>
              ) : (
                /* Tower Floor Battle */
                <div className="p-2 sm:p-3 bg-slate-950 rounded-xl border border-purple-500/40 flex flex-col gap-1.5 sm:gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-black text-purple-300">
                        {currentFloorData.title}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 block">{currentFloorData.desc}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase block leading-none">Quỹ Thưởng:</span>
                      <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                        {towerPot.toLocaleString('vi-VN')} Xu (x{currentFloorData.multiplier})
                      </span>
                    </div>
                  </div>

                  {/* Battle Bowl Arena */}
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[85px] sm:min-h-[105px]">
                    {towerRolling ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-3xl animate-bounce">🥣</div>
                        <span className="text-[9px] font-black text-purple-400 animate-pulse">BOSS ĐANG LẮC BÁT...</span>
                      </div>
                    ) : towerLidOpen && towerDices ? (
                      <div className="flex flex-col items-center gap-1 animate-fadeIn">
                        <div className="flex items-center gap-1">
                          {towerDices.map((d, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-200 border border-amber-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center shadow-sm"
                            >
                              {d >= 4 ? '🍚' : '💩'}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-white">
                          Tổng: {towerTotal} Điểm • {towerOutcome === 'COM' ? '🍚 CƠM' : '💩 CỨT'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <img
                          src={currentFloorData.boss.avatar}
                          alt={currentFloorData.boss.name}
                          className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg mb-0.5 border border-purple-400 object-cover"
                        />
                        <span className="text-[11px] text-white font-bold leading-none">{currentFloorData.boss.name}</span>
                        <span className="text-[9px] text-purple-300 italic leading-none">"{towerBossComment}"</span>
                      </div>
                    )}
                  </div>

                  {/* User Pick Options */}
                  {towerStatus === 'FIGHTING' && (
                    <div className="flex flex-col gap-1 sm:gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase">Chọn Cửa Đối Đầu:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTowerUserPick('COM')}
                          className={`py-1.5 rounded-lg border text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            towerUserPick === 'COM'
                              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-900 border-slate-800 text-amber-300'
                          }`}
                        >
                          <span>🍚 CƠM (11-17)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTowerUserPick('CUT')}
                          className={`py-1.5 rounded-lg border text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            towerUserPick === 'CUT'
                              ? 'bg-amber-800 text-white border-amber-600 ring-1 ring-amber-500 font-black'
                              : 'bg-slate-900 border-slate-800 text-amber-500'
                          }`}
                        >
                          <span>💩 CỨT (4-10)</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleFightTowerFloor}
                        disabled={towerRolling}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-98 cursor-pointer disabled:opacity-50 mt-0.5"
                      >
                        ⚔️ KHIÊU CHIẾN TẦNG {towerFloor}
                      </button>
                    </div>
                  )}

                  {/* Floor Won Options: Cashout or Advance */}
                  {towerStatus === 'FLOOR_WON' && (
                    <div className="flex flex-col gap-1.5 p-2 bg-slate-900 rounded-xl border border-emerald-500/50 text-center animate-fadeIn">
                      <span className="text-[11px] font-black text-emerald-300 block">
                        🎉 ĐÃ VƯỢT TẦNG {towerFloor}! QUỸ THƯỞNG: {towerPot.toLocaleString('vi-VN')} XU
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                        <button
                          type="button"
                          onClick={handleCashoutTower}
                          className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-xs cursor-pointer"
                        >
                          🛑 RÚT QUỸ ({towerPot.toLocaleString('vi-VN')} Xu)
                        </button>

                        <button
                          type="button"
                          onClick={handleAdvanceToNextFloor}
                          className="py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-black text-xs cursor-pointer shadow-md active:scale-95"
                        >
                          ⚔️ TIẾN LÊN TẦNG {towerFloor + 1} ▶️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Compact Footer with Clear Close Button */}
        <div className="p-1.5 sm:p-2 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between px-3 shrink-0">
          <span className="text-[10px] sm:text-xs text-slate-400">
            Chạm ra ngoài hoặc bấm THOÁT để đóng
          </span>
          <button
            type="button"
            onClick={() => { sounds.playClick(); onClose(); }}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
            <span>THOÁT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
