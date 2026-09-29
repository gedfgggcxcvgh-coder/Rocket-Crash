import React, { useState, useEffect } from 'react';
import { ComCutBetType } from '../types/game';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Users, Swords, Shield, Zap, Sparkles, Coins, RefreshCw, Flame, Award,
  Skull, Crown, ArrowRight, Play, CheckCircle2, AlertTriangle, Star, Check,
  Plus, MessageSquare, Send, Radio, UserCheck, Eye, HelpCircle
} from 'lucide-react';

export interface PvpRealOpponent {
  id: string;
  name: string;
  avatar: string;
  badge: string;
  badgeColor: string;
  winRate: number;
  totalMatches: number;
  wager: number;
  mode: 'QUICK' | 'BO3' | 'BO5';
  sidePreference?: 'COM' | 'CUT';
  status: 'WAITING' | 'PLAYING';
  isVip?: boolean;
  isRealPlayer?: boolean;
}

export interface PvpRealMatch {
  opponent: PvpRealOpponent;
  wager: number;
  mode: 'QUICK' | 'BO3' | 'BO5';
  roundNumber: number;
  userScore: number;
  opponentScore: number;
  status: 'CHOOSING' | 'SHAKING' | 'REVEALED' | 'ROUND_OVER' | 'MATCH_OVER';
  userPick: ComCutBetType;
  opponentPick: ComCutBetType;
  dices: [number, number, number] | null;
  total: number;
  outcome: 'COM' | 'CUT' | null;
  isBao: boolean;
  roundWinner: 'USER' | 'OPPONENT' | 'DRAW';
  matchWinner?: 'USER' | 'OPPONENT' | 'DRAW';
  opponentComment?: string;
  opponentEmoji?: string;
  userComment?: string;
}

interface ComCutPvpArenaProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onAwardExp?: (exp: number) => void;
}

const DEFAULT_OPPONENTS: PvpRealOpponent[] = [
  {
    id: 'tuan_tayto',
    name: 'Tuấn_TayTo',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan',
    badge: '🐋 Cá Mập VIP',
    badgeColor: 'border-cyan-400 text-cyan-300 bg-cyan-950/80',
    winRate: 68,
    totalMatches: 412,
    wager: 2000000,
    mode: 'BO3',
    sidePreference: 'COM',
    status: 'WAITING',
    isVip: true,
  },
  {
    id: 'bao_allin',
    name: 'Bảo_AllIn',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao',
    badge: '💎 Gồng Thủ',
    badgeColor: 'border-purple-400 text-purple-300 bg-purple-950/80',
    winRate: 54,
    totalMatches: 830,
    wager: 5000000,
    mode: 'QUICK',
    sidePreference: 'CUT',
    status: 'WAITING',
    isVip: true,
  },
  {
    id: 'nam_baosan',
    name: 'Nam_BaoSàn',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nam',
    badge: '👑 Vua Bát Đĩa',
    badgeColor: 'border-yellow-400 text-yellow-300 bg-yellow-950/80',
    winRate: 74,
    totalMatches: 1205,
    wager: 10000000,
    mode: 'BO5',
    sidePreference: 'COM',
    status: 'WAITING',
    isVip: true,
  },
  {
    id: 'linh_hupcom',
    name: 'Linh_HúpCơm',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Linh',
    badge: '🍚 Thánh Soi Cầu',
    badgeColor: 'border-amber-400 text-amber-300 bg-amber-950/80',
    winRate: 62,
    totalMatches: 248,
    wager: 500000,
    mode: 'QUICK',
    sidePreference: 'COM',
    status: 'WAITING',
  },
  {
    id: 'khang_bipvcl',
    name: 'Khang_BịpVcl',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Khang',
    badge: '⚡ Gấp Thếp',
    badgeColor: 'border-rose-400 text-rose-300 bg-rose-950/80',
    winRate: 59,
    totalMatches: 590,
    wager: 1000000,
    mode: 'BO3',
    sidePreference: 'CUT',
    status: 'WAITING',
  },
  {
    id: 'huy_chaytui',
    name: 'Huy_CháyTúi',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Huy',
    badge: '🔥 Khát Nước',
    badgeColor: 'border-orange-400 text-orange-300 bg-orange-950/80',
    winRate: 49,
    totalMatches: 310,
    wager: 200000,
    mode: 'QUICK',
    sidePreference: 'COM',
    status: 'WAITING',
  },
  {
    id: 'son_chuyennghiep',
    name: 'Sơn_ĂnCứtChuyênNghiệp',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Son',
    badge: '💩 Thợ Săn Bão',
    badgeColor: 'border-emerald-400 text-emerald-300 bg-emerald-950/80',
    winRate: 53,
    totalMatches: 672,
    wager: 100000,
    mode: 'QUICK',
    sidePreference: 'CUT',
    status: 'WAITING',
  },
];

