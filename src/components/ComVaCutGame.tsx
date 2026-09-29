import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Coins, Sparkles, RefreshCw, History, Info, Hand, Volume2, VolumeX, Maximize2, Minimize2, PlusCircle, RotateCw, MessageSquare, Send, X, Lock, Menu, Wifi, Trophy, Swords, Shield, Flame, Award, Gift, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { Real3DDice } from './Real3DDice';
import { ChatMessage, ComCutGameState, ComCutPhase, ComCutBetType, ComCutHistoryItem, ComCutBotBet, ComCutActiveEvent, ComCutEventType } from '../types/game';
import { COMCUT_EVENTS_CONFIG } from '../utils/comCutBosses';
import { GameHubModal } from './GameHubModal';
import { ComCutDuelModal } from './ComCutDuelModal';

export type { ComCutBetType, ComCutHistoryItem, ComCutBotBet };

interface ComVaCutGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onAddFunds: (amount: number) => void;
  isMuted: boolean;
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  onOpenGameHub?: () => void;
  onSwitchGame?: (game: 'ROCKET' | 'COM_CUT') => void;
  serverGameState?: ComCutGameState | null;
  currentUserId?: string;
  onOpenLeaderboard?: () => void;
  onComCutBet?: (amount: number) => void;
  onComCutRoundFinish?: (data: { betTotal: number; winTotal: number; isBao: boolean }) => void;
  onAwardExp?: (exp: number) => void;
  userRankInfo?: {
    icon: string;
    tierName: string;
    division: string;
    level: number;
    badgeBg: string;
    border: string;
  };
}

const comCutSyncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('comcut_cross_tab_sync')
  : null;

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
  onOpenGameHub,
  onSwitchGame,
  serverGameState,
  currentUserId,
  onOpenLeaderboard,
  onComCutBet,
  onComCutRoundFinish,
  onAwardExp,
  userRankInfo,
}) => {
  // Game Hub Switcher Modal State
  const [showGameHub, setShowGameHub] = useState<boolean>(false);

  // Solo 1v1 Bát Vàng Modal State
  const [showSoloDuelModal, setShowSoloDuelModal] = useState<boolean>(false);

  // Dynamic In-Game Events State
  const [currentEvent, setCurrentEvent] = useState<ComCutActiveEvent | null>(null);
  const currentEventRef = useRef<ComCutActiveEvent | null>(null);
  useEffect(() => { currentEventRef.current = currentEvent; }, [currentEvent]);

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

  // Local fallback server state if parent didn't provide via SSE
  const [localServerState, setLocalServerState] = useState<ComCutGameState | null>(null);

  useEffect(() => {
    if (serverGameState) return;
    let isMounted = true;
    const fetchState = () => {
      fetch('/api/comcut/state')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data && isMounted) {
            setLocalServerState(data);
          }
        })
        .catch(() => {});
    };
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [serverGameState]);

  const effectiveServerState = serverGameState || localServerState;

  // Synchronized Phases: 'BETTING' (25s: 20s cược + 5s KHÓA CƯỢC) -> 'SHAKING' (3s) -> 'OPENING' (8s nặn bát) -> 'RESULT' (4s)
  const [phase, setPhase] = useState<ComCutPhase>('BETTING');
  const [timeLeft, setTimeLeft] = useState<number>(25);
  // Khóa cược khi không ở phiên cược HOẶC khi bước vào 5 giây cuối của phiên cược
  const isBetLocked = phase !== 'BETTING' || timeLeft <= 5;
  const [roundNumber, setRoundNumber] = useState<number>(() => {
    const saved = localStorage.getItem('comcut_round_no');
    return saved ? parseInt(saved, 10) : 1388;
  });

  // User bets this round
  const [userBets, setUserBets] = useState<Record<ComCutBetType, number>>(() => {
    try {
      const currentR = localStorage.getItem('comcut_round_no') || '1388';
      const saved = localStorage.getItem(`comcut_user_bets_${currentR}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      COM: 0,
      CUT: 0,
      BAO_COM: 0,
      BAO_CUT: 0,
      COM_GA: 0,
      CUT_RUOI: 0,
    };
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
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowDimensions({ width: w, height: h });
      setIsPortrait(h > w);
    };
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const isPhysicalLandscape = !isPortrait;
  const isVirtualLandscape = isLandscapeMode && isPortrait;
  const isLandscapeActive = isLandscapeMode || isPhysicalLandscape;

  const toggleLandscape = async () => {
    sounds.playClick();
    const next = !isLandscapeMode;
    setIsLandscapeMode(next);

    if (next) {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
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
  const [recentLiveBets, setRecentLiveBets] = useState<ComCutBotBet[]>([]);

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
  const historyRef = useRef<ComCutHistoryItem[]>(history);
  useEffect(() => { historyRef.current = history; }, [history]);

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

  // Fresh Refs for state access inside callbacks
  const userBetsRef = useRef(userBets);
  useEffect(() => { userBetsRef.current = userBets; }, [userBets]);

  const balanceRef = useRef(balance);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const roundNumberRef = useRef(roundNumber);
  useEffect(() => { roundNumberRef.current = roundNumber; }, [roundNumber]);

  // Synchronize user bets across open tabs via BroadcastChannel
  const syncUserBetsAcrossTabs = (nextBets: Record<ComCutBetType, number>, nextBal: number) => {
    try {
      localStorage.setItem(`comcut_user_bets_${roundNumberRef.current}`, JSON.stringify(nextBets));
    } catch {}
    if (comCutSyncChannel) {
      comCutSyncChannel.postMessage({
        type: 'COMCUT_SYNC_BETS',
        roundNumber: roundNumberRef.current,
        userBets: nextBets,
        balance: nextBal,
      });
    }
  };

  useEffect(() => {
    if (!comCutSyncChannel) return;
    const handleMsg = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'COMCUT_SYNC_BETS' && data.roundNumber === roundNumberRef.current) {
        if (data.userBets) {
          setUserBets(data.userBets);
        }
      }
    };
    comCutSyncChannel.addEventListener('message', handleMsg);
    return () => {
      comCutSyncChannel.removeEventListener('message', handleMsg);
    };
  }, []);

  // Trigger dynamic in-game events on round change
  useEffect(() => {
    // 50% chance each round to activate a special event
    if (Math.random() < 0.5) {
      const evConfig = COMCUT_EVENTS_CONFIG[Math.floor(Math.random() * COMCUT_EVENTS_CONFIG.length)];
      const newEv: ComCutActiveEvent = {
        id: `ev_${roundNumber}_${Date.now()}`,
        type: evConfig.type,
        title: evConfig.title,
        description: evConfig.description,
        icon: evConfig.icon,
        badge: evConfig.badge,
        color: evConfig.color,
        bgGradient: evConfig.bgGradient,
        multiplierBoost: evConfig.multiplierBoost,
        rewardClaimed: false,
        envelopePos: {
          x: Math.floor(Math.random() * 50) + 25,
          y: Math.floor(Math.random() * 30) + 30,
        },
      };
      setCurrentEvent(newEv);
    } else {
      setCurrentEvent(null);
    }
  }, [roundNumber]);

  // Claim Red Envelope Lucky Airdrop
  const handleClaimRedEnvelope = () => {
    if (!currentEvent || currentEvent.type !== 'RED_ENVELOPE' || currentEvent.rewardClaimed) return;
    sounds.playClaimReward();
    const luckyAmt = (Math.floor(Math.random() * 15) + 5) * 10000; // 50.000 to 200.000 Xu
    onUpdateBalance(balance + luckyAmt);
    setCurrentEvent(prev => prev ? { ...prev, rewardClaimed: true, rewardAmount: luckyAmt } : null);
    setScoreNotification({
      text: `🧧 +${luckyAmt.toLocaleString('vi-VN')} Xu Lì Xì Đại Gia!`,
      positive: true,
    });
    setTimeout(() => setScoreNotification(null), 3500);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  };

  // Spin Lucky Wheel Event
  const handleSpinLuckyWheel = () => {
    if (!currentEvent || currentEvent.type !== 'MYSTERY_LUCKY_WHEEL' || currentEvent.rewardClaimed) return;
    sounds.playClaimReward();
    const wheelPrizes = [50000, 100000, 150000, 200000, 300000, 500000];
    const luckyAmt = wheelPrizes[Math.floor(Math.random() * wheelPrizes.length)];
    onUpdateBalance(balance + luckyAmt);
    setCurrentEvent(prev => prev ? { ...prev, rewardClaimed: true, rewardAmount: luckyAmt } : null);
    setScoreNotification({
      text: `🎡 +${luckyAmt.toLocaleString('vi-VN')} Xu Vòng Quay Bát Quái!`,
      positive: true,
    });
    setTimeout(() => setScoreNotification(null), 3500);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
  };

  // Claim God of Wealth Blessing Event
  const handleClaimGodOfWealth = () => {
    if (!currentEvent || currentEvent.type !== 'GOD_OF_WEALTH_BLESSING' || currentEvent.rewardClaimed) return;
    sounds.playClaimReward();
    const luckyAmt = 88888;
    onUpdateBalance(balance + luckyAmt);
    onAwardExp?.(500);
    setCurrentEvent(prev => prev ? { ...prev, rewardClaimed: true, rewardAmount: luckyAmt } : null);
    setScoreNotification({
      text: `👑 +88.888 Xu & +500 EXP Lộc Thần Tài Giáng Lâm!`,
      positive: true,
    });
    setTimeout(() => setScoreNotification(null), 3500);
    confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
  };

  // Sync with Server Authoritative State
  const prevPhaseRef = useRef<ComCutPhase>('BETTING');
  const prevRoundRef = useRef<number>(roundNumber);
  const prevTimeLeftRef = useRef<number>(timeLeft);

  // Handle final result payout and audio
  const handleServerResult = useCallback((s: ComCutGameState) => {
    const [d1, d2, d3] = s.dices;
    const total = d1 + d2 + d3;
    const isBao = d1 === d2 && d2 === d3;
    const isBaoCom = isBao && d1 >= 4;
    const isBaoCut = isBao && d1 <= 3;
    const isCom = total >= 11 && total <= 17 && !isBao;
    const isCut = total >= 4 && total <= 10 && !isBao;
    const outcome = s.outcome;

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

    const currentBets = userBetsRef.current;
    const betTotal = (currentBets.COM || 0) + (currentBets.CUT || 0) + (currentBets.BAO_COM || 0) + (currentBets.BAO_CUT || 0) + (currentBets.COM_GA || 0) + (currentBets.CUT_RUOI || 0);

    const activeEv = currentEventRef.current;
    const isBaoStorm = activeEv?.type === 'GOLDEN_STORM';
    const isChickenFeast = activeEv?.type === 'CHICKEN_FEAST';
    const isFrenzy = activeEv?.type === 'LUCKY_FRENZY';
    const isGoldenPoop = activeEv?.type === 'GOLDEN_POOP';
    const isShield = activeEv?.type === 'FORTUNE_SHIELD';
    const isDoubleCom = activeEv?.type === 'DOUBLE_COM_RAIN';
    const isPoopReversal = activeEv?.type === 'POOP_REVERSAL';
    const isMeteorJackpot = activeEv?.type === 'METEOR_JACKPOT';
    const isGodOfWealth = activeEv?.type === 'GOD_OF_WEALTH_BLESSING';

    const comMult = isDoubleCom ? 2.50 : isFrenzy ? 2.1 : 1.98;
    const cutMult = isFrenzy ? 2.1 : 1.98;
    const baoMult = isBaoStorm ? 35 : 30;
    const gaMult = isChickenFeast ? 10 : 8;

    let winTotal = 0;
    if (isCom && currentBets.COM > 0) winTotal += currentBets.COM * comMult;
    if (isCut && currentBets.CUT > 0) winTotal += currentBets.CUT * cutMult;
    if (isBaoCom && currentBets.BAO_COM > 0) winTotal += currentBets.BAO_COM * baoMult;
    if (isBaoCut && currentBets.BAO_CUT > 0) winTotal += currentBets.BAO_CUT * baoMult;
    if ((total === 13 || total === 14) && currentBets.COM_GA > 0) winTotal += currentBets.COM_GA * gaMult;
    if ((total === 7 || total === 8) && currentBets.CUT_RUOI > 0) winTotal += currentBets.CUT_RUOI * 8;

    // Bonus for Golden Poop event if outcome is CUT
    if (isGoldenPoop && isCut && (currentBets.CUT > 0 || currentBets.BAO_CUT > 0)) {
      winTotal += 100000;
    }

    // Meteor Jackpot bonus for Bao or Com Ga winners
    if (isMeteorJackpot && ((isBaoCom || isBaoCut) || (total === 13 || total === 14)) && winTotal > 0) {
      winTotal += 500000;
    }

    // Poop Reversal: If outcome flipped from previous round, add +30% to winning payout!
    const lastResult = historyRef.current?.[0]?.result;
    if (isPoopReversal && lastResult && lastResult !== outcome && winTotal > 0) {
      winTotal += Math.floor(winTotal * 0.3);
    }

    // God of Wealth blessing: +10% bonus payout
    if (isGodOfWealth && winTotal > 0) {
      winTotal += Math.floor(winTotal * 0.1);
    }

    // Fortune Shield 50% refund if lost
    let shieldRefund = 0;
    if (isShield && winTotal === 0 && betTotal > 0) {
      shieldRefund = Math.floor(betTotal * 0.5);
    }

    const payoutKey = `comcut_payout_awarded_${s.roundNumber}`;
    const alreadyAwarded = localStorage.getItem(payoutKey);
    if (!alreadyAwarded) {
      localStorage.setItem(payoutKey, 'true');

      if (betTotal > 0) {
        onComCutRoundFinish?.({
          betTotal,
          winTotal: Math.floor(winTotal + shieldRefund),
          isBao: isBaoCom || isBaoCut,
        });
        if (isGodOfWealth) {
          onAwardExp?.(300);
        }
      }

      if (winTotal > 0) {
        const finalWon = Math.floor(winTotal);
        setLastWinAmount(finalWon);
        const nextBal = balanceRef.current + finalWon;
        onUpdateBalance(nextBal);
        sounds.playWin();

        setScoreNotification({
          text: `+${finalWon.toLocaleString('vi-VN')} Xu${isBaoStorm ? ' (BÃO VÀNG x35!)' : isChickenFeast ? ' (CƠM GÀ x10!)' : ''}`,
          positive: true,
        });
        setTimeout(() => setScoreNotification(null), 3500);

        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.65 },
          colors: ['#fbbf24', '#f59e0b', '#10b981', '#ffffff']
        });
      } else if (shieldRefund > 0) {
        const nextBal = balanceRef.current + shieldRefund;
        onUpdateBalance(nextBal);
        sounds.playClaimReward();
        setScoreNotification({
          text: `🛡️ Khiên Thần Tài: Hoàn +${shieldRefund.toLocaleString('vi-VN')} Xu (50%)!`,
          positive: true,
        });
        setTimeout(() => setScoreNotification(null), 3500);
      }
    }
  }, [onUpdateBalance, onComCutRoundFinish]);

  useEffect(() => {
    if (!effectiveServerState) return;
    const s = effectiveServerState;

    setPhase(s.phase);
    setTimeLeft(s.timeLeft);
    setRoundNumber(s.roundNumber);
    setPoolCom(s.poolCom);
    setPoolCut(s.poolCut);
    setCountCom(s.countCom);
    setCountCut(s.countCut);
    if (Array.isArray(s.history)) setHistory(s.history);
    if (Array.isArray(s.recentLiveBets)) setRecentLiveBets(s.recentLiveBets);

    // Warning chime when entering locked betting window at 5s
    if (s.phase === 'BETTING' && s.timeLeft === 5 && prevTimeLeftRef.current !== 5) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: '🔒 HẾT THỜI GIAN ĐẶT! HỆ THỐNG ĐÃ KHÓA CƯỢC',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2500);
    }
    prevTimeLeftRef.current = s.timeLeft;

    // Check round number change
    if (s.roundNumber !== prevRoundRef.current) {
      prevRoundRef.current = s.roundNumber;
      localStorage.setItem('comcut_round_no', s.roundNumber.toString());
      setLastRoundBets({ ...userBetsRef.current });

      try {
        const saved = localStorage.getItem(`comcut_user_bets_${s.roundNumber}`);
        if (saved) {
          setUserBets(JSON.parse(saved));
        } else {
          setUserBets({ COM: 0, CUT: 0, BAO_COM: 0, BAO_CUT: 0, COM_GA: 0, CUT_RUOI: 0 });
        }
      } catch {
        setUserBets({ COM: 0, CUT: 0, BAO_COM: 0, BAO_CUT: 0, COM_GA: 0, CUT_RUOI: 0 });
      }

      setLastWinAmount(0);
      setLastResultOutcome(null);
      setIsLidFullyOpen(false);
      setLidOffset({ x: 0, y: 0 });
    }

    // Phase transitions
    if (s.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = s.phase;

      if (s.phase === 'SHAKING') {
        sounds.playDiceShake();
        setIsLidFullyOpen(false);
        setLidOffset({ x: 0, y: 0 });
      } else if (s.phase === 'OPENING') {
        setDices(s.dices);
        setDiceRotations(s.diceRotations);
        if (!squeezeMode) {
          setIsLidFullyOpen(true);
        } else {
          setIsLidFullyOpen(false);
          setLidOffset({ x: 0, y: 0 });
        }
      } else if (s.phase === 'RESULT') {
        setIsLidFullyOpen(true);
        setDices(s.dices);
        setDiceRotations(s.diceRotations);
        setLastResultOutcome(s.outcome);

        handleServerResult(s);
      } else if (s.phase === 'BETTING') {
        setIsLidFullyOpen(false);
        setLidOffset({ x: 0, y: 0 });
        setLastWinAmount(0);
        setLastResultOutcome(null);
      }
    } else {
      // Keep dice synced during OPENING and RESULT
      if (s.phase === 'OPENING' || s.phase === 'RESULT') {
        setDices(s.dices);
        setDiceRotations(s.diceRotations);
      }
      if (s.phase === 'RESULT') {
        setLastResultOutcome(s.outcome);
      }
    }
  }, [effectiveServerState, squeezeMode, handleServerResult]);

  // Squeeze dragging
  const handleTouchOrMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'OPENING' || isLidFullyOpen) return;
    setIsDraggingLid(true);
    const rawX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rawY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = isVirtualLandscape ? rawY : rawX;
    const clientY = isVirtualLandscape ? (windowDimensions.width - rawX) : rawY;
    dragStartRef.current = { x: clientX - lidOffset.x, y: clientY - lidOffset.y };
    sounds.playLidSlide();
  };

  const handleTouchOrMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingLid) return;
    const rawX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rawY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = isVirtualLandscape ? rawY : rawX;
    const clientY = isVirtualLandscape ? (windowDimensions.width - rawX) : rawY;
    const nextX = clientX - dragStartRef.current.x;
    const nextY = clientY - dragStartRef.current.y;

    setLidOffset({ x: nextX, y: nextY });

    const dist = Math.sqrt(nextX * nextX + nextY * nextY);
    if (dist > 110) {
      setIsDraggingLid(false);
      setIsLidFullyOpen(true);
    }
  }, [isDraggingLid, isVirtualLandscape, windowDimensions.width]);

  const handleTouchOrMouseUp = useCallback(() => {
    if (!isDraggingLid) return;
    setIsDraggingLid(false);
    const dist = Math.sqrt(lidOffset.x * lidOffset.x + lidOffset.y * lidOffset.y);
    if (dist > 75) {
      setIsLidFullyOpen(true);
    } else {
      setLidOffset({ x: 0, y: 0 });
    }
  }, [isDraggingLid, lidOffset]);

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

  // Place bet action - Deduct balance immediately & sync with server
  const handlePlaceBet = async (side: ComCutBetType) => {
    if (isBetLocked) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: '🔒 Hệ thống đã khóa cược! Vui lòng chờ phiên sau',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2000);
      return;
    }
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
    onComCutBet?.(selectedChip);

    const updatedBets = {
      ...userBets,
      [side]: userBets[side] + selectedChip,
    };
    setUserBets(updatedBets);
    syncUserBetsAcrossTabs(updatedBets, nextBal);

    if (side === 'COM') setPoolCom((c) => c + selectedChip);
    if (side === 'CUT') setPoolCut((c) => c + selectedChip);

    sounds.playChipClink();

    setScoreNotification({
      text: `-${selectedChip.toLocaleString('vi-VN')} Xu`,
      positive: false,
    });
    setTimeout(() => setScoreNotification(null), 1500);

    // Call server endpoint so balance deduction is persisted on server & synced via SSE
    if (currentUserId) {
      try {
        const res = await fetch('/api/comcut/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            side,
            amount: selectedChip,
            roundNumber,
          }),
        });
        const data = await res.json();
        if (res.ok && typeof data.balance === 'number') {
          onUpdateBalance(data.balance);
        }
      } catch (err) {
        console.error('Failed to sync comcut bet with server:', err);
      }
    }
  };

  const handleDoubleBet = () => {
    if (isBetLocked) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: '🔒 Hệ thống đã khóa cược! Vui lòng chờ phiên sau',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2000);
      return;
    }
    const currentTotal = Object.values(userBets).reduce((a, b) => a + b, 0);
    if (currentTotal === 0 || balance < currentTotal) {
      sounds.playErrorBeep();
      return;
    }
    const nextBal = balance - currentTotal;
    onUpdateBalance(nextBal);
    onComCutBet?.(currentTotal);
    const doubled = { ...userBets };
    (Object.keys(doubled) as ComCutBetType[]).forEach((k) => {
      const addAmt = doubled[k];
      if (addAmt > 0) {
        doubled[k] = doubled[k] * 2;
        if (currentUserId) {
          fetch('/api/comcut/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              side: k,
              amount: addAmt,
              roundNumber,
            }),
          }).then(res => (res.ok ? res.json() : null)).then(data => {
            if (data && typeof data.balance === 'number') onUpdateBalance(data.balance);
          }).catch(() => {});
        }
      }
    });
    setUserBets(doubled);
    syncUserBetsAcrossTabs(doubled, nextBal);
    sounds.playChipClink();
  };

  const handleReBet = () => {
    if (isBetLocked) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: '🔒 Hệ thống đã khóa cược! Vui lòng chờ phiên sau',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2000);
      return;
    }
    const previousTotal = Object.values(lastRoundBets).reduce((a, b) => a + b, 0);
    if (previousTotal === 0 || balance < previousTotal) {
      sounds.playErrorBeep();
      return;
    }
    const nextBal = balance - previousTotal;
    onUpdateBalance(nextBal);
    onComCutBet?.(previousTotal);
    const reBets = { ...lastRoundBets };
    setUserBets(reBets);
    syncUserBetsAcrossTabs(reBets, nextBal);
    sounds.playChipClink();

    if (currentUserId) {
      (Object.keys(lastRoundBets) as ComCutBetType[]).forEach((k) => {
        const amt = lastRoundBets[k];
        if (amt > 0) {
          fetch('/api/comcut/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              side: k,
              amount: amt,
              roundNumber,
            }),
          }).then(res => (res.ok ? res.json() : null)).then(data => {
            if (data && typeof data.balance === 'number') onUpdateBalance(data.balance);
          }).catch(() => {});
        }
      });
    }
  };

  const clearBets = () => {
    if (isBetLocked) {
      sounds.playErrorBeep();
      return;
    }
    const totalPlaced = Object.values(userBets).reduce((a, b) => a + b, 0);
    if (totalPlaced > 0) {
      const nextBal = balance + totalPlaced;
      onUpdateBalance(nextBal);
      const cleared = {
        COM: 0,
        CUT: 0,
        BAO_COM: 0,
        BAO_CUT: 0,
        COM_GA: 0,
        CUT_RUOI: 0,
      };
      setUserBets(cleared);
      syncUserBetsAcrossTabs(cleared, nextBal);
      sounds.playClick();
    }
  };

  const handleAllIn = () => {
    if (isBetLocked) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: '🔒 Hệ thống đã khóa cược! Vui lòng chờ phiên sau',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2000);
      return;
    }
    if (balance <= 0) {
      sounds.playErrorBeep();
      setScoreNotification({
        text: 'Số dư 0 Xu! Hãy nạp thêm Xu',
        positive: false,
      });
      setTimeout(() => setScoreNotification(null), 2000);
      return;
    }
    sounds.playChipClink();
    setSelectedChip(balance);
    setScoreNotification({
      text: `⚡ Mức cược TẤT TAY: ${balance.toLocaleString('vi-VN')} Xu! Hãy chọn Cơm hoặc Cứt.`,
      positive: true,
    });
    setTimeout(() => setScoreNotification(null), 2500);
  };

  const totalUserBet = Object.values(userBets).reduce((a, b) => a + b, 0);
  const currentTotalDice = dices[0] + dices[1] + dices[2];
  return (
    <div
      style={
        isVirtualLandscape
          ? {
              position: 'fixed',
              top: 0,
              left: `${windowDimensions.width}px`,
              width: `${windowDimensions.height}px`,
              height: `${windowDimensions.width}px`,
              transformOrigin: 'top left',
              transform: 'rotate(90deg)',
              zIndex: 9999,
              overflow: 'hidden',
            }
          : undefined
      }
      className={`w-full flex flex-col max-w-6xl mx-auto select-none transition-all ${
        isLandscapeActive
          ? isVirtualLandscape
            ? 'bg-[#070a13] p-1 sm:p-1.5 flex flex-col justify-between overflow-y-auto max-h-screen gap-1'
            : isLandscapeMode || (isPhysicalLandscape && windowDimensions.height < 600)
            ? 'fixed inset-0 z-[9999] bg-[#070a13] p-1 sm:p-2 flex flex-col justify-between overflow-y-auto max-h-[100dvh] h-[100dvh] gap-1'
            : 'p-1.5 sm:p-2.5 flex flex-col justify-between gap-1.5'
          : 'gap-2 pb-4'
      }`}
    >

      {/* Top Banner: Game Name, Round, Wallet Balance with Quick Add */}
      <div className={`items-center justify-between gap-1 sm:gap-1.5 bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-yellow-950/80 border border-amber-500/40 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md shrink-0 overflow-x-auto scrollbar-none ${
        isLandscapeActive ? 'flex flex-nowrap py-1 px-2' : 'flex flex-wrap p-2 sm:p-2.5 px-3 sm:px-4'
      }`}>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* NÚT THOÁT NGANG DUY NHẤT BÊN TRÁI */}
          {isLandscapeActive && (
            <button
              type="button"
              onClick={toggleLandscape}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 border border-white text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              title="Quay lại màn hình dọc"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>THOÁT NGANG</span>
            </button>
          )}

          {/* NÚT 3 GẠCH ☰ ĐỔI GAME */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              if (onOpenGameHub) onOpenGameHub();
              else setShowGameHub(true);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            title="Nhấn để đổi game khác (Game Hub)"
          >
            <Menu className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] sm:text-xs text-amber-300">Đổi Game</span>
          </button>

          {/* NÚT BẢNG XẾP HẠNG & RANK CHUNG */}
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-yellow-500/50 hover:border-yellow-400 text-yellow-300 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              title="Mở Bảng Xếp Hạng & Hệ Thống Rank Cả 2 Game"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[11px] sm:text-xs">{isLandscapeActive ? 'BXH' : 'Bảng Xếp Hạng'}</span>
            </button>
          )}

          {/* NÚT CHẾ ĐỘ SOLO 1V1 (NGƯỜI THẬT & BOSS) */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowSoloDuelModal(true);
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 border border-red-400/80"
            title="Mở Chế Độ Solo 1v1 (Đấu Người Chơi Thật, Đấu Boss, Chuỗi Sinh Tồn, Leo Tháp)"
          >
            <Swords className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-[11px] sm:text-xs">Solo 1v1 🔥</span>
          </button>

          {/* User Rank Pill in ComVaCut Header */}
          {userRankInfo && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onOpenLeaderboard?.();
              }}
              className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-black cursor-pointer hover:scale-105 active:scale-95 transition-all ${userRankInfo.badgeBg} ${userRankInfo.border} shrink-0`}
              title="Cấp bậc của bạn - Bấm để xem Bảng Xếp Hạng & EXP"
            >
              <span>{userRankInfo.icon}</span>
              <span>{userRankInfo.tierName} {userRankInfo.division}</span>
              <span className="text-[9px] px-1 bg-black/40 rounded font-mono">Lv.{userRankInfo.level}</span>
            </button>
          )}

          <div className={`${isLandscapeActive ? 'w-6 h-6 text-sm' : 'w-8 h-8 sm:w-9 sm:h-9 text-lg'} rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black shrink-0`}>
            🍚
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className={`${isLandscapeActive ? 'text-xs' : 'text-xs sm:text-sm'} font-black text-white tracking-wide uppercase flex items-center gap-1 whitespace-nowrap`}>
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
          <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
            <span className="text-[9px] text-amber-400 font-bold mr-0.5">Cầu:</span>
            {history.slice(0, 8).map((h, i) => (
              <span key={i} className="text-xs" title={`#${h.roundNumber}: ${h.total}đ`}>
                {h.result === 'COM' ? '🍚' : '💩'}
              </span>
            ))}
          </div>
        )}

        {/* Right Action Group */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Live User Wallet Balance Display */}
          <div className={`flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/40 rounded-xl shadow-inner shrink-0 ${
            isLandscapeActive ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 sm:px-3 py-1 text-xs'
          }`}>
            <div className="flex items-center gap-1">
              <span className="text-amber-400 font-bold">Ví:</span>
              <span className="font-mono-numbers font-black text-amber-300 text-xs sm:text-sm">
                {balance >= 10000000 ? `${(balance / 1000000).toFixed(1)}M` : balance.toLocaleString('vi-VN')}
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

          {/* Mini Chat Toggle Button with unread badge */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowMiniChat(!showMiniChat);
              if (!showMiniChat) setUnreadChatCount(0);
            }}
            className={`relative flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
              showMiniChat
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 ring-2 ring-indigo-400/40'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Mở chat phòng trực tuyến"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && !showMiniChat && (
              <span className="absolute -top-1.5 -right-1 px-1 min-w-[15px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce shadow">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Nặn Bát Toggle */}
          <button
            onClick={() => setSqueezeMode(!squeezeMode)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              squeezeMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Bật/Tắt chế độ tự tay nặn bát hồi hộp"
          >
            <Hand className="w-3 h-3" />
            <span className="hidden sm:inline">Nặn Bát:</span>
            <span className={`font-black ${squeezeMode ? 'text-amber-400' : 'text-slate-500'}`}>
              {squeezeMode ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {/* Soi Cầu Toggle */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 transition-all cursor-pointer shrink-0"
            title="Xem bảng lịch sử soi cầu"
          >
            <History className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Soi Cầu</span>
          </button>

          {/* Luật Chơi */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1 px-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 transition-all cursor-pointer shrink-0"
            title="Hướng dẫn luật chơi"
          >
            <Info className="w-3 h-3 text-sky-400" />
          </button>

          {/* ROTATE LANDSCAPE BUTTON (Chỉ hiện khi đang ở màn hình dọc để xoay sang ngang) */}
          {!isLandscapeActive && (
            <button
              onClick={toggleLandscape}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-black transition-all cursor-pointer shadow-md active:scale-95 shrink-0 bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border-amber-400 text-amber-300 hover:bg-amber-500/35 ring-1 ring-amber-400/50"
              title="Xoay ngang màn hình chuẩn Casino"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Xoay Ngang</span>
            </button>
          )}
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

      {/* SỰ KIỆN ĐỘNG BÀN CƯỢC CƠM HAY CỨT */}
      {currentEvent && (
        <div className={`${
          isLandscapeActive ? 'py-1 px-2.5 rounded-xl gap-2' : 'p-2.5 sm:p-3 rounded-2xl gap-2.5'
        } border bg-gradient-to-r ${currentEvent.bgGradient} flex items-center justify-between shadow-xl animate-fadeIn shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`${isLandscapeActive ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} shrink-0 animate-bounce`}>{currentEvent.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`${isLandscapeActive ? 'text-xs' : 'text-xs sm:text-sm'} font-black uppercase tracking-wide ${currentEvent.color}`}>
                  {currentEvent.title}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-black/60 text-yellow-300 border border-yellow-400/40 uppercase">
                  {currentEvent.badge}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-200 font-medium truncate sm:whitespace-normal">
                {currentEvent.description}
              </p>
            </div>
          </div>

          {currentEvent.type === 'RED_ENVELOPE' && !currentEvent.rewardClaimed && (
            <button
              type="button"
              onClick={handleClaimRedEnvelope}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs shadow-lg animate-pulse active:scale-95 cursor-pointer shrink-0"
            >
              🧧 Nhận Lì Xì!
            </button>
          )}

          {currentEvent.type === 'MYSTERY_LUCKY_WHEEL' && !currentEvent.rewardClaimed && (
            <button
              type="button"
              onClick={handleSpinLuckyWheel}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-black text-xs shadow-lg animate-pulse active:scale-95 cursor-pointer shrink-0"
            >
              🎡 Quay Bát Quái!
            </button>
          )}

          {currentEvent.type === 'GOD_OF_WEALTH_BLESSING' && !currentEvent.rewardClaimed && (
            <button
              type="button"
              onClick={handleClaimGodOfWealth}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs shadow-lg animate-bounce active:scale-95 cursor-pointer shrink-0"
            >
              👑 Nhận Lộc 88K!
            </button>
          )}
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
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex flex-col items-center justify-center font-mono-numbers font-black shadow-sm shrink-0 border transition-all ${
                  h.result === 'COM'
                    ? 'bg-gradient-to-b from-amber-500/30 to-amber-600/40 border-amber-400 text-amber-300 shadow-amber-500/20'
                    : 'bg-gradient-to-b from-yellow-950 to-yellow-900 border-yellow-600 text-yellow-400 shadow-yellow-800/20'
                } ${i === 0 ? 'scale-110 ring-2 ring-white/90 animate-pulse' : 'opacity-90'}`}
                title={`Phiên #${h.roundNumber}: ${h.total} điểm (${h.dices.join('-')}) - ${h.result === 'COM' ? 'CƠM' : 'CỨT'}`}
              >
                <span className="text-[9px] sm:text-[10px] leading-none">{h.total}</span>
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
          {phase === 'BETTING' && !isBetLocked && (
            <div className={`rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 font-black flex items-center gap-1.5 shadow-md ${
              isLandscapeActive ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px] sm:text-xs'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ĐANG ĐẶT CƯỢC ({timeLeft - 5}s)</span>
            </div>
          )}
          {phase === 'BETTING' && isBetLocked && (
            <div className={`rounded-full bg-rose-950/95 border-2 border-rose-500 text-rose-300 font-black flex items-center gap-1.5 shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse ${
              isLandscapeActive ? 'px-2.5 py-0.5 text-[9px]' : 'px-3.5 py-1 text-[11px] sm:text-xs'
            }`}>
              <Lock className="w-3 h-3 text-rose-400 animate-bounce" />
              <span>🔒 ĐÃ KHÓA CƯỢC ({timeLeft}s)</span>
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
            className={`flex-1 rounded-2xl border-2 transition-all select-none flex flex-col justify-between shadow-xl relative overflow-hidden group ${
              isLandscapeActive ? 'p-1.5 h-full min-h-0' : 'p-2 sm:p-4 min-h-[190px] sm:min-h-[240px]'
            } ${
              userBets.COM > 0
                ? 'bg-gradient-to-b from-amber-950/90 via-slate-900 to-amber-950/90 border-amber-400 shadow-amber-500/30 ring-2 ring-amber-400/40'
                : 'bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-amber-950/30 border-amber-500/40 hover:border-amber-400'
            } ${phase === 'RESULT' && lastResultOutcome === 'COM' ? 'ring-4 ring-amber-400 animate-pulse' : ''} ${
              isBetLocked ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className={`${isLandscapeActive ? 'text-base sm:text-lg' : 'text-2xl sm:text-4xl'} drop-shadow-md`}>🍚</span>
                  <div>
                    <h3 className={`${isLandscapeActive ? 'text-xs sm:text-sm' : 'text-base sm:text-2xl'} font-black text-amber-300 uppercase leading-none`}>
                      CƠM
                    </h3>
                    <span className={`${isLandscapeActive ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-xs'} text-amber-400 font-black`}>11 - 17 Điểm</span>
                  </div>
                </div>
                <span className={`${isLandscapeActive ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-xs'} bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-black`}>
                  1:1.98
                </span>
              </div>

              {/* Room pool */}
              <div className={`text-center rounded-xl bg-black/50 border border-amber-500/20 ${
                isLandscapeActive ? 'my-0.5 py-0.5 px-1' : 'my-1.5 sm:my-2 py-1 sm:py-1.5 px-1 sm:px-2'
              }`}>
                <span className={`${isLandscapeActive ? 'text-[7px]' : 'text-[8px] sm:text-[10px]'} text-slate-400 uppercase font-semibold leading-none block`}>Phòng Cược</span>
                <div className={`font-mono-numbers font-black text-amber-400 leading-tight truncate ${
                  isLandscapeActive ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-lg'
                }`}>
                  {poolCom.toLocaleString('vi-VN')} Xu
                </div>
                <span className={`${isLandscapeActive ? 'text-[6px]' : 'text-[7px] sm:text-[9px]'} text-slate-500 leading-none`}>{countCom} người</span>
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
                disabled={isBetLocked}
                className={`w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black uppercase tracking-wider shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLandscapeActive ? 'py-0.5 text-[8px] sm:text-[9px]' : 'py-1.5 sm:py-2.5 text-[10px] sm:text-xs'
                } ${isBetLocked ? 'grayscale' : 'cursor-pointer active:scale-95'}`}
              >
                {isBetLocked ? '🔒 ĐÃ KHÓA' : (userBets.COM > 0 ? '+ CƯỢC THÊM' : 'CƯỢC CƠM')}
              </button>
            </div>
          </div>

          {/* ĐĨA LẮC & BÁT ÚP (Ở CHÍNH GIỮA) */}
          <div className={`shrink-0 flex flex-col items-center justify-center relative py-0.5 ${
            isLandscapeActive ? 'w-[115px] xs:w-[130px] sm:w-[160px]' : 'w-[140px] xs:w-[170px] sm:w-[230px]'
          }`}>
            {/* Countdown clock on top */}
            <div className={`${isLandscapeActive ? 'mb-0.5' : 'mb-1.5'} flex items-center justify-center`}>
              <div className={`${
                isLandscapeActive ? 'w-6 h-6 border' : 'w-10 h-10 sm:w-12 sm:h-12 border-2 sm:border-3'
              } rounded-full bg-slate-950 ${
                isBetLocked && phase === 'BETTING'
                  ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse'
                  : 'border-amber-500/80 shadow-[0_0_15px_rgba(217,119,6,0.4)]'
              } flex flex-col items-center justify-center`}>
                <span
                  className={`font-mono-numbers font-black leading-none ${
                    isLandscapeActive ? 'text-xs' : 'text-sm sm:text-lg'
                  } ${
                    isBetLocked && phase === 'BETTING'
                      ? 'text-rose-400 animate-pulse'
                      : timeLeft <= 5
                      ? 'text-red-400 animate-pulse'
                      : 'text-amber-400'
                  }`}
                >
                  {phase === 'BETTING' && !isBetLocked ? timeLeft - 5 : timeLeft}
                </span>
                {!isLandscapeActive && (
                  <span className={`text-[7px] uppercase font-bold ${
                    isBetLocked && phase === 'BETTING' ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {isBetLocked && phase === 'BETTING' ? 'Khóa' : 'Giây'}
                  </span>
                )}
              </div>
            </div>

            {/* Plate & Dices */}
            <div
              className={`relative rounded-full bg-gradient-to-tr from-amber-950 via-slate-900 to-amber-900 border-2 sm:border-4 border-amber-500/90 shadow-[0_0_35px_rgba(217,119,6,0.35)] flex items-center justify-center ${
                isLandscapeActive ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-40 h-40 xs:w-48 xs:h-48 sm:w-60 sm:h-60'
              } ${phase === 'SHAKING' ? 'animate-plate-rattle shadow-[0_0_55px_rgba(245,158,11,0.6)]' : ''}`}
            >
              {/* Inner plate felt */}
              <div className="absolute inset-1 sm:inset-1.5 rounded-full border border-dashed border-amber-400/40 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0.5 sm:inset-1 rounded-full bg-gradient-to-b from-[#2e0808] via-[#170303] to-[#230606] shadow-[inset_0_4px_25px_rgba(0,0,0,0.9)] flex items-center justify-center p-1 relative">
                  {/* Dynamic warm golden glow revealed as lid slides */}
                  <div
                    style={{
                      opacity: isLidFullyOpen ? 0.35 : Math.min(Math.hypot(lidOffset.x, lidOffset.y) / 80, 0.85),
                    }}
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.45)_0%,_transparent_75%)] pointer-events-none transition-opacity duration-150"
                  />
                  {/* 3 Real 3D Ivory Dices in Classic Casino Triangle Formation */}
                  <div className="flex flex-col items-center justify-center z-10">
                    {/* Top Dice */}
                    <div className="flex justify-center -mb-1">
                      <Real3DDice
                        value={dices[0]}
                        isShaking={phase === 'SHAKING'}
                        size={isLandscapeActive ? 22 : 44}
                        rotationAngle={diceRotations[0]}
                      />
                    </div>
                    {/* Bottom 2 Dices */}
                    <div className={`flex items-center justify-center ${isLandscapeActive ? 'gap-1' : 'gap-3 sm:gap-4'}`}>
                      <Real3DDice
                        value={dices[1]}
                        isShaking={phase === 'SHAKING'}
                        size={isLandscapeActive ? 22 : 44}
                        rotationAngle={diceRotations[1]}
                      />
                      <Real3DDice
                        value={dices[2]}
                        isShaking={phase === 'SHAKING'}
                        size={isLandscapeActive ? 22 : 44}
                        rotationAngle={diceRotations[2]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* The Ceramic Lid (Bát Úp ĐẶC KÍN 100% KHÔNG TRONG SUỐT) - Interactive Dragging */}
              {!isLidFullyOpen && (
                <div
                  onMouseDown={handleTouchOrMouseDown}
                  onTouchStart={handleTouchOrMouseDown}
                  style={{
                    transform: `translate3d(${lidOffset.x}px, ${lidOffset.y}px, 0) ${
                      phase === 'SHAKING' ? 'rotate(3deg)' : ''
                    }`,
                    transition: isDraggingLid ? 'none' : 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    touchAction: 'none',
                    willChange: 'transform',
                  }}
                  className={`absolute inset-0 rounded-full opacity-100 bg-[#150f0b] border-3 sm:border-5 border-amber-400 shadow-[0_20px_45px_rgba(0,0,0,0.98)] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-30 select-none overflow-hidden ${
                    phase === 'OPENING'
                      ? 'ring-4 ring-amber-400/90 shadow-[0_0_40px_rgba(245,158,11,0.8)]'
                      : ''
                  }`}
                >
                  {/* Layer gốm sứ hoàng gia đặc kín 100% tuyệt đối không xuyên thấu */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2a1d15] via-[#1a120c] to-[#0a0604] rounded-full opacity-100" />
                  
                  {/* Vòng tròn đồng tâm hoa văn men gốm Bát Tràng */}
                  <div className="absolute inset-2 sm:inset-3 rounded-full border border-amber-500/30 pointer-events-none" />
                  <div className="absolute inset-4 sm:inset-6 rounded-full border border-amber-500/20 pointer-events-none" />
                  <div className="absolute inset-6 sm:inset-9 rounded-full border border-amber-500/15 pointer-events-none" />

                  {/* Núm Bát Vàng Ròng 3D (Golden Knob) */}
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <div className={`${
                      isLandscapeActive ? 'w-6 h-6' : 'w-10 h-10 sm:w-12 sm:h-12'
                    } rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 border-2 border-amber-200 shadow-[0_4px_15px_rgba(0,0,0,0.8)] flex items-center justify-center mb-1 group-active:scale-95 transition-transform`}>
                      <span className={isLandscapeActive ? 'text-xs' : 'text-base sm:text-xl drop-shadow'}>🖐️</span>
                    </div>
                    <span className={`text-amber-300 font-black tracking-wider uppercase text-center px-1 drop-shadow-md ${
                      isLandscapeActive ? 'text-[8px]' : 'text-[10px] sm:text-xs'
                    }`}>
                      {phase === 'SHAKING'
                        ? 'Đang Xóc...'
                        : 'KÉO ĐỂ MỞ BÁT'}
                    </span>
                    {!isLandscapeActive && (
                      <span className="text-[8px] text-amber-400/90 font-bold animate-pulse mt-0.5">
                        ↔ Kéo mép bát để hé lộ
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Open or Live Room Indicator */}
            <div className="flex items-center gap-1 mt-0.5">
              {phase === 'OPENING' && !isLidFullyOpen && (
                <button
                  type="button"
                  onClick={() => setIsLidFullyOpen(true)}
                  className="px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] shadow-md cursor-pointer active:scale-95"
                >
                  MỞ NHANH ⚡
                </button>
              )}
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[9px] font-black text-emerald-400 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>LIVE SYNC</span>
              </span>
            </div>

            {/* Win announcement badge */}
            {phase === 'RESULT' && lastWinAmount > 0 && (
              <div className="mt-1 py-1 px-3 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 text-slate-950 font-black flex items-center gap-1.5 shadow-[0_0_25px_rgba(245,158,11,0.8)] border border-amber-200 animate-in zoom-in-90 duration-300">
                <span className="text-xs sm:text-sm animate-bounce">🏆</span>
                <span className="text-[10px] sm:text-xs uppercase tracking-wider">THẮNG:</span>
                <span className="font-mono-numbers font-black text-xs sm:text-sm text-slate-950">
                  +{lastWinAmount.toLocaleString('vi-VN')} Xu
                </span>
              </div>
            )}
          </div>

          {/* CỬA CỨT (BÊN PHẢI ~ 34% WIDTH) */}
          <div
            onClick={() => handlePlaceBet('CUT')}
            className={`flex-1 rounded-2xl border-2 transition-all select-none flex flex-col justify-between shadow-xl relative overflow-hidden group ${
              isLandscapeActive ? 'p-1.5 h-full min-h-0' : 'p-2 sm:p-4 min-h-[190px] sm:min-h-[240px]'
            } ${
              userBets.CUT > 0
                ? 'bg-gradient-to-b from-yellow-950/90 via-slate-900 to-yellow-950/90 border-yellow-600 shadow-yellow-700/30 ring-2 ring-yellow-600/40'
                : 'bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-yellow-950/30 border-yellow-700/40 hover:border-yellow-600'
            } ${phase === 'RESULT' && lastResultOutcome === 'CUT' ? 'ring-4 ring-yellow-500 animate-pulse' : ''} ${
              isBetLocked ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-[0.98]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className={`${isLandscapeActive ? 'text-base sm:text-lg' : 'text-2xl sm:text-4xl'} drop-shadow-md`}>💩</span>
                  <div>
                    <h3 className={`${isLandscapeActive ? 'text-xs sm:text-sm' : 'text-base sm:text-2xl'} font-black text-yellow-500 uppercase leading-none`}>
                      CỨT
                    </h3>
                    <span className={`${isLandscapeActive ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-xs'} text-yellow-500 font-black`}>4 - 10 Điểm</span>
                  </div>
                </div>
                <span className={`${isLandscapeActive ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-xs'} bg-yellow-600/20 text-yellow-400 px-1 py-0.5 rounded font-black`}>
                  1:1.98
                </span>
              </div>

              {/* Room pool */}
              <div className={`text-center rounded-xl bg-black/50 border border-yellow-700/20 ${
                isLandscapeActive ? 'my-0.5 py-0.5 px-1' : 'my-1.5 sm:my-2 py-1 sm:py-1.5 px-1 sm:px-2'
              }`}>
                <span className={`${isLandscapeActive ? 'text-[7px]' : 'text-[8px] sm:text-[10px]'} text-slate-400 uppercase font-semibold leading-none block`}>Phòng Cược</span>
                <div className={`font-mono-numbers font-black text-yellow-500 leading-tight truncate ${
                  isLandscapeActive ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-lg'
                }`}>
                  {poolCut.toLocaleString('vi-VN')} Xu
                </div>
                <span className={`${isLandscapeActive ? 'text-[6px]' : 'text-[7px] sm:text-[9px]'} text-slate-500 leading-none`}>{countCut} người</span>
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
                disabled={isBetLocked}
                className={`w-full rounded-xl bg-gradient-to-r from-yellow-600 to-amber-700 text-white font-black uppercase tracking-wider shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLandscapeActive ? 'py-0.5 text-[8px] sm:text-[9px]' : 'py-1.5 sm:py-2.5 text-[10px] sm:text-xs'
                } ${isBetLocked ? 'grayscale' : 'cursor-pointer active:scale-95'}`}
              >
                {isBetLocked ? '🔒 ĐÃ KHÓA' : (userBets.CUT > 0 ? '+ CƯỢC THÊM' : 'CƯỢC CỨT')}
              </button>
            </div>
          </div>
        </div>

        {/* 3. CỬA PHỤ NGANG DƯỚI BÁT (BÃO & KÈO ĐẶC BIỆT CÓ ĐẦY ĐỦ SỐ ĐIỂM) */}
        <div className={`w-full grid grid-cols-4 border-t border-slate-800/80 shrink-0 ${
          isLandscapeActive ? 'gap-1 mt-0.5 pt-0.5' : 'gap-1.5 sm:gap-2 z-10 mt-2.5 pt-2'
        }`}>
          {/* BÃO CƠM */}
          <div
            onClick={() => handlePlaceBet('BAO_COM')}
            className={`rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5 sm:p-2'
            } ${
              userBets.BAO_COM > 0
                ? 'bg-amber-950/80 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                : 'bg-slate-900/60 border-slate-800'
            } ${isBetLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-amber-500/40'}`}
          >
            <div className="flex flex-col items-center">
              <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>🍚🍚🍚</span>
              <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Bão Cơm</span>
              <span className="text-[7px] sm:text-[8px] text-amber-400 font-black">Ăn x30</span>
            </div>
            <div className={`mt-0.5 px-1 py-0.2 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono font-bold leading-tight ${
              isLandscapeActive ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'
            }`}>
              444 • 555 • 666
            </div>
          </div>

          {/* BÃO CỨT */}
          <div
            onClick={() => handlePlaceBet('BAO_CUT')}
            className={`rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5 sm:p-2'
            } ${
              userBets.BAO_CUT > 0
                ? 'bg-yellow-950/80 border-yellow-600 shadow-md ring-1 ring-yellow-500/50'
                : 'bg-slate-900/60 border-slate-800'
            } ${isBetLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-yellow-600/40'}`}
          >
            <div className="flex flex-col items-center">
              <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>💩💩💩</span>
              <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Bão Cứt</span>
              <span className="text-[7px] sm:text-[8px] text-yellow-400 font-black">Ăn x30</span>
            </div>
            <div className={`mt-0.5 px-1 py-0.2 rounded bg-yellow-500/15 border border-yellow-600/30 text-yellow-400 font-mono font-bold leading-tight ${
              isLandscapeActive ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'
            }`}>
              111 • 222 • 333
            </div>
          </div>

          {/* CƠM GÀ */}
          <div
            onClick={() => handlePlaceBet('COM_GA')}
            className={`rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5 sm:p-2'
            } ${
              userBets.COM_GA > 0
                ? 'bg-amber-950/80 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                : 'bg-slate-900/60 border-slate-800'
            } ${isBetLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-amber-500/40'}`}
          >
            <div className="flex flex-col items-center">
              <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>🍗🍚</span>
              <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Cơm Gà</span>
              <span className="text-[7px] sm:text-[8px] text-amber-400 font-black">Ăn x8</span>
            </div>
            <div className={`mt-0.5 px-1 py-0.2 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono font-bold leading-tight ${
              isLandscapeActive ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'
            }`}>
              13 - 14 điểm
            </div>
          </div>

          {/* CỨT RUỒI */}
          <div
            onClick={() => handlePlaceBet('CUT_RUOI')}
            className={`rounded-xl border transition-all flex flex-col items-center justify-between text-center ${
              isLandscapeActive ? 'p-0.5' : 'p-1.5 sm:p-2'
            } ${
              userBets.CUT_RUOI > 0
                ? 'bg-yellow-950/80 border-yellow-600 shadow-md ring-1 ring-yellow-500/50'
                : 'bg-slate-900/60 border-slate-800'
            } ${isBetLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-yellow-600/40'}`}
          >
            <div className="flex flex-col items-center">
              <span className={isLandscapeActive ? 'text-[9px]' : 'text-xs sm:text-sm'}>🪰💩</span>
              <span className={`font-black text-white ${isLandscapeActive ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Cứt Ruồi</span>
              <span className="text-[7px] sm:text-[8px] text-yellow-400 font-black">Ăn x8</span>
            </div>
            <div className={`mt-0.5 px-1 py-0.2 rounded bg-yellow-500/15 border border-yellow-600/30 text-yellow-400 font-mono font-bold leading-tight ${
              isLandscapeActive ? 'text-[6px]' : 'text-[8px] sm:text-[9px]'
            }`}>
              7 - 8 điểm
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DẢI CHIP CASINO & THANH THAO TÁC CƯỢC CHUẨN CASINO */}
      {/* ============================================================== */}
      <div className={`bg-slate-900/95 border border-slate-800 rounded-xl sm:rounded-2xl ${
        isLandscapeActive ? 'p-1 gap-1' : 'p-1.5 sm:p-2 gap-1.5'
      } flex flex-wrap sm:flex-nowrap items-center justify-between shadow-xl shrink-0 ${isBetLocked ? 'opacity-70' : ''}`}>
        {/* Nhóm nút thao tác: Cược Lại, Gấp Đôi, Hủy Cược */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleReBet}
            disabled={isBetLocked}
            className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-slate-200 ${
              isLandscapeActive ? 'px-1.5 py-0.5 text-[8px] sm:text-[9px]' : 'px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs'
            } disabled:opacity-40 transition-all ${
              isBetLocked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
            }`}
            title="Đặt lại mức cược phiên trước"
          >
            <span>⟲</span>
            <span>Cược Lại</span>
          </button>
          <button
            onClick={handleDoubleBet}
            disabled={isBetLocked || totalUserBet === 0}
            className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-amber-300 ${
              isLandscapeActive ? 'px-1.5 py-0.5 text-[8px] sm:text-[9px]' : 'px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs'
            } disabled:opacity-40 transition-all ${
              isBetLocked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
            }`}
            title="Gấp đôi tổng cược hiện tại"
          >
            <span>✖2</span>
            <span>Gấp Đôi</span>
          </button>
          {totalUserBet > 0 && !isBetLocked && (
            <button
              onClick={clearBets}
              className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/50 font-bold text-red-300 ${
                isLandscapeActive ? 'px-1.5 py-0.5 text-[8px] sm:text-[9px]' : 'px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs'
              } cursor-pointer active:scale-95 transition-all`}
              title="Hủy toàn bộ cược phiên này"
            >
              <span>✕</span>
              <span>Hủy</span>
            </button>
          )}
        </div>

        {/* Vách ngăn */}
        <div className="hidden sm:block w-[1px] h-7 bg-slate-800 shrink-0 mx-0.5" />

        {/* Dải Chip + Nút Tất Tay ngay cạnh dải chip */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 ml-auto">
          {CHIP_DENOMINATIONS.map((chip) => {
            const isSelected = selectedChip === chip.value;
            return (
              <button
                key={chip.value}
                disabled={isBetLocked}
                onClick={() => {
                  sounds.playChipClink();
                  setSelectedChip(chip.value);
                }}
                className={`relative rounded-full flex flex-col items-center justify-center border-2 border-dashed shadow-md transition-all shrink-0 ${
                  isLandscapeActive ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-8 h-8 sm:w-10 sm:h-10'
                } ${chip.color} ${
                  isSelected
                    ? `scale-110 -translate-y-0.5 ring-2 ring-yellow-400 brightness-110 shadow-lg`
                    : 'opacity-85 hover:opacity-100'
                } ${isBetLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}`}
              >
                <div className={`rounded-full border border-white/40 flex items-center justify-center font-mono-numbers font-black ${
                  isLandscapeActive ? 'w-4.5 h-4.5 sm:w-5 sm:h-5 text-[7px] sm:text-[8px]' : 'w-6 h-6 sm:w-7 sm:h-7 text-[9px] sm:text-[11px]'
                }`}>
                  {chip.label}
                </div>
              </button>
            );
          })}

          {/* Nút TẤT TAY đặt ngay cạnh các chip chọn tiền */}
          <button
            onClick={handleAllIn}
            disabled={isBetLocked || balance <= 0}
            className={`relative rounded-full sm:rounded-xl flex items-center justify-center border-2 border-amber-400 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30 transition-all shrink-0 disabled:opacity-40 ${
              isLandscapeActive ? 'px-1.5 py-0.5 text-[8px] h-6 sm:h-7' : 'px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs h-8 sm:h-10'
            } ${
              selectedChip === balance && balance > 0
                ? 'ring-2 ring-yellow-300 scale-105 brightness-110'
                : 'hover:brightness-110'
            } ${isBetLocked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            title="Cược tất tay toàn bộ số dư"
          >
            <span className="mr-0.5 text-[9px]">⚡</span>
            <span className="font-black uppercase tracking-wider">Tất Tay</span>
          </button>
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRulesModal(false);
          }}
          className="fixed inset-0 z-[10002] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200"
        >
          {/* Quick exit pill button at top right */}
          <button
            onClick={() => setShowRulesModal(false)}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 z-50 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-rose-900/80 border border-slate-600 hover:border-rose-400 text-white font-bold text-xs flex items-center gap-1 shadow-2xl cursor-pointer active:scale-95 transition-all"
          >
            ✕ Thoát
          </button>

          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-w-md w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                <span>📖</span> Luật Chơi Cơm Hay Cứt (Sicbo)
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/80 border border-slate-700 hover:border-rose-400 text-slate-300 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer active:scale-90 transition-all shrink-0"
                title="Đóng luật chơi"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto text-xs text-slate-300 space-y-2 leading-relaxed py-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              <p>
                Trò chơi sử dụng <strong>3 viên xí ngầu xúc xắc</strong> điểm từ 1 đến 6:
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>
                  <strong className="text-amber-400">🍚 CỬA CƠM:</strong> Tổng điểm 3 viên từ <strong>11 đến 17 Điểm</strong> (trừ các bộ Bão). Tỉ lệ ăn <strong>1 : 1.98</strong>.
                </li>
                <li>
                  <strong className="text-yellow-500">💩 CỬA CỨT:</strong> Tổng điểm 3 viên từ <strong>4 đến 10 Điểm</strong> (trừ các bộ Bão). Tỉ lệ ăn <strong>1 : 1.98</strong>.
                </li>
                <li>
                  <strong className="text-amber-300">🍚🍚🍚 BÃO CƠM:</strong> 3 viên cùng ra số lớn <strong>4-4-4, 5-5-5 hoặc 6-6-6</strong>. Tỉ lệ ăn <strong>x30 lần</strong>!
                </li>
                <li>
                  <strong className="text-yellow-400">💩💩💩 BÃO CỨT:</strong> 3 viên cùng ra số nhỏ <strong>1-1-1, 2-2-2 hoặc 3-3-3</strong>. Tỉ lệ ăn <strong>x30 lần</strong>!
                </li>
                <li>
                  <strong className="text-orange-400">🍗 CƠM GÀ:</strong> Tổng điểm 3 viên đúng <strong>13 hoặc 14 Điểm</strong>. Tỉ lệ ăn <strong>x8 lần</strong>!
                </li>
                <li>
                  <strong className="text-lime-400">🪰 CỨT RUỒI:</strong> Tổng điểm 3 viên đúng <strong>7 hoặc 8 Điểm</strong>. Tỉ lệ ăn <strong>x8 lần</strong>!
                </li>
                <li>
                  <strong className="text-emerald-400">TÍNH NĂNG NẶN BÁT:</strong> Giữ chuột hoặc vuốt ngón tay trên bát để kéo nắp mở dần từng viên xí ngầu hồi hộp kịch tính!
                </li>
              </ul>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                💡 <em>Dùng chung ví Xu và tài khoản Discord với Rocket Crash.</em>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs cursor-pointer active:scale-98 transition-all shadow-lg"
              >
                ✕ ĐÃ HIỂU - ĐÓNG BẢNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY / SOI CẦU MODAL */}
      {showHistoryModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          className="fixed inset-0 z-[10002] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200"
        >
          {/* Quick exit pill button at top right */}
          <button
            onClick={() => setShowHistoryModal(false)}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 z-50 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-rose-900/80 border border-slate-600 hover:border-rose-400 text-white font-bold text-xs flex items-center gap-1 shadow-2xl cursor-pointer active:scale-95 transition-all"
          >
            ✕ Thoát
          </button>

          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-w-lg w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                <span>📊</span> Lịch Sử Soi Cầu Cơm & Cứt
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/80 border border-slate-700 hover:border-rose-400 text-slate-300 hover:text-white font-black text-sm flex items-center justify-center cursor-pointer active:scale-90 transition-all shrink-0"
                title="Đóng bảng soi cầu"
              >
                ✕
              </button>
            </div>

            {/* Modal Stats - Compact */}
            <div className="grid grid-cols-2 gap-2 text-center py-2 shrink-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 sm:flex-col sm:gap-0.5">
                <span className="text-xl sm:text-2xl">🍚</span>
                <div>
                  <div className="text-base sm:text-lg font-black text-amber-400 font-mono-numbers">{comPercent}%</div>
                  <span className="text-[10px] sm:text-xs text-slate-400">CƠM ({comCount} phiên)</span>
                </div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-yellow-950/60 border border-yellow-700/40 flex items-center justify-center gap-2 sm:flex-col sm:gap-0.5">
                <span className="text-xl sm:text-2xl">💩</span>
                <div>
                  <div className="text-base sm:text-lg font-black text-yellow-500 font-mono-numbers">{cutPercent}%</div>
                  <span className="text-[10px] sm:text-xs text-slate-400">CỨT ({cutCount} phiên)</span>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 py-1 scrollbar-thin scrollbar-thumb-slate-700">
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

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer active:scale-98 transition-all"
              >
                ✕ ĐÓNG BẢNG LỊCH SỬ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CỬA SỔ CHAT NỔI NHỎ TRỰC TIẾP (BẬT/TẮT QUA NÚT CHAT Ở THANH MENU TRÊN) */}
      {/* ============================================================== */}
      {showMiniChat && (
        <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-[10001] w-72 sm:w-80 max-h-[82vh] h-[260px] xs:h-[300px] bg-slate-950/95 backdrop-blur-xl border-2 border-amber-500/60 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 select-text">
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
              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-900/80 border border-slate-700 hover:border-rose-400 text-slate-300 hover:text-white flex items-center justify-center text-xs font-black cursor-pointer active:scale-90 transition-all shrink-0"
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

      {/* GAME HUB MODAL (CHỌN GAME) */}
      <GameHubModal
        isOpen={showGameHub}
        onClose={() => setShowGameHub(false)}
        activeGame="COM_CUT"
        onSelectGame={(selected) => {
          if (onSwitchGame) onSwitchGame(selected);
          setShowGameHub(false);
        }}
        balance={balance}
      />

      {/* SOLO DUEL MODAL (ĐẤU TRƯỜNG 1V1, CHUỖI SINH TỒN & LEO THÁP) */}
      <ComCutDuelModal
        isOpen={showSoloDuelModal}
        onClose={() => setShowSoloDuelModal(false)}
        balance={balance}
        onUpdateBalance={onUpdateBalance}
        onAwardExp={onAwardExp}
      />
    </div>
  );
};
