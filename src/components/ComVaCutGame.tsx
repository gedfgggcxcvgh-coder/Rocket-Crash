import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Coins, Sparkles, RefreshCw, History, Info, Hand, Volume2, VolumeX, Maximize2, Minimize2, PlusCircle, RotateCw, MessageSquare, Send, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { Real3DDice } from './Real3DDice';
import { ChatMessage } from '../types/game';

export type ComCutBetType = 'COM' | 'CUT' | 'BAO_COM' | 'BAO_CUT' | 'COM_GA' | 'CUT_RUOI';

export interface ComCutHistoryItem {
  id: string;
  roundNumber: number;
  dices: [number, number, number];
  total: number;
  result: 'COM' | 'CUT';
  isBao: boolean;
  time: string;
}

interface BotBet {
  id: string;
  name: string;
  avatar: string;
  side: 'COM' | 'CUT';
  amount: number;
}

interface ComVaCutGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onAddFunds: (amount: number) => void;
  isMuted: boolean;
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
}

const CHIP_DENOMINATIONS = [
  { value: 10000, label: '10K', color: 'bg-emerald-600 border-emerald-400 text-white', ring: 'ring-emerald-400' },
  { value: 50000, label: '50K', color: 'bg-sky-600 border-sky-400 text-white', ring: 'ring-sky-400' },
  { value: 100000, label: '100K', color: 'bg-purple-600 border-purple-400 text-white', ring: 'ring-purple-400' },
  { value: 500000, label: '500K', color: 'bg-amber-600 border-amber-400 text-white', ring: 'ring-amber-400' },
  { value: 1000000, label: '1M', color: 'bg-rose-600 border-rose-400 text-white', ring: 'ring-rose-400' },
  { value: 5000000, label: '5M', color: 'bg-yellow-500 border-yellow-200 text-slate-950 font-black', ring: 'ring-yellow-300' },
  { value: 10000000, label: '10M', color: 'bg-slate-900 border-amber-500 text-amber-400 font-black', ring: 'ring-amber-400' },
];

const BOT_NAMES = [
  'Thánh_Ăn_Cơm', 'Húp_Cứt_Cay_Cú', 'Nam_BaoSàn', 'Tuấn_BẻCầu',
  'Long_CháyTúi', 'Minh_GỡNợ', 'Đạt_GàBéo', 'Hoàng_TấtTay',
  'Bảo_ThíchCơmSườn', 'Sơn_ĂnCứtChuyênNghiệp', 'Trùm_LắcBát', 'Huy_MêCơmTấm',
  'Bình_BẻCầuGãyTay', 'Tài_Xỉu_Cơm_Cứt', 'Đại_Gia_Allin'
];

