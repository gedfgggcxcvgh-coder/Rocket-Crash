/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, FlightMode, PlayerBet, RoundHistory, UserStats, ChatMessage, ActiveFlightEvent, FlightEventType } from './types/game';
import { DiscordUser } from './types/discord';
import { sounds } from './utils/audio';
import { generateSeed, sha256, calculateMultiplier, getAltitudeStage } from './utils/provablyFair';
import { getSavedDiscordUser, syncGameDataWithDiscord } from './utils/discordAuth';
import { RocketCanvas } from './components/RocketCanvas';
import { RecentRoundsBar } from './components/RecentRoundsBar';
import { BettingControls } from './components/BettingControls';
import { LiveBetsList } from './components/LiveBetsList';
import { CommunityChat } from './components/CommunityChat';
import { ProvablyFairModal } from './components/ProvablyFairModal';
import { DiscordAccountModal } from './components/DiscordAccountModal';
import { UserStatsModal } from './components/UserStatsModal';
import { RulesModal } from './components/RulesModal';
import { Volume2, VolumeX, Coins } from 'lucide-react';

const INITIAL_BALANCE = 500000;

const BOT_NAMES = [
  'ThánhGồng_x100', 'Bảo_AllIn', 'Long_CayCú', 'Dũng_HúpBạc', 
  'Trùm_NổSớm', 'Huy_CháyTúi', 'Tuấn_TayTo', 'Sơn_NonTay', 
  'Đạt_GỡNợ', 'Khang_BịpVcl', 'Phúc_KhôMáu', 'Nam_ĂnNon',
  'AnhBa_BaoSàn', 'Tùng_ChốtNon', 'Minh_TayVàng'
];

const TAB_ID = typeof window !== 'undefined' ? (Math.random().toString(36).substring(2) + Date.now().toString(36)) : 'default';

const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('rocket_crash_cross_tab_sync')
  : null;