const QUICK_WAGERS = [100000, 500000, 1000000, 2000000, 5000000, 10000000, 20000000];

const TAUNT_QUOTES = [
  '🍚 Cơm thơm phức nhé bạn ơi!',
  '💩 Húp trọn đống cứt này đi cu!',
  '🔥 Non và xanh lắm, nhường tao hũ!',
  '💸 Tiền về ví tao rồi cảm ơn!',
  '⚡ Ván này tao tất tay đéo tin thua!',
  '🤝 Tái đấu không bạn, cay chưa?',
];

const EMOJI_TAUNTS = ['😂', '💩', '🍚', '🔥', '💀', '💸', '👑', '😎'];

export const ComCutPvpArena: React.FC<ComCutPvpArenaProps> = ({
  balance,
  onUpdateBalance,
  onAwardExp,
}) => {
  // Arena State
  const [pvpView, setPvpView] = useState<'LOBBY' | 'MATCH' | 'CREATE_ROOM'>('LOBBY');
  const [opponentsList, setOpponentsList] = useState<PvpRealOpponent[]>(DEFAULT_OPPONENTS);
  
  // Quick Match Settings
  const [quickWager, setQuickWager] = useState<number>(1000000);
  const [quickMode, setQuickMode] = useState<'QUICK' | 'BO3' | 'BO5'>('QUICK');
  const [isSearchingQuick, setIsSearchingQuick] = useState<boolean>(false);
  const [searchTimer, setSearchTimer] = useState<number>(0);

  // Create Room State
  const [customWager, setCustomWager] = useState<number>(500000);
  const [customMode, setCustomMode] = useState<'QUICK' | 'BO3' | 'BO5'>('QUICK');
  const [roomCreatedWaiting, setRoomCreatedWaiting] = useState<boolean>(false);

  // Active PVP Match
  const [activeMatch, setActiveMatch] = useState<PvpRealMatch | null>(null);
  const [matchUserPick, setMatchUserPick] = useState<ComCutBetType>('COM');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [lidOpen, setLidOpen] = useState<boolean>(false);

  // Opponent Reaction & Taunts
  const [opponentBubble, setOpponentBubble] = useState<string | null>(null);
  const [userBubble, setUserBubble] = useState<string | null>(null);

  // Real Player Created Rooms State
  const [myCreatedRoom, setMyCreatedRoom] = useState<PvpRealOpponent | null>(null);
  const [realPlayerRooms, setRealPlayerRooms] = useState<PvpRealOpponent[]>([]);

  // Cross-Tab Broadcast Channel Sync for Real Player Rooms
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('comcut_pvp_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_ROOM_CREATED') {
          const room = event.data.room as PvpRealOpponent;
          setRealPlayerRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
        } else if (event.data?.type === 'ROOM_CLOSED') {
          const roomId = event.data.roomId;
          setRealPlayerRooms((prev) => prev.filter((r) => r.id !== roomId));
        } else if (event.data?.type === 'ROOM_JOINED') {
          const { roomId, opponent } = event.data;
          if (myCreatedRoom && myCreatedRoom.id === roomId) {
            setMyCreatedRoom(null);
            startPvpMatch(opponent);
          }
        }
      };
    } catch (e) {
      console.log('BroadcastChannel not supported:', e);
    }

    // Storage event fallback for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'comcut_active_pvp_rooms') {
        try {
          const rooms = JSON.parse(e.newValue || '[]');
          setRealPlayerRooms(rooms);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [myCreatedRoom]);

  // Handle Quick Match Search
  const handleQuickMatchSearch = () => {
    sounds.playClick();
    // Check if a real player room exists with matching wager
    const availableRealRoom = realPlayerRooms.find((r) => r.isRealPlayer && r.status === 'WAITING');
    if (availableRealRoom) {
      try {
        const bc = new BroadcastChannel('comcut_pvp_channel');
        bc.postMessage({
          type: 'ROOM_JOINED',
          roomId: availableRealRoom.id,
          opponent: {
            id: 'real_user_' + Date.now(),
            name: 'Người Chơi Thật',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=RealGuest',
            badge: '🔴 Người Chơi Thật',
            badgeColor: 'border-emerald-400 text-emerald-300 bg-emerald-950/80',
            winRate: 62,
            totalMatches: 30,
            wager: availableRealRoom.wager,
            mode: availableRealRoom.mode,
            status: 'PLAYING',
          },
        });
        bc.close();
      } catch {}
      startPvpMatch(availableRealRoom);
    } else {
      setIsSearchingQuick(true);
      setSearchTimer(0);
    }
  };
  const handleCreateRealRoom = () => {
    if (balance < customWager) {
      sounds.playErrorBeep();
      alert('Số dư không đủ để mở phòng!');
      return;
    }

    sounds.playClick();
    const newRoom: PvpRealOpponent = {
      id: 'room_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: 'Bạn (Chủ Phòng)',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=You',
      badge: '🔴 Người Chơi Thật',
      badgeColor: 'border-emerald-400 text-emerald-300 bg-emerald-950/80',
      winRate: 65,
      totalMatches: 42,
      wager: customWager,
      mode: customMode,
      status: 'WAITING',
      isVip: true,
    };

    setMyCreatedRoom(newRoom);
    setRoomCreatedWaiting(true);

    // Broadcast new room
    try {
      const bc = new BroadcastChannel('comcut_pvp_channel');
      bc.postMessage({ type: 'NEW_ROOM_CREATED', room: newRoom });
      bc.close();
    } catch {}

    const currentRooms = JSON.parse(localStorage.getItem('comcut_active_pvp_rooms') || '[]');
    const updated = [newRoom, ...currentRooms];
    localStorage.setItem('comcut_active_pvp_rooms', JSON.stringify(updated));
  };

  // Cancel Room
  const handleCancelMyRoom = () => {
    sounds.playClick();
    if (myCreatedRoom) {
      try {
        const bc = new BroadcastChannel('comcut_pvp_channel');
        bc.postMessage({ type: 'ROOM_CLOSED', roomId: myCreatedRoom.id });
        bc.close();
      } catch {}
    }
    setMyCreatedRoom(null);
    setRoomCreatedWaiting(false);
  };

  // Force Match with Bot (ONLY on explicit user click)
  const handleForceMatchBot = () => {
    sounds.playClick();
    setRoomCreatedWaiting(false);
    setIsSearchingQuick(false);
    const randomOpp = DEFAULT_OPPONENTS[Math.floor(Math.random() * DEFAULT_OPPONENTS.length)];
    startPvpMatch({
      ...randomOpp,
      wager: myCreatedRoom ? myCreatedRoom.wager : quickWager,
      mode: myCreatedRoom ? myCreatedRoom.mode : quickMode,
    });
  };

  // Start PvP Match
  const startPvpMatch = (opponent: PvpRealOpponent) => {
    if (balance < opponent.wager) {
      sounds.playErrorBeep();
      alert('Số dư của bạn không đủ để tham gia phòng cược này!');
      return;
    }

    sounds.playBowlSlam();
    onUpdateBalance(balance - opponent.wager);

    const initialUserPick: ComCutBetType = 'COM';
    const initialOpponentPick: ComCutBetType = 'CUT';

    const newMatch: PvpRealMatch = {
      opponent,
      wager: opponent.wager,
      mode: opponent.mode,
      roundNumber: 1,
      userScore: 0,
      opponentScore: 0,
      status: 'CHOOSING',
      userPick: initialUserPick,
      opponentPick: initialOpponentPick,
      dices: null,
      total: 0,
      outcome: null,
      isBao: false,
      roundWinner: 'DRAW',
      opponentComment: `Gặp đúng tay to rồi! Solo sòng phẳng nhé bạn ơi! 🔥`,
    };

    setMatchUserPick(initialUserPick);
    setActiveMatch(newMatch);
    setPvpView('MATCH');
    setLidOpen(false);
    setIsShaking(false);
    setOpponentBubble(`Gặp đúng tay to rồi! Solo sòng phẳng nhé bạn ơi! 🔥`);
    setUserBubble(null);

    // Auto-clear bubble after 3.5s
    setTimeout(() => setOpponentBubble(null), 3500);
  };

  // Launch Shake in PvP
  const handleLaunchPvpRound = () => {
    if (!activeMatch) return;

    sounds.playClick();
    setIsShaking(true);
    setLidOpen(false);
    sounds.playDiceShaking(2.4);

    setActiveMatch((prev) => prev ? {
      ...prev,
      status: 'SHAKING',
      userPick: matchUserPick,
      opponentPick: matchUserPick === 'COM' ? 'CUT' : 'COM', // Distinct picks in real 1v1
    } : null);

    // Opponent occasional banter during shaking
    setTimeout(() => {
      const taunts = [
        'Lắc mạnh tay lên bạn ơi! 🥣',
        'Ván này tao ngửi thấy mùi Cơm chín rồi! 🍚',
        'Bát này đéo tin không về Cứt! 💩',
        'Hồi hộp vcl, mở nhanh đi! ⚡',
      ];
      setOpponentBubble(taunts[Math.floor(Math.random() * taunts.length)]);
      setTimeout(() => setOpponentBubble(null), 2500);
    }, 1200);

    // Reveal after 2.4s
    setTimeout(() => {
      // Roll 3 genuine dices
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3;
      const isBao = d1 === d2 && d2 === d3;
      const outcome: 'COM' | 'CUT' = isBao ? (d1 >= 4 ? 'COM' : 'CUT') : (total >= 11 ? 'COM' : 'CUT');

      const opponentChosenSide: ComCutBetType = matchUserPick === 'COM' ? 'CUT' : 'COM';

      const userWon = matchUserPick === outcome;
      const oppWon = opponentChosenSide === outcome;

      let roundWin: 'USER' | 'OPPONENT' | 'DRAW' = 'DRAW';
      if (userWon && !oppWon) roundWin = 'USER';
      else if (!userWon && oppWon) roundWin = 'OPPONENT';

      setIsShaking(false);
      setLidOpen(true);
      sounds.playLidSlide();

      if (!activeMatch) return;

      const nextUserScore = activeMatch.userScore + (roundWin === 'USER' ? 1 : 0);
      const nextOppScore = activeMatch.opponentScore + (roundWin === 'OPPONENT' ? 1 : 0);

      const requiredWins = activeMatch.mode === 'BO5' ? 3 : activeMatch.mode === 'BO3' ? 2 : 1;
      let isMatchFinished = false;
      let finalWinner: 'USER' | 'OPPONENT' | 'DRAW' | undefined = undefined;

      if (activeMatch.mode === 'QUICK') {
        isMatchFinished = true;
        finalWinner = roundWin;
      } else {
        if (nextUserScore >= requiredWins) {
          isMatchFinished = true;
          finalWinner = 'USER';
        } else if (nextOppScore >= requiredWins) {
          isMatchFinished = true;
          finalWinner = 'OPPONENT';
        }
      }

      // Payout and sound triggers (executed outside of any setState updater)
      if (isMatchFinished) {
        if (finalWinner === 'USER') {
          sounds.playWin();
          const winPot = activeMatch.wager * 2;
          onUpdateBalance(balance + winPot);
          const expGain = Math.max(250, Math.floor(activeMatch.wager / 400));
          onAwardExp?.(expGain);
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          setOpponentBubble('Má nó cay thật, ván này đen quá! Nhường bạn hũ cược! 😭');
        } else if (finalWinner === 'OPPONENT') {
          sounds.playFartSound();
          setOpponentBubble('Haha cảm ơn bạn nhé! Xu về két sắt tao rồi! 💸😎');
        } else {
          // Draw: Refund wager
          onUpdateBalance(balance + activeMatch.wager);
          setOpponentBubble('Hòa rồi! May cho cả hai bên nhé! 🤝');
        }
      } else {
        if (roundWin === 'USER') sounds.playClick();
        else if (roundWin === 'OPPONENT') sounds.playErrorBeep();
      }

      setActiveMatch({
        ...activeMatch,
        userScore: nextUserScore,
        opponentScore: nextOppScore,
        dices: [d1, d2, d3],
        total,
        outcome,
        isBao,
        roundWinner: roundWin,
        status: isMatchFinished ? 'MATCH_OVER' : 'ROUND_OVER',
        matchWinner: finalWinner,
      });
    }, 2400);
  };

  // Next Round in Bo3/Bo5
  const handleNextRoundPvp = () => {
    if (!activeMatch) return;
    sounds.playClick();
    setLidOpen(false);
    setIsShaking(false);
    setActiveMatch({
      ...activeMatch,
      roundNumber: activeMatch.roundNumber + 1,
      status: 'CHOOSING',
      dices: null,
      total: 0,
      outcome: null,
      roundWinner: 'DRAW',
    });
  };

  // Send Taunt / Gáy
  const handleSendTaunt = (quote: string) => {
    sounds.playClick();
    setUserBubble(quote);
    setTimeout(() => setUserBubble(null), 3000);

    // Opponent quick counter banter
    setTimeout(() => {
      const counters = [
        'Gáy sớm thế bạn, chờ mở bát xem ai khóc! 😂',
        'Cứ bình tĩnh bạn ơi, tiền chưa về túi chưa biết ai hơn ai! 😎',
        'Bú được hiệp này rồi xem hiệp sau tao lật kèo! 🔥',
        'Tay to mà gáy kinh thế haha! 👑',
      ];
      setOpponentBubble(counters[Math.floor(Math.random() * counters.length)]);
      setTimeout(() => setOpponentBubble(null), 3000);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-2 animate-fadeIn">
      {/* ============================================================== */}
      {/* 1. LOBBY VIEW: SẢNH THÁCH ĐẤU & GHÉP PHÒNG */}
      {/* ============================================================== */}
      {pvpView === 'LOBBY' && (
        <div className="flex flex-col gap-2">
          {/* Top Live Banner */}
          <div className="p-2 sm:p-2.5 bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-amber-950/80 rounded-xl border border-emerald-500/40 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-emerald-300 uppercase leading-none flex items-center gap-1.5">
                  <span>SOLO NGƯỜI CHƠI THẬT</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <span className="text-[9px] sm:text-[10px] text-slate-400">
                  1v1 Ăn Trọn Tiền Cược • Cà Khịa Trực Tiếp • Thăng Hạng PvP
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono font-bold">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>1,420 Online</span>
            </div>
          </div>

          {/* Quick Match & Create Room Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* CARD 1: GHÉP NHANH 1V1 */}
            <div className="p-2.5 bg-slate-950/90 rounded-xl border border-amber-500/40 flex flex-col gap-2 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs uppercase">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Ghép Nhanh 1v1</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-bold">
                  Tự Động Tìm Kèo
                </span>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-3 gap-1">
                {(['QUICK', 'BO3', 'BO5'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { sounds.playClick(); setQuickMode(m); }}
                    className={`py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                      quickMode === m
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'QUICK' ? '1 Hiệp' : m}
                  </button>
                ))}
              </div>

              {/* Wager Pill Selector */}
              <div className="flex flex-wrap gap-1">
                {QUICK_WAGERS.slice(0, 5).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => { sounds.playClick(); setQuickWager(w); }}
                    className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold cursor-pointer transition-all ${
                      quickWager === w
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {w >= 1000000 ? `${w / 1000000}M` : `${w / 1000}K`}
                  </button>
                ))}
              </div>

              {/* Quick Match Launch Button */}
              <button
                type="button"
                onClick={handleQuickMatchSearch}
                disabled={isSearchingQuick || balance < quickWager}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSearchingQuick ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Quét Tìm Người Chơi Thật...</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-3.5 h-3.5" />
                    <span>TÌM ĐỐI THỦ THẬT • {quickWager.toLocaleString('vi-VN')} XU</span>
                  </>
                )}
              </button>

              {/* Searching Quick Status Banner */}
              {isSearchingQuick && (
                <div className="flex flex-col gap-1 mt-1 p-2 rounded-xl bg-slate-900/90 border border-amber-500/40 text-center animate-fadeIn">
                  <span className="text-[10px] text-amber-300 font-black flex items-center justify-center gap-1">
                    <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span>Đang quét tìm bàn người chơi thật cùng mức {quickWager.toLocaleString('vi-VN')} Xu...</span>
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setIsSearchingQuick(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Dừng Quét
                    </button>
                    <button
                      type="button"
                      onClick={handleForceMatchBot}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      🤖 Ghép Ngay Với Bot AI
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: TẠO PHÒNG THÁCH ĐẤU */}
            <div className="p-2.5 bg-slate-950/90 rounded-xl border border-purple-500/40 flex flex-col gap-2 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-purple-300 font-black text-xs uppercase">
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tự Mở Bàn Solo</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 border border-purple-400/50 text-purple-300 font-mono font-bold">
                  Đăng Lên Sảnh
                </span>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-3 gap-1">
                {(['QUICK', 'BO3', 'BO5'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { sounds.playClick(); setCustomMode(m); }}
                    className={`py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                      customMode === m
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'QUICK' ? '1 Hiệp' : m}
                  </button>
                ))}
              </div>

              {/* Wagers */}
              <div className="flex flex-wrap gap-1">
                {[500000, 1000000, 2000000, 5000000, 10000000].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => { sounds.playClick(); setCustomWager(w); }}
                    className={`px-2 py-0.5 rounded-lg border text-[9px] font-mono font-bold cursor-pointer transition-all ${
                      customWager === w
                        ? 'bg-purple-600 text-white border-purple-400 font-black shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {w >= 1000000 ? `${w / 1000000}M` : `${w / 1000}K`}
                  </button>
                ))}
              </div>

              {/* Create Room Button */}
              <button
                type="button"
                onClick={handleCreateRealRoom}
                disabled={roomCreatedWaiting || balance < customWager}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {roomCreatedWaiting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Bàn Đang Treo Công Khai...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>MỞ PHÒNG • {customWager.toLocaleString('vi-VN')} XU</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ACTIVE MY ROOM STATUS BANNER */}
          {roomCreatedWaiting && (
            <div className="p-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 rounded-2xl border-2 border-emerald-500/80 shadow-2xl flex flex-col gap-2 text-center animate-fadeIn">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-xs uppercase">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>BÀN CƯỢC CỦA BẠN ĐANG TREO CÔNG KHAI TRÊN SẢNH</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Mức cược: <strong className="text-amber-300">{customWager.toLocaleString('vi-VN')} Xu</strong> • Thể thức: <strong className="text-emerald-300">{customMode === 'QUICK' ? '1 Hiệp' : customMode}</strong>
              </p>
              <p className="text-[10px] text-slate-400 italic">
                🔴 Đang chờ người chơi thật khác nhận kèo... Không tự động xếp bot nữa!
              </p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleCancelMyRoom}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  ❌ Hủy Mở Bàn
                </button>
                <button
                  type="button"
                  onClick={handleForceMatchBot}
                  className="px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🤖 Chơi Ngay Với Bot AI</span>
                </button>
              </div>
            </div>
          )}

          {/* DANH SÁCH BÀN THÁCH ĐẤU ĐANG CHỜ TRỰC TUYẾN */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase flex items-center gap-1">
                <span>Bàn Thách Đấu Trực Tuyến Đang Chờ</span>
                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {opponentsList.length}
                </span>
              </span>
              <span className="text-[9px] text-slate-400 italic">Chọn đối thủ để nhận kèo ngay</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {opponentsList.map((opp) => (
                <div
                  key={opp.id}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-2 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <img
                        src={opp.avatar}
                        alt={opp.name}
                        className="w-9 h-9 rounded-xl border border-slate-700 object-cover shadow-sm"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-white text-xs truncate max-w-[90px] sm:max-w-[120px]">
                          {opp.name}
                        </span>
                        <span className={`text-[7px] px-1 py-0.2 rounded border font-black ${opp.badgeColor}`}>
                          {opp.badge}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                        <span className="text-amber-400 font-bold">Cược: {opp.wager >= 1000000 ? `${opp.wager / 1000000}M` : `${opp.wager / 1000}K`}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">Thắng: {opp.winRate}%</span>
                        <span>•</span>
                        <span>{opp.mode === 'QUICK' ? '1 Hiệp' : opp.mode}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startPvpMatch(opp)}
                    disabled={balance < opp.wager}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-[11px] shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    THÁCH ĐẤU
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MATCH ARENA VIEW: TRẬN ĐẤU SOLO 1V1 TRỰC TIẾP */}
      {/* ============================================================== */}
      {pvpView === 'MATCH' && activeMatch && (
        <div className="flex flex-col gap-2">
          {/* Header Bar */}
          <div className="p-1.5 sm:p-2 bg-slate-950 rounded-xl border border-amber-500/40 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-xs font-black text-amber-400 uppercase">
                HIỆP {activeMatch.roundNumber} ({activeMatch.mode === 'QUICK' ? '1 Hiệp Ăn Ngay' : activeMatch.mode})
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                • Hũ Cược: <strong>{(activeMatch.wager * 2).toLocaleString('vi-VN')} Xu</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono font-black text-xs sm:text-sm">
              <span className="text-emerald-400">BẠN: {activeMatch.userScore}</span>
              <span className="text-slate-600">VS</span>
              <span className="text-rose-400">{activeMatch.opponent.name}: {activeMatch.opponentScore}</span>
            </div>
          </div>

          {/* 3 COLUMNS: YOU vs BOWL vs REAL OPPONENT */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 items-center">
            {/* USER CARD (BÊN TRÁI) */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-center shadow-md relative">
              {/* User Taunt Bubble */}
              {userBubble && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-950 border border-emerald-400 text-emerald-200 text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg animate-bounce z-20">
                  {userBubble}
                </div>
              )}

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-xl sm:text-2xl mb-1 shadow-sm">
                😎
              </div>
              <span className="font-extrabold text-white text-[10px] sm:text-xs truncate w-full">Bạn</span>
              <span className="text-[8px] text-slate-400 font-mono">Ví: {balance.toLocaleString('vi-VN')} Xu</span>

              {/* Pick Side Selector */}
              {activeMatch.status === 'CHOOSING' ? (
                <div className="grid grid-cols-2 gap-1 w-full mt-1.5">
                  <button
                    type="button"
                    onClick={() => { sounds.playClick(); setMatchUserPick('COM'); }}
                    className={`py-1 rounded-lg text-[9px] font-black border transition-all cursor-pointer ${
                      matchUserPick === 'COM'
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md ring-1 ring-amber-400'
                        : 'bg-slate-900 border-slate-800 text-amber-300'
                    }`}
                  >
                    🍚 CƠM
                  </button>
                  <button
                    type="button"
                    onClick={() => { sounds.playClick(); setMatchUserPick('CUT'); }}
                    className={`py-1 rounded-lg text-[9px] font-black border transition-all cursor-pointer ${
                      matchUserPick === 'CUT'
                        ? 'bg-amber-800 text-white border-amber-600 shadow-md ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800 text-amber-500'
                    }`}
                  >
                    💩 CỨT
                  </button>
                </div>
              ) : (
                <div className="mt-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black truncate w-full">
                  {matchUserPick === 'COM' ? '🍚 CƠM (11-17)' : '💩 CỨT (4-10)'}
                </div>
              )}
            </div>

            {/* CASINO SHAKING BOWL (Ở GIỮA) */}
            <div className="flex flex-col items-center justify-center p-2 sm:p-3 bg-slate-950/90 rounded-xl border border-amber-500/40 min-h-[105px] sm:min-h-[140px] relative">
              {isShaking ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="text-3xl sm:text-4xl animate-bounce">🥣</div>
                  <span className="text-[9px] sm:text-xs font-black text-amber-400 tracking-wider animate-pulse">
                    ĐANG LẮC BÁT...
                  </span>
                </div>
              ) : lidOpen && activeMatch.dices ? (
                <div className="flex flex-col items-center gap-1 animate-fadeIn">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {activeMatch.dices.map((d, i) => (
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
                      {activeMatch.total} Điểm
                    </span>
                    <span className={`text-[9px] sm:text-xs px-1.5 py-0.2 rounded-full font-black ${
                      activeMatch.outcome === 'COM' ? 'bg-amber-500 text-slate-950' : 'bg-amber-900 text-amber-200'
                    }`}>
                      {activeMatch.isBao ? '🌪️ BÃO TAM HOA' : activeMatch.outcome === 'COM' ? '🍚 CƠM' : '💩 CỨT'}
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

            {/* OPPONENT CARD (BÊN PHẢI) */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-slate-950/80 border border-rose-500/40 text-center shadow-md relative">
              {/* Opponent Taunt Bubble */}
              {opponentBubble && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-rose-950 border border-rose-400 text-rose-200 text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg animate-bounce z-20">
                  {opponentBubble}
                </div>
              )}

              <img
                src={activeMatch.opponent.avatar}
                alt={activeMatch.opponent.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 border-rose-400 mb-1 shadow-sm object-cover"
              />
              <span className="font-extrabold text-white text-[10px] sm:text-xs truncate w-full">
                {activeMatch.opponent.name}
              </span>
              <span className="text-[8px] text-rose-300 font-mono">
                {activeMatch.opponent.badge}
              </span>

              <div className="mt-1 px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[10px] font-black truncate w-full">
                {activeMatch.status === 'CHOOSING'
                  ? (matchUserPick === 'COM' ? '💩 CỨT (4-10)' : '🍚 CƠM (11-17)')
                  : (activeMatch.opponentPick === 'COM' ? '🍚 CƠM (11-17)' : '💩 CỨT (4-10)')}
              </div>
            </div>
          </div>

          {/* Quick Taunt / Gáy Bar */}
          <div className="p-1 sm:p-1.5 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
            <span className="text-[9px] font-black text-slate-400 shrink-0 uppercase">Gáy nhanh:</span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {TAUNT_QUOTES.slice(0, 4).map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendTaunt(q)}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[9px] font-bold text-slate-300 whitespace-nowrap active:scale-95 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Ongoing Match Controls */}
          {activeMatch.status === 'CHOOSING' && (
            <button
              type="button"
              onClick={handleLaunchPvpRound}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Swords className="w-4 h-4" />
              <span>XÁC NHẬN CHỌN CỬA & LẮC BÁT</span>
            </button>
          )}

          {activeMatch.status === 'ROUND_OVER' && (
            <div className="flex flex-col items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-amber-500/40">
              <span className="text-xs font-black">
                {activeMatch.roundWinner === 'USER' && (
                  <span className="text-emerald-400">🎉 Bạn thắng Hiệp {activeMatch.roundNumber}!</span>
                )}
                {activeMatch.roundWinner === 'OPPONENT' && (
                  <span className="text-rose-400">❌ {activeMatch.opponent.name} thắng Hiệp {activeMatch.roundNumber}!</span>
                )}
                {activeMatch.roundWinner === 'DRAW' && (
                  <span className="text-slate-300">🤝 Hiệp {activeMatch.roundNumber} Hòa Điểm!</span>
                )}
              </span>

              <button
                type="button"
                onClick={handleNextRoundPvp}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-md active:scale-95 cursor-pointer"
              >
                ▶️ Hiệp Tiếp Theo
              </button>
            </div>
          )}

          {activeMatch.status === 'MATCH_OVER' && (
            <div className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center shadow-xl ${
              activeMatch.matchWinner === 'USER'
                ? 'bg-emerald-950/80 border-emerald-500'
                : activeMatch.matchWinner === 'OPPONENT'
                ? 'bg-rose-950/80 border-rose-500'
                : 'bg-slate-950 border-slate-700'
            }`}>
              {activeMatch.matchWinner === 'USER' && (
                <>
                  <Crown className="w-7 h-7 text-yellow-400 animate-bounce" />
                  <h3 className="text-sm sm:text-base font-black text-emerald-300 uppercase">
                    🏆 CHIẾN THẮNG SOLO 1V1 TRƯỚC {activeMatch.opponent.name}!
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Húp trọn Hũ <strong>+{(activeMatch.wager * 2).toLocaleString('vi-VN')} Xu</strong> và nhận EXP Danh Vọng PvP!
                  </p>
                </>
              )}

              {activeMatch.matchWinner === 'OPPONENT' && (
                <>
                  <Skull className="w-7 h-7 text-rose-400 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-black text-rose-300 uppercase">
                    ❌ THUA SOLO TRƯỚC {activeMatch.opponent.name}!
                  </h3>
                  <p className="text-xs text-rose-200">
                    Mất {activeMatch.wager.toLocaleString('vi-VN')} Xu.
                  </p>
                </>
              )}

              {activeMatch.matchWinner === 'DRAW' && (
                <>
                  <h3 className="text-sm font-black text-white uppercase">🤝 TRẬN ĐẤU HÒA!</h3>
                  <p className="text-xs text-slate-300">Đã hoàn lại cược vào ví của bạn.</p>
                </>
              )}

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => startPvpMatch(activeMatch.opponent)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-md active:scale-95 cursor-pointer"
                >
                  🔄 Tái Đấu Ngay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setActiveMatch(null);
                    setPvpView('LOBBY');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition-all cursor-pointer"
                >
                  🚪 Về Sảnh Solo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