export const ComVaCutGame: React.FC<ComVaCutGameProps> = ({
  balance,
  onUpdateBalance,
  onAddFunds,
  isMuted,
  messages = [],
  onSendMessage,
}) => {
  // Mini Floating Chat State (Available in both Landscape & Portrait)
  const [showMiniChat, setShowMiniChat] = useState<boolean>(false);
  const [miniChatInput, setMiniChatInput] = useState<string>('');
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesCountRef = useRef<number>(messages.length);

  // Fallback internal chat messages if parent doesn't provide
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([
    { id: 'c1', user: 'Thánh_Ăn_Cơm', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Com1', text: 'Tay này bệt Cơm anh em theo tôi! 🍚🔥', time: '15:20' },
    { id: 'c2', user: 'Húp_Cứt_Cay_Cú', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cut2', text: 'Cứt ra 3 ván rồi, quả này đảo Cơm chắc luôn', time: '15:21' },
    { id: 'c3', user: 'Đại_Gia_Allin', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AllIn', text: 'Vào 500k Cơm kiếm bát phở sáng mai nào 🍜', time: '15:22' },
  ]);

  const activeChatList = messages.length > 0 ? messages : internalMessages;

  useEffect(() => {
    if (activeChatList.length > prevMessagesCountRef.current && !showMiniChat) {
      setUnreadChatCount((prev) => Math.min(prev + (activeChatList.length - prevMessagesCountRef.current), 99));
    }
    prevMessagesCountRef.current = activeChatList.length;

    if (showMiniChat && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeChatList.length, showMiniChat]);

  const handleSendChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sounds.playClick();
    if (onSendMessage) {
      onSendMessage(trimmed);
    } else {
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        user: 'Bạn',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=You',
        text: trimmed,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setInternalMessages((prev) => [...prev, newMsg]);
    }
    setMiniChatInput('');
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  // Phases: 'BETTING' (18s) -> 'SHAKING' (3s) -> 'OPENING' (8s nặn bát) -> 'RESULT' (4s)
  const [phase, setPhase] = useState<'BETTING' | 'SHAKING' | 'OPENING' | 'RESULT'>('BETTING');
  const [timeLeft, setTimeLeft] = useState<number>(18);
  const [roundNumber, setRoundNumber] = useState<number>(() => {
    const saved = localStorage.getItem('comcut_round_no');
    return saved ? parseInt(saved, 10) : 1388;
  });

  // User bets this round
  const [userBets, setUserBets] = useState<Record<ComCutBetType, number>>({
    COM: 0,
    CUT: 0,
    BAO_COM: 0,
    BAO_CUT: 0,
    COM_GA: 0,
    CUT_RUOI: 0,
  });
  const [lastRoundBets, setLastRoundBets] = useState<Record<ComCutBetType, number>>({
    COM: 0,
    CUT: 0,
    BAO_COM: 0,
    BAO_CUT: 0,
    COM_GA: 0,
    CUT_RUOI: 0,
  });

  const [selectedChip, setSelectedChip] = useState<number>(50000);

  // Squeeze / Nặn Bát
  const [squeezeMode, setSqueezeMode] = useState<boolean>(true);
  const [lidOffset, setLidOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingLid, setIsDraggingLid] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLidFullyOpen, setIsLidFullyOpen] = useState<boolean>(false);

  // Force Landscape Fullscreen container state
  const [isLandscapeMode, setIsLandscapeMode] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const toggleLandscape = async () => {
    sounds.playClick();
    const next = !isLandscapeMode;
    setIsLandscapeMode(next);

    if (next) {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        if (screen.orientation && 'unlock' in screen.orientation) {
          (screen.orientation as any).unlock();
        }
      } catch {}
    }
  };

  // Live room pools
  const [poolCom, setPoolCom] = useState<number>(36247000);
  const [poolCut, setPoolCut] = useState<number>(36113000);
  const [countCom, setCountCom] = useState<number>(48);
  const [countCut, setCountCut] = useState<number>(49);
  const [recentLiveBets, setRecentLiveBets] = useState<BotBet[]>([]);

  // Dices
  const [dices, setDices] = useState<[number, number, number]>([4, 5, 2]);
  const [diceRotations, setDiceRotations] = useState<[number, number, number]>([12, -8, 25]);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [lastResultOutcome, setLastResultOutcome] = useState<'COM' | 'CUT' | null>(null);

  // Floating score alert
  const [scoreNotification, setScoreNotification] = useState<{ text: string; positive: boolean } | null>(null);

  // History / Cầu Soi
  const [history, setHistory] = useState<ComCutHistoryItem[]>(() => {
    return [
      { id: '1', roundNumber: 1384, dices: [4, 5, 3], total: 12, result: 'COM', isBao: false, time: '14:20' },
      { id: '2', roundNumber: 1385, dices: [1, 2, 4], total: 7, result: 'CUT', isBao: false, time: '14:21' },
      { id: '3', roundNumber: 1386, dices: [2, 3, 3], total: 8, result: 'CUT', isBao: false, time: '14:22' },
      { id: '4', roundNumber: 1387, dices: [6, 4, 5], total: 15, result: 'COM', isBao: false, time: '14:23' },
    ];
  });

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const comCount = history.filter((h) => h.result === 'COM').length;
  const cutCount = history.filter((h) => h.result === 'CUT').length;
  const totalRounds = history.length || 1;
  const comPercent = Math.round((comCount / totalRounds) * 100);
  const cutPercent = 100 - comPercent;

  // Dice info
  const getDiceContent = (val: number) => {
    switch (val) {
      case 1: return { icon: '💩', label: '1 - Cứt Nhão', isCom: false };
      case 2: return { icon: '💩', label: '2 - Cứt Đôi', isCom: false };
      case 3: return { icon: '💩', label: '3 - Cứt Bốc Khói', isCom: false };
      case 4: return { icon: '🍚', label: '4 - Cơm Trắng', isCom: true };
      case 5: return { icon: '🍗', label: '5 - Cơm Gà', isCom: true };
      case 6: return { icon: '🦞', label: '6 - Cơm Tôm', isCom: true };
      default: return { icon: '🍚', label: 'Cơm', isCom: true };
    }
  };

  // Sound triggers
  useEffect(() => {
    if (phase === 'SHAKING') {
      sounds.playDiceShake();
      setIsLidFullyOpen(false);
      setLidOffset({ x: 0, y: 0 });
    }
  }, [phase]);

  // Main game timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) {
          // Dynamic live room bets
          if (phase === 'BETTING' && Math.random() > 0.35) {
            const side: 'COM' | 'CUT' = Math.random() > 0.49 ? 'COM' : 'CUT';
            const chipOpts = [20000, 50000, 100000, 200000, 500000, 1000000];
            const amt = chipOpts[Math.floor(Math.random() * chipOpts.length)];
            const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

            if (side === 'COM') {
              setPoolCom((c) => c + amt);
              setCountCom((c) => c + 1);
            } else {
              setPoolCut((c) => c + amt);
              setCountCut((c) => c + 1);
            }

            setRecentLiveBets((list) => [
              {
                id: Math.random().toString(),
                name: bot,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot}`,
                side,
                amount: amt,
              },
              ...list.slice(0, 10),
            ]);
          }
          return prev - 1;
        }

        // Transitions
        if (phase === 'BETTING') {
          setPhase('SHAKING');
          return 3;
        } else if (phase === 'SHAKING') {
          // Generate new dice values
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          const d3 = Math.floor(Math.random() * 6) + 1;
          setDices([d1, d2, d3]);
          setDiceRotations([
            Math.floor(Math.random() * 30) - 15,
            Math.floor(Math.random() * 30) - 15,
            Math.floor(Math.random() * 30) - 15,
          ]);

          if (squeezeMode) {
            setPhase('OPENING');
            setIsLidFullyOpen(false);
            setLidOffset({ x: 0, y: 0 });
            return 8; // 8s to squeeze
          } else {
            finalizeRound([d1, d2, d3]);
            return 4;
          }
        } else if (phase === 'OPENING') {
          finalizeRound(dices);
          return 4;
        } else if (phase === 'RESULT') {
          // New round
          setRoundNumber((r) => {
            const next = r + 1;
            localStorage.setItem('comcut_round_no', next.toString());
            return next;
          });
          setLastRoundBets({ ...userBets });
          setUserBets({
            COM: 0,
            CUT: 0,
            BAO_COM: 0,
            BAO_CUT: 0,
            COM_GA: 0,
            CUT_RUOI: 0,
          });
          setLastWinAmount(0);
          setLastResultOutcome(null);
          setIsLidFullyOpen(false);
          setLidOffset({ x: 0, y: 0 });
          setPoolCom(32000000 + Math.floor(Math.random() * 20000000));
          setPoolCut(30000000 + Math.floor(Math.random() * 20000000));
          setCountCom(35 + Math.floor(Math.random() * 20));
          setCountCut(33 + Math.floor(Math.random() * 20));
          setPhase('BETTING');
          return 18;
        }
        return 10;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, dices, userBets, balance, squeezeMode]);

  // Finalize round and credit payout
  const finalizeRound = (currentDices: [number, number, number]) => {
    setIsLidFullyOpen(true);
    setPhase('RESULT');

    const [d1, d2, d3] = currentDices;
    const total = d1 + d2 + d3;
    const isBao = d1 === d2 && d2 === d3;
    const isBaoCom = isBao && d1 >= 4;
    const isBaoCut = isBao && d1 <= 3;
    const isCom = total >= 11 && total <= 17 && !isBao;
    const isCut = total >= 4 && total <= 10 && !isBao;
    const outcome: 'COM' | 'CUT' = isBao ? (d1 >= 4 ? 'COM' : 'CUT') : (total >= 11 ? 'COM' : 'CUT');

    setLastResultOutcome(outcome);

    if (outcome === 'COM') {
      sounds.playYumSound();
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#ffffff']
      });
    } else {
      sounds.playFartSound();
    }

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setHistory((prev) => [
      {
        id: Math.random().toString(),
        roundNumber,
        dices: [d1, d2, d3],
        total,
        result: outcome,
        isBao,
        time: nowStr,
      },
      ...prev.slice(0, 49),
    ]);

    // Calculate winnings
    let winTotal = 0;
    if (isCom && userBets.COM > 0) {
      winTotal += userBets.COM * 1.98;
    }
    if (isCut && userBets.CUT > 0) {
      winTotal += userBets.CUT * 1.98;
    }
    if (isBaoCom && userBets.BAO_COM > 0) {
      winTotal += userBets.BAO_COM * 30;
    }
    if (isBaoCut && userBets.BAO_CUT > 0) {
      winTotal += userBets.BAO_CUT * 30;
    }
    if ((total === 13 || total === 14) && userBets.COM_GA > 0) {
      winTotal += userBets.COM_GA * 8;
    }
    if ((total === 7 || total === 8) && userBets.CUT_RUOI > 0) {
      winTotal += userBets.CUT_RUOI * 8;
    }

    if (winTotal > 0) {
      const finalWon = Math.floor(winTotal);
      setLastWinAmount(finalWon);
      const nextBal = balance + finalWon;
      onUpdateBalance(nextBal);
      sounds.playWin();

      setScoreNotification({
        text: `+${finalWon.toLocaleString('vi-VN')} Xu`,
        positive: true,
      });
      setTimeout(() => setScoreNotification(null), 3500);

      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });
    }
  };

  // Squeeze dragging
  const handleTouchOrMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'OPENING' || isLidFullyOpen) return;
    setIsDraggingLid(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - lidOffset.x, y: clientY - lidOffset.y };
    sounds.playLidSlide();
  };

  const handleTouchOrMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingLid) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const nextX = clientX - dragStartRef.current.x;
    const nextY = clientY - dragStartRef.current.y;

    setLidOffset({ x: nextX, y: nextY });

    const dist = Math.sqrt(nextX * nextX + nextY * nextY);
    if (dist > 110) {
      setIsDraggingLid(false);
      finalizeRound(dices);
    }
  }, [isDraggingLid, dices]);

  const handleTouchOrMouseUp = useCallback(() => {
    if (!isDraggingLid) return;
    setIsDraggingLid(false);
    const dist = Math.sqrt(lidOffset.x * lidOffset.x + lidOffset.y * lidOffset.y);
    if (dist > 75) {
      finalizeRound(dices);
    } else {
      setLidOffset({ x: 0, y: 0 });
    }
  }, [isDraggingLid, lidOffset, dices]);

  useEffect(() => {
    if (isDraggingLid) {
      window.addEventListener('mousemove', handleTouchOrMouseMove);
      window.addEventListener('mouseup', handleTouchOrMouseUp);
      window.addEventListener('touchmove', handleTouchOrMouseMove);
      window.addEventListener('touchend', handleTouchOrMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleTouchOrMouseMove);
      window.removeEventListener('mouseup', handleTouchOrMouseUp);
      window.removeEventListener('touchmove', handleTouchOrMouseMove);
      window.removeEventListener('touchend', handleTouchOrMouseUp);
    };
  }, [isDraggingLid, handleTouchOrMouseMove, handleTouchOrMouseUp]);

  // Place bet action - Deduct balance immediately
  const handlePlaceBet = (side: ComCutBetType) => {
    if (phase !== 'BETTING') return;
    if (balance < selectedChip) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: 'Số dư không đủ! Hãy nạp thêm Xu',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2500);
      return;
    }

    const nextBal = balance - selectedChip;
    onUpdateBalance(nextBal);

    setUserBets((prev) => ({
      ...prev,
      [side]: prev[side] + selectedChip,
    }));

    if (side === 'COM') setPoolCom((c) => c + selectedChip);
    if (side === 'CUT') setPoolCut((c) => c + selectedChip);

    sounds.playChipClink();

    setScoreNotification({
      text: `-${selectedChip.toLocaleString('vi-VN')} Xu`,
      positive: false,
    });
    setTimeout(() => setScoreNotification(null), 1500);
  };

  const handleDoubleBet = () => {
    if (phase !== 'BETTING') return;
    const currentTotal = Object.values(userBets).reduce((a, b) => a + b, 0);
    if (currentTotal === 0 || balance < currentTotal) {
      sounds.playErrorBeep();
      return;
    }
    onUpdateBalance(balance - currentTotal);
    setUserBets((prev) => {
      const doubled = { ...prev };
      (Object.keys(doubled) as ComCutBetType[]).forEach((k) => {
        doubled[k] = doubled[k] * 2;
      });
      return doubled;
    });
    sounds.playChipClink();
  };

  const handleReBet = () => {
    if (phase !== 'BETTING') return;
    const previousTotal = Object.values(lastRoundBets).reduce((a, b) => a + b, 0);
    if (previousTotal === 0 || balance < previousTotal) {
      sounds.playErrorBeep();
      return;
    }
    onUpdateBalance(balance - previousTotal);
    setUserBets({ ...lastRoundBets });
    sounds.playChipClink();
  };

  const clearBets = () => {
    if (phase !== 'BETTING') return;
    const totalPlaced = Object.values(userBets).reduce((a, b) => a + b, 0);
    if (totalPlaced > 0) {
      onUpdateBalance(balance + totalPlaced);
      setUserBets({
        COM: 0,
        CUT: 0,
        BAO_COM: 0,
        BAO_CUT: 0,
        COM_GA: 0,
        CUT_RUOI: 0,
      });
      sounds.playClick();
    }
  };

  const totalUserBet = Object.values(userBets).reduce((a, b) => a + b, 0);
  const currentTotalDice = dices[0] + dices[1] + dices[2];
  const isLandscapeActive = isLandscapeMode && !isPortrait;

  return (
    <div
      className={`w-full flex flex-col gap-2 max-w-6xl mx-auto pb-4 select-none transition-all ${
        isLandscapeActive
          ? 'fixed inset-0 z-[9999] bg-[#070a13] p-1.5 sm:p-2.5 flex flex-col justify-between overflow-hidden h-screen'
          : ''
      }`}
    >
      {/* Friendly Landscape Device Rotation Helper (When Fullscreen requested but still in Portrait) */}
      {isLandscapeMode && isPortrait && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(245,158,11,0.3)] animate-bounce">
            <RotateCw className="w-10 h-10 text-amber-400 animate-spin [animation-duration:3s]" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider mb-2">
            Vui Lòng Xoay Ngang Điện Thoại 🔄
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
            Hãy bật tính năng <strong>Tự động xoay</strong> của điện thoại và cầm ngang máy để mở rộng bàn cược Sicbo toàn màn hình cực đã!
          </p>
          <button
            onClick={() => setIsLandscapeMode(false)}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-600 text-white font-bold text-xs cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            ✕ Chơi ở màn hình dọc bình thường
          </button>
        </div>
      )}

      {/* Top Banner: Game Name, Round, Wallet Balance with Quick Add */}
      <div className={`flex flex-wrap items-center justify-between gap-1.5 bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-yellow-950/80 border border-amber-500/40 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md shrink-0 ${
        isLandscapeActive ? 'p-1 px-2.5' : 'p-2 sm:p-2.5 px-3 sm:px-4'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`${isLandscapeActive ? 'w-6 h-6 text-sm' : 'w-8 h-8 sm:w-9 sm:h-9 text-lg'} rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black`}>
            🍚
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className={`${isLandscapeActive ? 'text-xs' : 'text-xs sm:text-sm'} font-black text-white tracking-wide uppercase flex items-center gap-1`}>
                <span className="text-amber-400">CƠM</span> HAY <span className="text-amber-600">CỨT</span> 💩
              </h2>
              <span className="text-[9px] bg-red-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                SICBO
              </span>
            </div>
            {!isLandscapeActive && <p className="text-[10px] text-slate-400">Phiên #{roundNumber}</p>}
          </div>
        </div>

        {/* In Landscape: Mini History Bead Strip inline */}
        {isLandscapeActive && (
          <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full border border-amber-500/20">
            <span className="text-[9px] text-amber-400 font-bold mr-0.5">Cầu:</span>
            {history.slice(0, 8).map((h, i) => (
              <span key={i} className="text-xs" title={`#${h.roundNumber}: ${h.total}đ`}>
                {h.result === 'COM' ? '🍚' : '💩'}
              </span>
            ))}
          </div>
        )}

        {/* Live User Wallet Balance Display */}
        <div className={`flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/40 rounded-xl shadow-inner ${
          isLandscapeActive ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 sm:px-3 py-1 text-xs'
        }`}>
          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-bold">Ví:</span>
            <span className="font-mono-numbers font-black text-amber-300 text-xs sm:text-sm">
              {balance.toLocaleString('vi-VN')} Xu
            </span>
          </div>
          <button
            onClick={() => onAddFunds(500000)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 cursor-pointer active:scale-95 transition-all"
            title="Nạp thêm 500.000 Xu miễn phí"
          >
            <PlusCircle className="w-3 h-3" />
            <span>+500K</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* ROTATE LANDSCAPE BUTTON */}
          <button
            onClick={toggleLandscape}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer shadow-md active:scale-95 ${
              isLandscapeMode
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 hover:bg-rose-900'
                : 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border-amber-400 text-amber-300 hover:bg-amber-500/35 ring-1 ring-amber-400/50'
            }`}
            title={isLandscapeMode ? 'Thoát chế độ toàn màn hình ngang' : 'Bật chế độ toàn màn hình ngang'}
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span>{isLandscapeMode ? '✕ Thu Nhỏ' : '🔄 Xoay Ngang'}</span>
          </button>

          {/* Mini Chat Toggle Button with unread badge */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowMiniChat(!showMiniChat);
              if (!showMiniChat) setUnreadChatCount(0);
            }}
            className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
              showMiniChat
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 ring-2 ring-indigo-400/40'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Mở chat phòng trực tuyến"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Chat</span>
            {unreadChatCount > 0 && !showMiniChat && (
              <span className="absolute -top-1.5 -right-1 px-1 min-w-[15px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce shadow">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Nặn Bát Toggle */}
          <button
            onClick={() => setSqueezeMode(!squeezeMode)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
              squeezeMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Bật/Tắt chế độ tự tay nặn bát hồi hộp"
          >
            <Hand className="w-3 h-3" />
            <span className="hidden xs:inline">Nặn Bát:</span>
            <span className={`font-black ${squeezeMode ? 'text-amber-400' : 'text-slate-500'}`}>
              {squeezeMode ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {/* Soi Cầu Toggle */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
          >
            <History className="w-3 h-3 text-amber-400" />
            <span className="hidden xs:inline">Soi Cầu</span>
          </button>

          {/* Luật Chơi */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
          >
            <Info className="w-3 h-3 text-sky-400" />
          </button>
        </div>
      </div>

      {/* Floating score notification toast */}
      {scoreNotification && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-2xl shadow-2xl font-mono-numbers font-black text-xs sm:text-sm border animate-in zoom-in-95 duration-200 ${
            scoreNotification.positive
              ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300 shadow-emerald-500/30'
              : 'bg-red-950/95 border-red-500 text-red-300 shadow-red-500/30'
          }`}
        >
          {scoreNotification.text}
        </div>
      )}

      {/* DẢI HẠT SOI CẦU DẠNG CASINO (CHỈ HIỆN KHI Ở MÀN HÌNH DỌC) */}
      {!isLandscapeActive && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-1.5 px-3 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shadow-md">
          <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold text-slate-400">
            <span className="text-amber-400">Cầu:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {history.slice(0, 18).map((h, i) => (
              <div
                key={h.id}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shadow-sm shrink-0 border transition-all ${
                  h.result === 'COM'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                    : 'bg-yellow-950 border-yellow-700 text-yellow-500'
                } ${i === 0 ? 'scale-110 ring-2 ring-white/70 animate-pulse' : 'opacity-85'}`}
                title={`Phiên #${h.roundNumber}: ${h.total}đ - ${h.result === 'COM' ? 'CƠM' : 'CỨT'}`}
              >
                {h.result === 'COM' ? '🍚' : '💩'}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold font-mono">
            <span className="text-amber-400">🍚 {comPercent}%</span>
            <span className="text-yellow-600">💩 {cutPercent}%</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BÀN NGANG ĐÍCH THỰC (HORIZONTAL OVAL CASINO TABLE) */}
      {/* KHÔNG BỊ XẾP DỌC TRÊN MOBILE! Luôn nằm trên 1 hàng ngang */}
      {/* ============================================================== */}
      <div className={`relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#1b120c] via-[#0b101c] to-[#070a13] border-2 sm:border-4 border-amber-600/60 shadow-[0_0_50px_rgba(217,119,6,0.2)] flex flex-col items-center justify-between overflow-hidden ${
        isLandscapeActive ? 'p-1.5 flex-1 min-h-0' : 'p-2 sm:p-4 my-auto'
      }`}>
        {/* Glow ambient aura */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />

        {/* 1. STATUS BADGE */}
        <div className={`z-10 flex items-center gap-2 ${isLandscapeActive ? 'mb-0.5' : 'mb-2'}`}>
          {phase === 'BETTING' && (
            <div className={`rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 font-black flex items-center gap-1.5 shadow-md ${
              isLandscapeActive ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px] sm:text-xs'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ĐANG ĐẶT CƯỢC ({timeLeft}s)</span>
            </div>
          )}
          {phase === 'SHAKING' && (
            <div className={`rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 font-black flex items-center gap-1.5 shadow-md animate-bounce ${
              isLandscapeActive ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px] sm:text-xs'
            }`}>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>ĐANG XÓC ĐĨA...</span>
            </div>
          )}
          {phase === 'OPENING' && (
            <div className={`rounded-full bg-purple-950/90 border border-purple-500/60 text-purple-300 font-black flex items-center gap-1.5 shadow-md animate-pulse ${
              isLandscapeActive ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px] sm:text-xs'
            }`}>
              <Hand className="w-3 h-3 text-amber-400" />
              <span>{squeezeMode ? 'KÉO ĐỂ NẶN BÁT!' : 'CHUẨN BỊ MỞ!'} ({timeLeft}s)</span>
            </div>
          )}
          {phase === 'RESULT' && (
            <div
              className={`rounded-full border font-black flex items-center gap-1.5 shadow-xl animate-in zoom-in-95 ${
                isLandscapeActive ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px] sm:text-xs'
              } ${
                lastResultOutcome === 'COM'
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                  : 'bg-yellow-950/90 border-yellow-600 text-yellow-400'
              }`}
            >
              <span>{lastResultOutcome === 'COM' ? '🍚 KẾT QUẢ: ĂN CƠM!' : '💩 KẾT QUẢ: HÚP CỨT!'}</span>
              <span className="font-mono bg-black/50 px-1.5 py-0.2 rounded text-white font-bold">
                {currentTotalDice}đ
              </span>
            </div>
          )}
        </div>

        {/* 2. CHÍNH GIỮA: 3 KHỐI NẰM CÙNG 1 HÀNG NGANG */}
        <div className="w-full flex flex-row items-center justify-between gap-1.5 sm:gap-3 z-10 flex-1 min-h-0">
          {/* CỬA CƠM (BÊN TRÁI ~ 34% WIDTH) */}
          <div
            onClick={() => handlePlaceBet('COM')}
            className={`flex-1 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between shadow-xl relative overflow-hidden group ${
              isLandscapeActive ? 'p-1.5 h-full min-h-0' : 'p-2 sm:p-4 min-h-[190px] sm:min-h-[240px]'
            } ${
              userBets.COM > 0
                ? 'bg-gradient-to-b from-amber-950/90 via-slate-900 to-amber-950/90 border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/40'
                : 'bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-amber-950/30 border-amber-500/40 hover:border-amber-400'
            } ${phase === 'RESULT' && lastResultOutcome === 'COM' ? 'ring-4 ring-amber-400 animate-pulse' : ''} ${
              phase !== 'BETTING' ? 'cursor-default' : 'active:scale-[0.98]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className={`${isLandscapeActive ? 'text-lg sm:text-xl' : 'text-2xl sm:text-4xl'} drop-shadow-md`}>🍚</span>
                  <div>
                    <h3 className={`${isLandscapeActive ? 'text-sm sm:text-base' : 'text-base sm:text-2xl'} font-black text-amber-300 uppercase leading-none`}>
                      CƠM
                    </h3>
                    <span className="text-[9px] sm:text-xs text-amber-400 font-bold">11 - 17</span>
                  </div>
                </div>
                <span className="text-[8px] sm:text-xs bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-black">
                  1:1.98
                </span>
              </div>

              {/* Room pool */}
              <div className={`text-center rounded-xl bg-black/50 border border-amber-500/20 ${
                isLandscapeActive ? 'my-0.5 py-0.5 px-1' : 'my-1.5 sm:my-2 py-1 sm:py-1.5 px-1 sm:px-2'
              }`}>
                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-semibold">Phòng Cược</span>
                <div className={`font-mono-numbers font-black text-amber-400 leading-tight truncate ${
                  isLandscapeActive ? 'text-xs sm:text-sm' : 'text-xs sm:text-lg'
                }`}>
                  {poolCom.toLocaleString('vi-VN')} Xu
                </div>
                <span className="text-[7px] sm:text-[9px] text-slate-500">{countCom} người</span>
              </div>
            </div>

            {/* User bet and Button */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center justify-between text-[9px] sm:text-xs px-0.5">
                <span className="text-slate-400">Bạn cược:</span>
                <span className="font-mono-numbers font-black text-amber-300 text-[10px] sm:text-sm">
                  {userBets.COM.toLocaleString('vi-VN')} Xu
                </span>
              </div>
              <button
                disabled={phase !== 'BETTING'}
                className={`w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 ${
                  isLandscapeActive ? 'py-1 text-[9px] sm:text-[10px]' : 'py-1.5 sm:py-2.5 text-[10px] sm:text-xs'
                }`}
              >
                {userBets.COM > 0 ? '+ CƯỢC THÊM' : 'CƯỢC CƠM'}
              </button>
            </div>
          </div>

          {/* ĐĨA LẮC & BÁT ÚP RỒNG (Ở CHÍNH GIỮA) */}
          <div className={`shrink-0 flex flex-col items-center justify-center relative py-0.5 ${
            isLandscapeActive ? 'w-[115px] xs:w-[130px] sm:w-[160px]' : 'w-[140px] xs:w-[170px] sm:w-[230px]'
          }`}>
            {/* Countdown clock on top */}
            <div className={`${isLandscapeActive ? 'mb-0.5' : 'mb-1.5'} flex items-center justify-center`}>
              <div className={`${
                isLandscapeActive ? 'w-6 h-6 border' : 'w-10 h-10 sm:w-13 sm:h-13 border-2 sm:border-3'
              } rounded-full bg-slate-950 border-amber-500/80 shadow-[0_0_15px_rgba(217,119,6,0.4)] flex flex-col items-center justify-center`}>
                <span
                  className={`font-mono-numbers font-black leading-none ${
                    isLandscapeActive ? 'text-xs' : 'text-sm sm:text-lg'
                  } ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}
                >
                  {timeLeft}
                </span>
                {!isLandscapeActive && <span className="text-[7px] text-slate-400 uppercase font-bold">Giây</span>}
              </div>
            </div>

            {/* Plate & Dices */}
            <div
              className={`relative rounded-full bg-gradient-to-tr from-amber-950 via-slate-900 to-amber-900 border-2 sm:border-5 border-amber-500/90 shadow-[0_0_35px_rgba(217,119,6,0.35)] flex items-center justify-center ${
                isLandscapeActive ? 'w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32' : 'w-40 h-40 xs:w-48 xs:h-48 sm:w-60 sm:h-60'
              } ${phase === 'SHAKING' ? 'animate-plate-rattle shadow-[0_0_55px_rgba(245,158,11,0.6)]' : ''}`}
            >
              {/* Inner plate felt */}
              <div className="absolute inset-1 sm:inset-1.5 rounded-full border border-dashed border-amber-400/40 flex items-center justify-center">
                <div className="absolute inset-0.5 sm:inset-1 rounded-full bg-gradient-to-b from-[#2e0808] via-[#170303] to-[#230606] shadow-[inset_0_4px_25px_rgba(0,0,0,0.9)] flex items-center justify-center p-1">
                  {/* 3 Real 3D Ivory Dices in Classic Casino Triangle Formation */}
                  <div className="flex flex-col items-center justify-center z-10">
                    {/* Top Dice */}
                    <div className="flex justify-center -mb-1">
                      <Real3DDice
                        value={dices[0]}
                        isShaking={phase === 'SHAKING'}
                        size={isLandscapeActive ? 24 : 44}
                        rotationAngle={diceRotations[0]}
                      />
                    </div>
                    {/* Bottom 2 Dices */}
                    <div className={`flex items-center justify-center ${isLandscapeActive ? 'gap-1.5' : 'gap-3 sm:gap-4'}`}>
                      <Real3DDice
                        value={dices[1]}
                        isShaking={phase === 'SHAKING'}
                        size={isLandscapeActive ? 24 : 44}
                        rotationAngle={diceRotations[1]}
                      />
                      <Real3DDice
                        value={dices[2]}
                        isShaking={phase === 'SHAKING'}
                        size={isLandscapeActive ? 24 : 44}
                        rotationAngle={diceRotations[2]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* The Ceramic Lid (Bát Úp) - Interactive Dragging */}
              {!isLidFullyOpen && (
                <div
                  onMouseDown={handleTouchOrMouseDown}
                  onTouchStart={handleTouchOrMouseDown}
                  style={{
                    transform: `translate(${lidOffset.x}px, ${lidOffset.y}px) ${
                      phase === 'SHAKING' ? 'rotate(3deg)' : ''
                    }`,
                    transition: isDraggingLid ? 'none' : 'transform 0.3s ease-out',
                  }}
                  className={`absolute inset-0 rounded-full bg-gradient-to-br from-slate-800 via-slate-900 to-amber-950 border-2 sm:border-4 border-amber-400 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-30 select-none ${
                    phase === 'OPENING' ? 'ring-2 ring-amber-400/60 animate-pulse' : ''
                  }`}
                >
                  <div className={`${isLandscapeActive ? 'w-5 h-5' : 'w-8 h-8 sm:w-11 sm:h-11'} rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border border-white/60 shadow-md flex items-center justify-center mb-0.5`}>
                    <span className={isLandscapeActive ? 'text-xs' : 'text-sm sm:text-lg'}>🍚</span>
                  </div>
                  <span className={`text-amber-300 font-black tracking-wider uppercase text-center px-1 ${
                    isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-xs'
                  }`}>
                    {phase === 'SHAKING'
                      ? 'Đang Xóc...'
                      : phase === 'OPENING'
                      ? '👆 NẶN BÁT'
                      : 'Bát Rồng'}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Open or Fast Shake Button */}
            <div className="flex items-center gap-1 mt-0.5">
              {phase === 'OPENING' && !isLidFullyOpen && (
                <button
                  onClick={() => finalizeRound(dices)}
                  className="px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] shadow-md cursor-pointer active:scale-95"
                >
                  MỞ NHANH ⚡
                </button>
              )}
              {phase === 'BETTING' && !isLandscapeActive && (
                <button
                  onClick={() => {
                    setPhase('SHAKING');
                    setTimeLeft(3);
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                >
                  Xóc Ngay
                </button>
              )}
            </div>

            {/* Win announcement badge */}
            {phase === 'RESULT' && lastWinAmount > 0 && (
              <div className="mt-0.5 py-0.5 px-2 rounded-full bg-emerald-950/95 border border-emerald-400 text-emerald-300 flex items-center gap-1 shadow-lg animate-in zoom-in-95">
                <span className="text-[10px]">🎉</span>
                <span className="font-mono-numbers font-black text-white text-[10px] sm:text-xs">
                  +{lastWinAmount.toLocaleString('vi-VN')} Xu
                </span>
              </div>
            )}
          </div>

          {/* CỬA CỨT (BÊN PHẢI ~ 34% WIDTH) */}
          <div
            onClick={() => handlePlaceBet('CUT')}
            className={`flex-1 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between shadow-xl relative overflow-hidden group ${
              isLandscapeActive ? 'p-1.5 h-full min-h-0' : 'p-2 sm:p-4 min-h-[190px] sm:min-h-[240px]'
            } ${
              userBets.CUT > 0
                ? 'bg-gradient-to-b from-yellow-950/90 via-slate-900 to-yellow-950/90 border-yellow-600 shadow-yellow-700/30 ring-2 ring-yellow-600/40'
                : 'bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-yellow-950/30 border-yellow-700/40 hover:border-yellow-600'
            } ${phase === 'RESULT' && lastResultOutcome === 'CUT' ? 'ring-4 ring-yellow-500 animate-pulse' : ''} ${
              phase !== 'BETTING' ? 'cursor-default' : 'active:scale-[0.98]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className={`${isLandscapeActive ? 'text-lg sm:text-xl' : 'text-2xl sm:text-4xl'} drop-shadow-md`}>💩</span>
                  <div>
                    <h3 className={`${isLandscapeActive ? 'text-sm sm:text-base' : 'text-base sm:text-2xl'} font-black text-yellow-500 uppercase leading-none`}>
                      CỨT
                    </h3>
                    <span className="text-[9px] sm:text-xs text-yellow-600 font-bold">4 - 10</span>
                  </div>
                </div>
                <span className="text-[8px] sm:text-xs bg-yellow-600/20 text-yellow-400 px-1 py-0.5 rounded font-black">
                  1:1.98
                </span>
              </div>

              {/* Room pool */}
              <div className={`text-center rounded-xl bg-black/50 border border-yellow-700/20 ${
                isLandscapeActive ? 'my-0.5 py-0.5 px-1' : 'my-1.5 sm:my-2 py-1 sm:py-1.5 px-1 sm:px-2'
              }`}>
                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-semibold">Phòng Cược</span>
                <div className={`font-mono-numbers font-black text-yellow-500 leading-tight truncate ${
                  isLandscapeActive ? 'text-xs sm:text-sm' : 'text-xs sm:text-lg'
                }`}>
                  {poolCut.toLocaleString('vi-VN')} Xu
                </div>
                <span className="text-[7px] sm:text-[9px] text-slate-500">{countCut} người</span>
              </div>
            </div>

            {/* User bet and Button */}
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center justify-between text-[9px] sm:text-xs px-0.5">
                <span className="text-slate-400">Bạn cược:</span>
                <span className="font-mono-numbers font-black text-yellow-400 text-[10px] sm:text-sm">
                  {userBets.CUT.toLocaleString('vi-VN')} Xu
                </span>
              </div>
              <button
                disabled={phase !== 'BETTING'}
                className={`w-full rounded-xl bg-gradient-to-r from-yellow-600 to-amber-700 text-white font-black uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 ${
                  isLandscapeActive ? 'py-1 text-[9px] sm:text-[10px]' : 'py-1.5 sm:py-2.5 text-[10px] sm:text-xs'
                }`}
              >
                {userBets.CUT > 0 ? '+ CƯỢC THÊM' : 'CƯỢC CỨT'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. CỬA PHỤ NGANG DƯỚI BÁT (BÃO & KÈO ĐẶC BIỆT) */}
        <div className={`w-full grid grid-cols-4 border-t border-slate-800/80 shrink-0 ${
          isLandscapeActive ? 'gap-1 mt-0.5 pt-0.5' : 'gap-1.5 sm:gap-2 z-10 mt-2.5 pt-2'
        }`}>
          <div
            onClick={() => handlePlaceBet('BAO_COM')}
            className={`rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5'
            } ${
              userBets.BAO_COM > 0
                ? 'bg-amber-950/80 border-amber-400 shadow-md'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>🍚🍚🍚</span>
            <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Bão Cơm</span>
            <span className="text-[7px] sm:text-[8px] text-amber-400 font-bold">x30</span>
          </div>

          <div
            onClick={() => handlePlaceBet('BAO_CUT')}
            className={`rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5'
            } ${
              userBets.BAO_CUT > 0
                ? 'bg-yellow-950/80 border-yellow-600 shadow-md'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>💩💩💩</span>
            <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Bão Cứt</span>
            <span className="text-[7px] sm:text-[8px] text-yellow-400 font-bold">x30</span>
          </div>

          <div
            onClick={() => handlePlaceBet('COM_GA')}
            className={`rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5'
            } ${
              userBets.COM_GA > 0
                ? 'bg-amber-950/80 border-amber-400 shadow-md'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>🍗🍚</span>
            <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Cơm Gà</span>
            <span className="text-[7px] sm:text-[8px] text-amber-400 font-bold">x8</span>
          </div>

          <div
            onClick={() => handlePlaceBet('CUT_RUOI')}
            className={`rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5'
            } ${
              userBets.CUT_RUOI > 0
                ? 'bg-yellow-950/80 border-yellow-600 shadow-md'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>🪰💩</span>
            <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Cứt Ruồi</span>
            <span className="text-[7px] sm:text-[8px] text-yellow-400 font-bold">x8</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DẢI CHIP CASINO & NÚT TIỆN ÍCH DÀN HÀNG NGANG */}
      {/* ============================================================== */}
      <div className={`bg-slate-900/90 border border-slate-800 rounded-xl sm:rounded-2xl flex flex-wrap items-center justify-between gap-1 shadow-lg shrink-0 ${
        isLandscapeActive ? 'p-1 px-2' : 'p-2 sm:p-2.5'
      }`}>
        {/* Chip Denominations */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-0.5">
          {CHIP_DENOMINATIONS.map((chip) => {
            const isSelected = selectedChip === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => setSelectedChip(chip.value)}
                className={`relative rounded-full flex flex-col items-center justify-center border-2 border-dashed shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isLandscapeActive ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-10 h-10 sm:w-12 sm:h-12'
                } ${chip.color} ${
                  isSelected
                    ? `scale-110 -translate-y-0.5 ring-2 sm:ring-3 ${chip.ring} brightness-110`
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <div className={`rounded-full border border-white/40 flex items-center justify-center font-mono-numbers font-black ${
                  isLandscapeActive ? 'w-5 h-5 sm:w-6 sm:h-6 text-[8px] sm:text-[9px]' : 'w-7 h-7 sm:w-8 sm:h-8 text-[10px] sm:text-xs'
                }`}>
                  {chip.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Casino Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleReBet}
            disabled={phase !== 'BETTING'}
            className={`rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-slate-200 cursor-pointer disabled:opacity-40 ${
              isLandscapeActive ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]'
            }`}
          >
            ⟲ Cược Lại
          </button>
          <button
            onClick={handleDoubleBet}
            disabled={phase !== 'BETTING' || totalUserBet === 0}
            className={`rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-amber-300 cursor-pointer disabled:opacity-40 ${
              isLandscapeActive ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]'
            }`}
          >
            ✖2 Gấp Đôi
          </button>
          <button
            onClick={() => setSelectedChip(Math.max(10000, balance))}
            className={`rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 font-black text-amber-300 cursor-pointer ${
              isLandscapeActive ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]'
            }`}
          >
            ⚡ Tất Tay
          </button>
          {totalUserBet > 0 && phase === 'BETTING' && (
            <button
              onClick={clearBets}
              className={`rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 font-bold text-red-300 cursor-pointer ${
                isLandscapeActive ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]'
              }`}
            >
              ✕ Hủy
            </button>
          )}
        </div>
      </div>

      {/* Live Bets Feed in Room (CHỈ HIỆN KHI Ở MÀN HÌNH DỌC) */}
      {!isLandscapeActive && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2 px-3 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Người chơi khác vừa vào tiền:</span>
            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Trực Tiếp
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {recentLiveBets.slice(0, 8).map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-xl shrink-0 text-[10px]"
              >
                <img src={b.avatar} alt={b.name} className="w-3.5 h-3.5 rounded-full" />
                <span className="font-semibold text-slate-300 max-w-[65px] truncate">{b.name}</span>
                <span className={b.side === 'COM' ? 'text-amber-400 font-black' : 'text-yellow-500 font-black'}>
                  {b.side === 'COM' ? '🍚' : '💩'} +{(b.amount / 1000)}k
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>📖</span> Luật Chơi Cơm Hay Cứt (Sicbo)
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Trò chơi sử dụng <strong>3 viên xí ngầu xúc xắc</strong> điểm từ 1 đến 6:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong className="text-amber-400">CỬA CƠM (Tài):</strong> Tổng điểm 3 viên từ <strong>11 đến 17</strong>. Tỉ lệ ăn 1 : 1.98.
                </li>
                <li>
                  <strong className="text-yellow-500">CỬA CỨT (Xỉu):</strong> Tổng điểm 3 viên từ <strong>4 đến 10</strong>. Tỉ lệ ăn 1 : 1.98.
                </li>
                <li>
                  <strong className="text-purple-400">BÃO:</strong> 3 viên cùng điểm (ví dụ 1-1-1 hoặc 6-6-6), nhà cái ăn cả Cơm và Cứt, chỉ trả thưởng cho người đặt cửa Bão (x30 lần).
                </li>
                <li>
                  <strong className="text-emerald-400">TÍNH NĂNG NẶN BÁT:</strong> Khi mở bát, bạn có thể rê chuột hoặc vuốt tay để kéo nắp bát hé lộ từng viên xúc xắc chuẩn casino!
                </li>
              </ul>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                💡 <em>Dùng chung ví Xu và tài khoản Discord với Rocket Crash.</em>
              </div>
            </div>
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              ĐÃ HIỂU
            </button>
          </div>
        </div>
      )}

      {/* HISTORY / SOI CẦU MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-lg w-full shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>📊</span> Lịch Sử Soi Cầu Cơm & Cứt
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-2xl">🍚</span>
                <div className="text-lg font-black text-amber-400 font-mono-numbers">{comPercent}%</div>
                <span className="text-xs text-slate-400">CƠM ({comCount} phiên)</span>
              </div>
              <div className="p-3 rounded-2xl bg-yellow-950/60 border border-yellow-700/40">
                <span className="text-2xl">💩</span>
                <div className="text-lg font-black text-yellow-500 font-mono-numbers">{cutPercent}%</div>
                <span className="text-xs text-slate-400">CỨT ({cutCount} phiên)</span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <span className="font-mono text-slate-500">#{item.roundNumber}</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                    <span>{item.dices.join(' - ')}</span>
                    <span className="text-slate-400">({item.total}đ)</span>
                  </div>
                  <span
                    className={`font-black px-2 py-0.5 rounded-full text-[11px] ${
                      item.result === 'COM'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-yellow-950 text-yellow-500'
                    }`}
                  >
                    {item.result === 'COM' ? '🍚 CƠM' : '💩 CỨT'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLOATING MINI CHAT (CỬA SỔ CHAT NỔI NHỎ CHUẨN CASINO GO88/SUNWIN) */}
      {/* ============================================================== */}
      {/* 1. Nút bong bóng chat nổi tròn ở góc dưới bên phải */}
      {!showMiniChat && (
        <button
          onClick={() => {
            sounds.playClick();
            setShowMiniChat(true);
            setUnreadChatCount(0);
          }}
          className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 text-white shadow-[0_4px_25px_rgba(99,102,241,0.55)] border-2 border-white/70 flex items-center justify-center cursor-pointer active:scale-90 hover:scale-105 transition-all group"
          title="Mở chat phòng nổi"
        >
          <MessageSquare className="w-5 h-5 text-white" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 border border-white text-white text-[9px] font-black flex items-center justify-center animate-bounce shadow-md">
              {unreadChatCount}
            </span>
          )}
        </button>
      )}

      {/* 2. Cửa sổ chat nổi nhỏ có thể gõ và tương tác */}
      {showMiniChat && (
        <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-[10001] w-72 sm:w-80 h-[270px] xs:h-[310px] bg-slate-950/95 backdrop-blur-xl border-2 border-amber-500/60 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 select-text">
          {/* Mini Chat Header */}
          <div className="flex items-center justify-between p-2 px-3 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 border-b border-amber-500/30 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-indigo-300" />
              </div>
              <div>
                <h4 className="text-[11px] font-black text-amber-300 uppercase leading-none">Chat Phòng Cơm Cứt</h4>
                <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Trực tiếp
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowMiniChat(false)}
              className="w-5 h-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
              title="Thu nhỏ chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-2 space-y-1.5 text-xs scrollbar-thin scrollbar-thumb-slate-800"
          >
            {activeChatList.map((msg) => (
              <div key={msg.id} className="flex items-start gap-1.5 leading-snug">
                <img src={msg.avatar} alt={msg.user} className="w-4 h-4 rounded-full shrink-0 mt-0.5 border border-slate-700" />
                <div className="flex flex-col min-w-0 bg-slate-900/80 rounded-xl p-1 px-2 border border-slate-800/80">
                  <div className="flex items-center gap-1 text-[9px]">
                    <span className="font-bold text-amber-400 truncate max-w-[100px]">{msg.user}</span>
                    <span className="text-slate-500 text-[8px]">{msg.time}</span>
                  </div>
                  <p className="text-slate-200 text-[10px] break-words">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Emote / Fast Chat Tags */}
          <div className="flex items-center gap-1 p-1 px-2 bg-slate-900/90 border-t border-slate-800/60 overflow-x-auto scrollbar-none shrink-0">
            {['🍚 Cơm về bờ!', '💩 Bệt Cứt!', '⚡ Tất tay!', '🔥 Uy tín!', '🎉 Lộc lá!'].map((quickText) => (
              <button
                key={quickText}
                onClick={() => handleSendChat(quickText)}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 shrink-0 cursor-pointer transition-all active:scale-95"
              >
                {quickText}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat(miniChatInput);
            }}
            className="p-1 px-2 bg-slate-950 border-t border-amber-500/30 flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={miniChatInput}
              onChange={(e) => setMiniChatInput(e.target.value)}
              placeholder="Gáy vài câu..."
              maxLength={100}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!miniChatInput.trim()}
              className="w-6 h-6 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold shadow-md cursor-pointer disabled:opacity-40 active:scale-95 shrink-0"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