const INITIAL_CHATS: ChatMessage[] = [
  { id: '1', user: 'Huy_CháyTúi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Huy', text: 'Má ván trước vừa vào định gồng x50 thì toang, cay dái thật', time: '14:26' },
  { id: '2', user: 'Tuấn_TayTo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan', text: 'Non thì chịu đi chú em, vừa làm phát 50k xu ấm cật haha', time: '14:27' },
  { id: '3', user: 'Bảo_AllIn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao', text: 'Ván này bố m tất tay khô máu, đéo tin k lên nổi x10!', time: '14:28' },
  { id: '4', user: 'Nam_ĂnNon', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nam', text: 'Cứ 2x tao nhảy, ăn non cho lành cãi nhau làm đéo gì', time: '14:29' },
];

const getGuestUserId = (): string => {
  let id = localStorage.getItem('rocket_crash_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('rocket_crash_guest_id', id);
  }
  return id;
};

export default function App() {
  // Game Loop States
  const [phase, setPhase] = useState<GamePhase>('COUNTDOWN');
  const [countdown, setCountdown] = useState<number>(5.0);
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [crashPoint, setCrashPoint] = useState<number>(6.50);
  const [currentRoundId, setCurrentRoundId] = useState<string>(() => Date.now().toString());
  const [currentSeed, setCurrentSeed] = useState<string>('');
  const [currentHash, setCurrentHash] = useState<string>('');

  // Flight Mode
  const [flightMode, setFlightMode] = useState<FlightMode>(() => {
    const saved = localStorage.getItem('rocket_crash_flight_mode');
    return (saved as FlightMode) || 'HIGH_FLYER';
  });

  // Discord Linked Account State
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(() => getSavedDiscordUser());

  // User Betting State
  const [balance, setBalance] = useState<number>(() => {
    const savedDiscord = getSavedDiscordUser();
    if (savedDiscord) return savedDiscord.balance;
    const savedGuest = localStorage.getItem('rocket_crash_guest_balance');
    return savedGuest ? parseInt(savedGuest, 10) : INITIAL_BALANCE;
  });
  const [userBet, setUserBet] = useState<number>(0);
  const [userCashedOut, setUserCashedOut] = useState<boolean>(false);
  const [userCashoutMultiplier, setUserCashoutMultiplier] = useState<number | undefined>(undefined);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState<number>(3.0);

  // History & Community
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [players, setPlayers] = useState<PlayerBet[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHATS);

  // User Statistics
  const [stats, setStats] = useState<UserStats>(() => {
    const savedDiscord = getSavedDiscordUser();
    if (savedDiscord) {
      return {
        balance: savedDiscord.balance,
        totalGames: savedDiscord.totalGames,
        wins: savedDiscord.wins,
        losses: savedDiscord.losses,
        totalProfit: savedDiscord.totalProfit,
        highestMultiplier: savedDiscord.highestMultiplier,
        totalWagered: savedDiscord.totalWagered,
      };
    }
    const savedGuest = localStorage.getItem('rocket_crash_guest_stats');
    if (savedGuest) {
      try { return JSON.parse(savedGuest); } catch {}
    }
    return {
      balance: INITIAL_BALANCE,
      totalGames: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      highestMultiplier: 0,
      totalWagered: 0,
    };
  });

  const currentUserId = discordUser ? discordUser.id : getGuestUserId();

  // On startup: Fetch fresh account balance and stats from central server for cross-device sync
  useEffect(() => {
    fetch(`/api/user/${currentUserId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(serverData => {
        if (serverData && typeof serverData.balance === 'number') {
          setBalance(serverData.balance);
          if (serverData.stats) {
            setStats(prev => ({ ...prev, ...serverData.stats }));
          }
        }
      })
      .catch(() => {});
  }, [currentUserId]);

  // Real-time Cross-Tab Syncing (BroadcastChannel + Storage Event + Focus Event)
  useEffect(() => {
    if (!syncChannel) return;

    const handleSyncMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'SYNC_CHAT_MESSAGE' && data.msg) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.msg.id)) return prev;
          return [...prev.slice(-40), data.msg];
        });
        return;
      }

      if (data.tabId === TAB_ID || data.type !== 'SYNC_ACCOUNT_STATE') return;

      if (data.discordUser !== undefined) {
        setDiscordUser(data.discordUser);
      }

      if (typeof data.balance === 'number') {
        setBalance(data.balance);
      }

      if (data.stats) {
        setStats(data.stats);
      }
    };

    syncChannel.addEventListener('message', handleSyncMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rocket_crash_discord_user') {
        const newUser = getSavedDiscordUser();
        setDiscordUser(newUser);
        if (newUser) {
          setBalance(newUser.balance);
        }
      } else if (e.key === 'rocket_crash_guest_balance') {
        if (!getSavedDiscordUser()) {
          const val = e.newValue ? parseInt(e.newValue, 10) : INITIAL_BALANCE;
          setBalance(val);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    const handleFocus = () => {
      const currentDiscord = getSavedDiscordUser();
      if (currentDiscord && currentDiscord.id) {
        fetch(`/api/user/${currentDiscord.id}`)
          .then(res => (res.ok ? res.json() : null))
          .then(serverData => {
            if (serverData && typeof serverData.balance === 'number') {
              setBalance(serverData.balance);
              if (serverData.stats) {
                setStats(prev => ({ ...prev, ...serverData.stats }));
              }
            }
          })
          .catch(() => {});
      } else {
        const savedGuest = localStorage.getItem('rocket_crash_guest_balance');
        if (savedGuest) setBalance(parseInt(savedGuest, 10));
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      syncChannel.removeEventListener('message', handleSyncMessage);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Broadcast local account balance/state changes to all other open tabs in real-time
  useEffect(() => {
    if (syncChannel) {
      syncChannel.postMessage({
        type: 'SYNC_ACCOUNT_STATE',
        tabId: TAB_ID,
        balance,
        stats,
        discordUser,
      });
    }
  }, [balance, stats, discordUser]);

  // Periodically poll central server for account updates if logged into Discord
  useEffect(() => {
    if (!discordUser?.id) return;

    const interval = setInterval(() => {
      fetch(`/api/user/${discordUser.id}`)
        .then(res => (res.ok ? res.json() : null))
        .then(serverData => {
          if (serverData && typeof serverData.balance === 'number') {
            setBalance(prev => (prev !== serverData.balance ? serverData.balance : prev));
            if (serverData.stats) {
              setStats(prev => ({ ...prev, ...serverData.stats }));
            }
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [discordUser?.id]);

  // Automatically sync gameplay data to Discord account
  useEffect(() => {
    if (discordUser) {
      syncGameDataWithDiscord(discordUser, balance, stats);
    }
  }, [balance, stats, discordUser]);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedAuditRound, setSelectedAuditRound] = useState<RoundHistory | null>(null);
  const [showDiscordModal, setShowDiscordModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Surprise Flight Events States
  const [activeEvent, setActiveEvent] = useState<ActiveFlightEvent | null>(null);
  const [shieldSavedBet, setShieldSavedBet] = useState<boolean>(false);

  // References for requestAnimationFrame loop
  const flightStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const isCashedOutRef = useRef<boolean>(false);
  const userBetRef = useRef<number>(0);
  const autoCashoutEnabledRef = useRef<boolean>(false);
  const autoCashoutTargetRef = useRef<number>(3.0);
  const flightModeRef = useRef<FlightMode>(flightMode);
  const milestoneReachedRef = useRef<{ [key: number]: boolean }>({});
  const botChattedCashoutRef = useRef<{ [key: string]: boolean }>({});

  // Surprise event tracking refs
  const plannedEventRef = useRef<{ triggered: boolean; triggerMult: number; type: FlightEventType } | null>(null);
  const activeEventRef = useRef<ActiveFlightEvent | null>(null);
  const effectiveTRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Keep refs synced
  useEffect(() => {
    isCashedOutRef.current = userCashedOut;
  }, [userCashedOut]);

  useEffect(() => {
    userBetRef.current = userBet;
  }, [userBet]);

  useEffect(() => {
    autoCashoutEnabledRef.current = autoCashoutEnabled;
    autoCashoutTargetRef.current = autoCashoutTarget;
  }, [autoCashoutEnabled, autoCashoutTarget]);

  useEffect(() => {
    flightModeRef.current = flightMode;
    localStorage.setItem('rocket_crash_flight_mode', flightMode);
  }, [flightMode]);

  // Persist balance
  useEffect(() => {
    if (!discordUser) {
      localStorage.setItem('rocket_crash_guest_balance', balance.toString());
    }
  }, [balance, discordUser]);

  // Persist stats
  useEffect(() => {
    if (!discordUser) {
      localStorage.setItem('rocket_crash_guest_stats', JSON.stringify(stats));
    }
  }, [stats, discordUser]);

  // --- REALTIME GLOBAL SERVER STREAM (SSE) ---
  const currentRoundIdRef = useRef<string>('');
  const prevPhaseRef = useRef<GamePhase>('COUNTDOWN');
  const flightStartTimeMsRef = useRef<number>(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/game/stream');

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (!data) return;

            // Reset round states if round changed
            if (data.roundId !== currentRoundIdRef.current) {
              currentRoundIdRef.current = data.roundId;
              setCurrentRoundId(data.roundId);
              setUserCashedOut(false);
              setUserCashoutMultiplier(undefined);
              setUserBet(0);
            }

            setPhase(data.status);
            setCountdown(data.countdown);
            setCrashPoint(data.crashPoint);
            setCurrentSeed(data.seed);
            setCurrentHash(data.hash);

            if (data.status === 'FLYING' && data.startTime) {
              flightStartTimeMsRef.current = data.startTime;
            } else if (data.status === 'CRASHED') {
              setMultiplier(data.crashPoint);
            } else if (data.status === 'COUNTDOWN') {
              setMultiplier(1.00);
            }

            if (Array.isArray(data.chat)) {
              setMessages(prev => {
                const pendingTemps = prev.filter(m => m.id.startsWith('temp_'));
                const serverIds = new Set(data.chat.map((m: any) => m.id));
                const uniqueTemps = pendingTemps.filter(m => !serverIds.has(m.id));
                return [...data.chat, ...uniqueTemps];
              });
            }

            if (Array.isArray(data.history)) {
              setHistory(data.history.map((h: any) => ({
                id: h.id,
                multiplier: h.crashPoint,
                timestamp: h.timestamp || Date.now(),
                seed: h.seed,
                hash: h.hash,
                mode: 'HIGH_FLYER',
              })));
            }

            if (data.userBalances && typeof data.userBalances[currentUserId] === 'number') {
              setBalance(data.userBalances[currentUserId]);
            }

            if (Array.isArray(data.players)) {
              const mappedPlayers: PlayerBet[] = data.players.map((p: any) => ({
                id: p.id,
                username: p.username,
                avatar: p.avatar,
                betAmount: p.betAmount,
                cashoutMultiplier: p.cashoutMultiplier || p.targetMultiplier,
                status: p.status === 'CASHED_OUT' ? 'WON' : p.status === 'CRASHED' ? 'LOST' : 'FLYING',
                winAmount: p.cashoutMultiplier ? Math.floor(p.betAmount * p.cashoutMultiplier) : undefined,
                isCurrentUser: p.id === currentUserId,
              }));
              setPlayers(mappedPlayers);

              // Check if current user cashed out on server
              const me = data.players.find((p: any) => p.id === currentUserId);
              if (me && me.status === 'CASHED_OUT' && !userCashedOut) {
                sounds.playCashoutWin();
                setUserCashedOut(true);
                const finalMult = me.cashoutMultiplier || me.targetMultiplier || 1.0;
                setUserCashoutMultiplier(finalMult);
                const winAmount = Math.floor(me.betAmount * finalMult);
                setBalance(prev => prev + winAmount);
                const netProfit = winAmount - me.betAmount;
                setStats(prev => ({
                  ...prev,
                  totalGames: prev.totalGames + 1,
                  wins: prev.wins + 1,
                  totalProfit: prev.totalProfit + netProfit,
                  highestMultiplier: Math.max(prev.highestMultiplier, finalMult),
                }));
              }
            }

            // Audio & Phase transition effects
            if (prevPhaseRef.current !== data.status) {
              if (data.status === 'FLYING') {
                sounds.startEngine();
              } else if (data.status === 'CRASHED') {
                sounds.stopEngine();
                sounds.playExplosion();
              } else if (data.status === 'COUNTDOWN') {
                sounds.playCountdownBeep(false);
              }
              prevPhaseRef.current = data.status;
            }
          } catch (err) {
            console.error('SSE parse error:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            setTimeout(connectSSE, 2000);
          }
        };
      } catch (err) {
        console.error('SSE connect error:', err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [discordUser?.id, userCashedOut]);

  // Smooth 60 FPS flight multiplier interpolation
  useEffect(() => {
    if (phase !== 'FLYING') return;

    let animFrame: number;
    const updateSmoothMultiplier = () => {
      if (flightStartTimeMsRef.current > 0) {
        const elapsedSec = (Date.now() - flightStartTimeMsRef.current) / 1000;
        const currentMult = parseFloat(Math.max(1.00, Math.pow(Math.E, 0.06 * elapsedSec)).toFixed(2));
        setMultiplier(prev => (currentMult > prev ? Math.min(currentMult, crashPoint) : prev));
      }
      animFrame = requestAnimationFrame(updateSmoothMultiplier);
    };

    animFrame = requestAnimationFrame(updateSmoothMultiplier);
    return () => cancelAnimationFrame(animFrame);
  }, [phase, crashPoint]);

  // Handle Mode Change
  const handleSelectFlightMode = (newMode: FlightMode) => {
    setFlightMode(newMode);
    flightModeRef.current = newMode;
    if (phase === 'COUNTDOWN') {
      // Recalculate crash point immediately for upcoming round
      if (currentSeed) {
        const newCrash = calculateMultiplier(currentSeed, newMode);
        setCrashPoint(newCrash);
      }
    }
  };

  // Trigger surprise in-flight event
  const triggerFlightEvent = (type: FlightEventType, atMultiplier: number) => {
    let title = '';
    let description = '';
    let durationMs = 4500;
    let rewardAmount: number | undefined;

    switch (type) {
      case 'WARP_NITRO':
        title = 'WARP NITRO: TĂNG TỐC x2!';
        description = 'Động cơ siêu thanh kích hoạt, hệ số phi nước đại!';
        durationMs = 2800;
        sounds.playWarpSpeed();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `warp_${Date.now()}`,
            user: 'Tuấn_TayTo',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan',
            text: '⚡ VÃI CẢ ĐÁI NITRO BẬT RỒI!! Tên lửa phi như điên x2 tốc độ anh em ơiii 🚀💨',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'ALIEN_SHIELD':
        title = 'UFO BẢO VỆ: KHIÊN HOÀN 100% CƯỢC!';
        description = 'UFO hộ tống bảo hiểm toàn bộ tiền cược nếu nổ!';
        durationMs = 7000;
        sounds.playShieldActivate();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `shield_${Date.now()}`,
            user: 'Bảo_AllIn',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao',
            text: '🛸 ĐÙ MÁ UFO BUFF KHIÊN KÌA!! Quả này nổ cũng đéo mất tiền cược, gồng khô máu đê!! 🔥',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'COSMIC_AIRDROP':
        rewardAmount = Math.floor(Math.random() * 2000) + 1000; // 1.000 - 3.000 Xu
        title = 'RƯƠNG TIẾP TẾ VŨ TRỤ';
        description = 'Hòm vàng rơi từ quỹ đạo, bấm nhanh để lụm!';
        durationMs = 6500;
        sounds.playClaimReward();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `airdrop_${Date.now()}`,
            user: 'Phúc_KhôMáu',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Phuc',
            text: '🎁 Có rương tiếp tế vũ trụ rơi kìa anh em, ai nhanh tay bấm lụm lẹ!! 🤑',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'ENGINE_OVERHEAT':
        title = 'BÁO ĐỘNG ĐỎ: ĐỘNG CƠ QUÁ NHIỆT (2.5S)!';
        description = 'Nhiệt độ động cơ cực đại! Nguy cơ nổ cao trong 2.5s!';
        durationMs = 2800;
        sounds.playAlarm();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `overheat_${Date.now()}`,
            user: 'Huy_CháyTúi',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Huy',
            text: '⚠️ VCL CÒI HÚ QUÁ TẢI ĐỘNG CƠ!! Nhảy mau các bố ơi không toang cả lũ bây giờ!! 😱🚨',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'LUCKY_ENVELOPE':
        rewardAmount = Math.floor(Math.random() * 800) + 400; // 400 - 1.200 Xu
        title = 'BAO LÌ XÌ ĐẠI GIA';
        description = 'Đại gia phát lộc lì xì may mắn rơi từ không gian!';
        durationMs = 6000;
        sounds.playClaimReward();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `lucky_${Date.now()}`,
            user: 'AnhBa_BaoSàn',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnhBa',
            text: '🧧 Tao vừa húp đậm, ném bao lì xì phát lộc cho anh em lụm nhanh tay nhé! 💸💸',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;
    }

    const ev: ActiveFlightEvent = {
      id: `ev_${Date.now()}`,
      type,
      title,
      description,
      startedAtMultiplier: atMultiplier,
      durationMs,
      expiresAtTimestamp: Date.now() + durationMs,
      rewardAmount,
      rewardClaimed: false,
    };

    setActiveEvent(ev);
    activeEventRef.current = ev;
  };

  // User claims interactive reward (Airdrop crate or Lucky Envelope)
  const handleClaimEventReward = (ev: ActiveFlightEvent) => {
    if (ev.rewardClaimed) return;
    sounds.playClaimReward();
    const amt = ev.rewardAmount || 1000;
    setBalance(prev => prev + amt);
    setActiveEvent(prev => (prev ? { ...prev, rewardClaimed: true } : null));
    if (activeEventRef.current) {
      activeEventRef.current.rewardClaimed = true;
    }
    setMessages(prev => [
      ...prev.slice(-30),
      {
        id: `claim_${Date.now()}`,
        user: 'Bạn',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=You',
        text: `Đã lụm thành công phần thưởng sự kiện +${amt.toLocaleString('vi-VN')} Xu! 🤑✨`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'LUCKY',
        isSystem: true,
      },
    ]);
  };

  // Auto Cashout trigger when rocket multiplier reaches user's target
  useEffect(() => {
    if (
      phase === 'FLYING' &&
      userBet > 0 &&
      !userCashedOut &&
      autoCashoutEnabled &&
      multiplier >= autoCashoutTarget
    ) {
      handleCashoutClick();
    }
  }, [phase, userBet, userCashedOut, autoCashoutEnabled, multiplier, autoCashoutTarget]);

  // Place Bet via Server API
  const handlePlaceBet = async (amount: number) => {
    if (amount <= 0 || amount > balance) return;
    sounds.playClick();
    setUserBet(amount);

    const userId = discordUser?.id || 'guest_user';
    const username = discordUser ? (discordUser.globalName || discordUser.username) : 'Khách';
    const avatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest';

    try {
      const res = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username,
          avatar,
          betAmount: amount,
          targetMultiplier: autoCashoutEnabled ? autoCashoutTarget : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Đặt cược thất bại.');
        setUserBet(0);
        return;
      }

      if (typeof data.newBalance === 'number') {
        setBalance(data.newBalance);
      } else {
        setBalance(prev => prev - amount);
      }

      setStats(prev => ({
        ...prev,
        totalWagered: prev.totalWagered + amount,
      }));
    } catch (err) {
      console.error('Bet API error:', err);
    }
  };

  // Cancel Bet during COUNTDOWN
  const handleCancelBet = () => {
    if (userBet <= 0 || phase !== 'COUNTDOWN') return;
    sounds.playClick();
    setBalance(prev => prev + userBet);
    setUserBet(0);
  };

  // Manual Cashout button click via Server API
  const handleCashoutClick = async () => {
    if (userCashedOut || phase !== 'FLYING') return;

    const userId = discordUser?.id || 'guest_user';

    try {
      const res = await fetch('/api/game/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) return;

      sounds.playCashoutWin();
      setUserCashedOut(true);
      setUserCashoutMultiplier(data.cashoutMultiplier);

      if (typeof data.newBalance === 'number') {
        setBalance(data.newBalance);
      } else {
        setBalance(prev => prev + data.winAmount);
      }

      const netProfit = data.winAmount - userBet;
      setStats(prev => ({
        ...prev,
        totalGames: prev.totalGames + 1,
        wins: prev.wins + 1,
        totalProfit: prev.totalProfit + netProfit,
        highestMultiplier: Math.max(prev.highestMultiplier, data.cashoutMultiplier),
      }));

      // Post to chat
      const stage = getAltitudeStage(data.cashoutMultiplier);
      const userDisplayName = discordUser ? (discordUser.globalName || discordUser.username) : 'Bạn';
      const userAvatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=You';
      setMessages(prev => [
        ...prev.slice(-30),
        {
          id: Date.now().toString(),
          user: userDisplayName,
          avatar: userAvatar,
          text: `Đã chốt lời an toàn tại ${data.cashoutMultiplier.toFixed(2)}x [${stage.badge}] (+${data.winAmount.toLocaleString('vi-VN')} Xu)! 🤑🎉`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: discordUser ? 'DISCORD' : 'VIP',
          isSystem: true,
        },
      ]);
    } catch (err) {
      console.error('Cashout API error:', err);
    }
  };

  // Free Faucet replenishment
  const handleAddFunds = async (amount: number) => {
    sounds.playCashoutWin();
    try {
      const res = await fetch('/api/user/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, amount }),
      });
      const resData = await res.json();
      if (res.ok && typeof resData.balance === 'number') {
        setBalance(resData.balance);
      } else {
        setBalance(prev => prev + amount);
      }
    } catch {
      setBalance(prev => prev + amount);
    }
  };

  // Toggle Sound
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  // Send message to global chat via Server API
  const handleSendMessage = async (text: string) => {
    if (!text || !text.trim()) return;
    const userDisplayName = discordUser ? (discordUser.globalName || discordUser.username) : 'Bạn';
    const userAvatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=You';
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const tempMsg: ChatMessage = {
      id: tempId,
      user: userDisplayName,
      avatar: userAvatar,
      badge: discordUser ? 'DISCORD' : 'VIP',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistically add to UI immediately
    setMessages(prev => [...prev.slice(-40), tempMsg]);

    // Broadcast locally across tabs
    if (syncChannel) {
      syncChannel.postMessage({
        type: 'SYNC_CHAT_MESSAGE',
        msg: tempMsg,
      });
    }

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userDisplayName,
          avatar: userAvatar,
          badge: discordUser ? 'DISCORD' : 'VIP',
          text: text.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages(prev => prev.map(m => (m.id === tempId ? data.message : m)));
      }
    } catch (err) {
      console.error('Chat API error:', err);
    }
  };

  // Handle Discord Account login & logout state transitions
  const handleUpdateDiscordUser = (newUser: DiscordUser | null) => {
    setDiscordUser(newUser);
    if (!newUser) {
      // Disconnected / Logged out: Restore separate Guest account balance and stats!
      const savedGuestBalance = localStorage.getItem('rocket_crash_guest_balance');
      const guestBalance = savedGuestBalance ? parseInt(savedGuestBalance, 10) : INITIAL_BALANCE;
      setBalance(guestBalance);

      const savedGuestStats = localStorage.getItem('rocket_crash_guest_stats');
      if (savedGuestStats) {
        try {
          setStats(JSON.parse(savedGuestStats));
        } catch {
          setStats({
            balance: guestBalance,
            totalGames: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            highestMultiplier: 0,
            totalWagered: 0,
          });
        }
      } else {
        setStats({
          balance: guestBalance,
          totalGames: 0,
          wins: 0,
          losses: 0,
          totalProfit: 0,
          highestMultiplier: 0,
          totalWagered: 0,
        });
      }
    } else {
      // Logged in: Restore this specific Discord user's balance and stats!
      setBalance(newUser.balance);
      setStats({
        balance: newUser.balance,
        totalGames: newUser.totalGames,
        wins: newUser.wins,
        losses: newUser.losses,
        totalProfit: newUser.totalProfit,
        highestMultiplier: newUser.highestMultiplier,
        totalWagered: newUser.totalWagered,
      });
    }
  };

  // Reset user stats
  const handleResetStats = () => {
    setStats({
      balance,
      totalGames: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      highestMultiplier: 0,
      totalWagered: 0,
    });
    setShowStatsModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* TOP HEADER */}
      <header className="w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-white font-display flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              Rocket Crash
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
            <button
              onClick={() => setShowRulesModal(true)}
              className="hover:text-amber-400 transition-colors whitespace-nowrap"
            >
              Cách Chơi
            </button>
            <button
              onClick={() => history[0] && setSelectedAuditRound(history[0])}
              className="hover:text-amber-400 transition-colors whitespace-nowrap"
            >
              Minh Bạch
            </button>
            <button
              onClick={() => setShowDiscordModal(true)}
              className="text-[#5865F2] hover:text-indigo-300 font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>{discordUser ? 'Tài Khoản Discord' : 'Liên Kết Discord'}</span>
              {!discordUser && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#5865F2]/20 text-[#5865F2] font-bold border border-[#5865F2]/30">
                  +500K
                </span>
              )}
            </button>
            <button
              onClick={() => setShowStatsModal(true)}
              className="hover:text-amber-400 transition-colors whitespace-nowrap"
            >
              Thống Kê
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              aria-label="Sound Toggle"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* User Balance Capsule */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1 text-xs">
                <span className="font-mono-numbers font-bold text-white text-sm">
                  {balance.toLocaleString('vi-VN')}
                </span>
                <span className="text-amber-400 font-bold">Xu</span>
              </div>
            </div>

            {/* Discord Account Header Pill */}
            {discordUser ? (
              <button
                onClick={() => setShowDiscordModal(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-[#5865F2]/50 hover:border-[#5865F2] text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Hồ sơ tài khoản Discord & Cloud Sync"
              >
                <div className="relative">
                  <img src={discordUser.avatar} alt="Avatar" className="w-6 h-6 rounded-lg object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white max-w-[85px] truncate">
                      {discordUser.globalName || discordUser.username}
                    </span>
                    <span className="text-[9px] px-1 rounded bg-[#5865F2] text-white font-bold">
                      Lv.{discordUser.level || 1}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Đồng bộ Cloud</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowDiscordModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
                title="Liên kết tài khoản Discord (+500.000 Xu)"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Liên Kết Discord</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                  +500K
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-4">
        {/* Recent Rounds Multiplier Bar */}
        <RecentRoundsBar history={history} onSelectRound={setSelectedAuditRound} />

        {/* Core Game Arena Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left / Center 8 cols: Rocket Arena & Betting Controls */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* The Rocket Canvas */}
            <RocketCanvas
              phase={phase}
              multiplier={multiplier}
              countdown={countdown}
              userBet={userBet}
              userCashedOut={userCashedOut}
              userCashoutMultiplier={userCashoutMultiplier}
              crashMultiplier={phase === 'CRASHED' ? crashPoint : undefined}
              activeEvent={activeEvent}
              onClaimEventReward={handleClaimEventReward}
              shieldSavedBet={shieldSavedBet}
            />

            {/* Betting Controls */}
            <BettingControls
              phase={phase}
              balance={balance}
              currentMultiplier={multiplier}
              userBet={userBet}
              userCashedOut={userCashedOut}
              userCashoutMultiplier={userCashoutMultiplier}
              autoCashoutEnabled={autoCashoutEnabled}
              autoCashoutTarget={autoCashoutTarget}
              onSetAutoCashoutEnabled={setAutoCashoutEnabled}
              onSetAutoCashoutTarget={setAutoCashoutTarget}
              onPlaceBet={handlePlaceBet}
              onCancelBet={handleCancelBet}
              onCashout={handleCashoutClick}
              onAddFunds={handleAddFunds}
            />
          </div>

          {/* Right 4 cols: Community Lobby & Chat */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <LiveBetsList players={players} currentMultiplier={multiplier} />
            <CommunityChat messages={messages} onSendMessage={handleSendMessage} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ProvablyFairModal
        round={selectedAuditRound}
        onClose={() => setSelectedAuditRound(null)}
      />

      {/* Discord Account & Cloud Sync Modal */}
      <DiscordAccountModal
        isOpen={showDiscordModal}
        onClose={() => setShowDiscordModal(false)}
        discordUser={discordUser}
        onUpdateDiscordUser={handleUpdateDiscordUser}
        userBalance={balance}
        userStats={stats}
        onApplyBalanceAndStats={(newBalance, newStats) => {
          setBalance(newBalance);
          if (newStats) setStats(prev => ({ ...prev, ...newStats }));
        }}
      />

      <UserStatsModal
        stats={stats}
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        onResetStats={handleResetStats}
      />

      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
