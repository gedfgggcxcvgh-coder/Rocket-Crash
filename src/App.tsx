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
import { RocketGarageModal } from './components/RocketGarageModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { DuelModal } from './components/DuelModal';
import { DuelBanner } from './components/DuelBanner';
import { DuelResultModal } from './components/DuelResultModal';
import { RocketSkin, RocketSkinId, DuelState, LeaderboardItem } from './types/game';
import confetti from 'canvas-confetti';
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
  if (typeof window === 'undefined') return 'guest';
  let id = localStorage.getItem('rocket_crash_guest_id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('rocket_crash_guest_id', id);
  }
  return id;
};

interface UserSkinPrefs {
  equipped: RocketSkinId;
  unlocked: RocketSkinId[];
}

const SKIN_PREFS_KEY = 'rocket_crash_user_skin_preferences';

const getAllSkinPrefs = (): Record<string, UserSkinPrefs> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SKIN_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const getStoredSkins = (userId: string): UserSkinPrefs => {
  const prefs = getAllSkinPrefs();
  const userPref = prefs[userId] || prefs['global_fallback'];
  
  if (userPref) {
    const unlocked = Array.isArray(userPref.unlocked) && userPref.unlocked.length > 0
      ? Array.from(new Set(['STANDARD', ...userPref.unlocked])) as RocketSkinId[]
      : ['STANDARD'];
    const equipped = (userPref.equipped && unlocked.includes(userPref.equipped))
      ? userPref.equipped
      : 'STANDARD';
    return { equipped, unlocked };
  }
  
  return { equipped: 'STANDARD', unlocked: ['STANDARD'] };
};

const saveStoredSkins = (userId: string, equipped: RocketSkinId, unlocked: RocketSkinId[]) => {
  if (typeof window === 'undefined') return;
  const prefs = getAllSkinPrefs();
  const cleanUnlocked = Array.from(new Set(['STANDARD', ...unlocked])) as RocketSkinId[];
  const cleanEquipped = cleanUnlocked.includes(equipped) ? equipped : 'STANDARD';
  
  const payload: UserSkinPrefs = { equipped: cleanEquipped, unlocked: cleanUnlocked };
  prefs[userId] = payload;
  prefs['global_fallback'] = payload;
  
  try {
    localStorage.setItem(SKIN_PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save skin prefs:', err);
  }
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

  // User Betting State - Dual Bet 1 (An Toàn)
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
  const [autoCashoutTarget, setAutoCashoutTarget] = useState<number>(2.0);

  // Dual Bet 2 (Gồng Đỉnh)
  const [userBet2, setUserBet2] = useState<number>(0);
  const [userCashedOut2, setUserCashedOut2] = useState<boolean>(false);
  const [userCashoutMultiplier2, setUserCashoutMultiplier2] = useState<number | undefined>(undefined);
  const [autoCashoutEnabled2, setAutoCashoutEnabled2] = useState<boolean>(false);
  const [autoCashoutTarget2, setAutoCashoutTarget2] = useState<number>(10.0);

  // New Modals & Feature States
  const [showGarageModal, setShowGarageModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [showDuelModal, setShowDuelModal] = useState<boolean>(false);
  const [showDuelResultModal, setShowDuelResultModal] = useState<boolean>(false);

  const initialUserId = (typeof window !== 'undefined' && getSavedDiscordUser()) ? getSavedDiscordUser()!.id : getGuestUserId();
  const initialSkins = getStoredSkins(initialUserId);

  const [equippedSkin, setEquippedSkin] = useState<RocketSkinId>(initialSkins.equipped);
  const [unlockedSkins, setUnlockedSkins] = useState<RocketSkinId[]>(initialSkins.unlocked);

  const [jackpotPool, setJackpotPool] = useState<number>(18500000);
  const [activeDuel, setActiveDuel] = useState<DuelState | null>(null);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);

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

  // On startup & account change: Fetch fresh account balance, stats and skins from central server
  useEffect(() => {
    fetch(`/api/user/${currentUserId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(serverData => {
        if (serverData && typeof serverData.balance === 'number') {
          setBalance(serverData.balance);
          if (serverData.stats) {
            setStats(prev => ({ ...prev, ...serverData.stats }));
          }

          // Smart merge skins: Combine local stored skins with server skins
          const localSkins = getStoredSkins(currentUserId);
          const serverUnlocked = Array.isArray(serverData.unlockedSkins) ? serverData.unlockedSkins : ['STANDARD'];
          const mergedUnlocked = Array.from(new Set([...localSkins.unlocked, ...serverUnlocked])) as RocketSkinId[];
          
          const serverEquipped = serverData.equippedSkin as RocketSkinId;
          const finalEquipped = (localSkins.equipped && mergedUnlocked.includes(localSkins.equipped))
            ? localSkins.equipped
            : (serverEquipped && mergedUnlocked.includes(serverEquipped) ? serverEquipped : 'STANDARD');

          setUnlockedSkins(mergedUnlocked);
          setEquippedSkin(finalEquipped);
          saveStoredSkins(currentUserId, finalEquipped, mergedUnlocked);

          // Push merged skins to server to keep database in sync
          fetch('/api/user/skin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              equippedSkin: finalEquipped,
              unlockedSkins: mergedUnlocked,
            }),
          }).catch(() => {});
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

      if (data.type === 'SYNC_SKIN_STATE' && data.userId === currentUserId) {
        if (data.equippedSkin) setEquippedSkin(data.equippedSkin);
        if (data.unlockedSkins) setUnlockedSkins(data.unlockedSkins);
        return;
      }

      if (data.tabId === TAB_ID || data.type !== 'SYNC_ACCOUNT_STATE') return;

      if (data.discordUser !== undefined) {
        setDiscordUser(data.discordUser);
      }
    };

    syncChannel.addEventListener('message', handleSyncMessage);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rocket_crash_discord_user') {
        const newUser = getSavedDiscordUser();
        setDiscordUser(newUser);
      }
      if (e.key === SKIN_PREFS_KEY) {
        const skins = getStoredSkins(currentUserId);
        setEquippedSkin(skins.equipped);
        setUnlockedSkins(skins.unlocked);
      }
    };

    window.addEventListener('storage', handleStorage);

    const handleFocus = () => {
      fetch(`/api/user/${currentUserId}`)
        .then(res => (res.ok ? res.json() : null))
        .then(serverData => {
          if (serverData && typeof serverData.balance === 'number') {
            setBalance(serverData.balance);
            if (serverData.stats) {
              setStats(prev => ({ ...prev, ...serverData.stats }));
            }
            if (serverData.equippedSkin) {
              setEquippedSkin(serverData.equippedSkin);
            }
            if (Array.isArray(serverData.unlockedSkins) && serverData.unlockedSkins.length > 0) {
              setUnlockedSkins(serverData.unlockedSkins);
            }
          }
        })
        .catch(() => {});
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      syncChannel.removeEventListener('message', handleSyncMessage);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUserId]);

  // Broadcast Discord account state changes to all other open tabs
  useEffect(() => {
    if (syncChannel) {
      syncChannel.postMessage({
        type: 'SYNC_ACCOUNT_STATE',
        tabId: TAB_ID,
        discordUser,
      });
    }
  }, [discordUser]);

  // Periodically poll central server for account updates for ALL users (Guest or Discord)
  useEffect(() => {
    if (!currentUserId) return;

    const interval = setInterval(() => {
      fetch(`/api/user/${currentUserId}`)
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
    }, 2500);

    return () => clearInterval(interval);
  }, [currentUserId]);

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

              setUserCashedOut2(false);
              setUserCashoutMultiplier2(undefined);
              setUserBet2(0);
            }

            if (typeof data.jackpotPool === 'number') {
              setJackpotPool(data.jackpotPool);
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
                // Schedule surprise flight event if crash point > 1.5
                if (data.crashPoint > 1.5 && Math.random() < 0.85) {
                  const types: FlightEventType[] = [
                    'WARP_NITRO',
                    'ALIEN_SHIELD',
                    'COSMIC_AIRDROP',
                    'ENGINE_OVERHEAT',
                    'LUCKY_ENVELOPE',
                    'BLACK_HOLE_GRAVITY',
                    'COSMIC_JACKPOT_RAIN',
                    'VIP_DIAMOND_CHEST',
                    'SOLAR_FLARE_BOOST',
                  ];
                  const selectedType = types[Math.floor(Math.random() * types.length)];
                  const minTrig = 1.25;
                  const maxTrig = Math.min(data.crashPoint - 0.15, 12.0);
                  if (maxTrig > minTrig) {
                    const triggerMult = parseFloat((Math.random() * (maxTrig - minTrig) + minTrig).toFixed(2));
                    plannedEventRef.current = { triggered: false, triggerMult, type: selectedType };
                  }
                }
              } else if (data.status === 'CRASHED') {
                sounds.stopEngine();
                sounds.playExplosion();
                plannedEventRef.current = null;
                setActiveEvent(null);
                activeEventRef.current = null;
              } else if (data.status === 'COUNTDOWN') {
                sounds.playCountdownBeep(false);
                plannedEventRef.current = null;
                setActiveEvent(null);
                activeEventRef.current = null;
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
        const finalMult = Math.min(currentMult, crashPoint);
        setMultiplier(prev => (finalMult > prev ? finalMult : prev));

        // Trigger planned surprise flight event
        if (
          plannedEventRef.current &&
          !plannedEventRef.current.triggered &&
          finalMult >= plannedEventRef.current.triggerMult
        ) {
          plannedEventRef.current.triggered = true;
          triggerFlightEvent(plannedEventRef.current.type, finalMult);
        }

        // Expire active event
        if (activeEventRef.current && Date.now() >= activeEventRef.current.expiresAtTimestamp) {
          setActiveEvent(null);
          activeEventRef.current = null;
        }
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

      case 'BLACK_HOLE_GRAVITY':
        title = 'BÃO LỖ ĐEN VŨ TRỤ: LỰC HÚT SIÊU TRỌNG LỰC!';
        description = 'Tên lửa vào vùng xoáy lỗ đen, tích năng lượng để bứt phá x3!';
        durationMs = 5000;
        sounds.playWarpSpeed();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `blackhole_${Date.now()}`,
            user: 'Sơn_LỗĐen',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Son',
            text: '🕳️ BÃO LỖ ĐEN XUẤT HIỆN KÌA!! Nó đang hút năng lượng chuẩn bị phi nước đại x3 anh em ơiii 🌌⚡',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'COSMIC_JACKPOT_RAIN':
        rewardAmount = Math.floor(Math.random() * 3000) + 1500; // 1.500 - 4.500 Xu
        title = 'MƯA SAO SA JACKPOT';
        description = 'Bão sao sa giội xuống hạm đội, nhặt ngay ngôi sao may mắn!';
        durationMs = 6500;
        sounds.playClaimReward();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `star_rain_${Date.now()}`,
            user: 'Minh_ThầnTài',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Minh',
            text: '🌠 MƯA SAO SA JACKPOT RƠI CỰC MẠNH! Bấm vào các ngôi sao rơi để húp Xu nhanh tayyy ⭐✨',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'VIP_DIAMOND_CHEST':
        rewardAmount = Math.floor(Math.random() * 10000) + 5000; // 5.000 - 15.000 Xu
        title = 'RƯƠNG KIM CƯƠNG HOÀNG GIA';
        description = 'Rương Kim Cương cực hiếm rơi từ Hạm Đội Thần Thoại! Nhận Xu khủng!';
        durationMs = 7000;
        sounds.playClaimReward();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `diamond_chest_${Date.now()}`,
            user: 'ĐạiGia_HoàngGia',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DaiGia',
            text: '💎 RƯƠNG KIM CƯƠNG HOÀNG GIA SIÊU HIẾM ĐÃ XUẤT HIỆN!! Bấm húp 15K Xu lẹ lên nào 👑💸',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        break;

      case 'SOLAR_FLARE_BOOST':
        title = 'BÃƠ MẶT TRỜI: QUANG PHỔ x5!';
        description = 'Sóng nhiệt Bão Mặt Trời kích phát gia tốc cực đại!';
        durationMs = 3500;
        sounds.playWarpSpeed();
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `solar_flare_${Date.now()}`,
            user: 'Long_NhiệtHuyết',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Long',
            text: '☀️ BÃƠ MẶT TRỜI BỨC PHÁ QUANG PHỔ!! Tên lửa rực lửa phi như pháo hoa x5 tốc độ 🔥🔥',
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

  // Auto Cashout trigger when rocket multiplier reaches user's target (Dual Bet 1 & Bet 2)
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

  useEffect(() => {
    if (
      phase === 'FLYING' &&
      userBet2 > 0 &&
      !userCashedOut2 &&
      autoCashoutEnabled2 &&
      multiplier >= autoCashoutTarget2
    ) {
      handleCashoutClick2();
    }
  }, [phase, userBet2, userCashedOut2, autoCashoutEnabled2, multiplier, autoCashoutTarget2]);

  // 1v1 Solo Duel Live Engine
  const prevRoundIdRef = useRef<string>('');
  const duelResolvedRoundIdRef = useRef<string>('');

  useEffect(() => {
    if (!activeDuel || !activeDuel.active) return;

    // New round starting in COUNTDOWN
    if (phase === 'COUNTDOWN' && currentRoundId !== prevRoundIdRef.current) {
      prevRoundIdRef.current = currentRoundId;
      duelResolvedRoundIdRef.current = '';

      const target = parseFloat((1.35 + Math.random() * 3.5).toFixed(2));
      setActiveDuel(prev => prev ? {
        ...prev,
        status: 'PLAYING',
        userMult: undefined,
        opponentMult: undefined,
        opponentTargetMult: target,
        opponentCashedOut: false,
        winner: undefined,
        resultMessage: undefined,
      } : null);

      if (userBet === 0 && balance >= activeDuel.wager) {
        handlePlaceBet(activeDuel.wager);
      }
    }

    // Bot cashout during FLYING
    if (
      phase === 'FLYING' &&
      activeDuel.status === 'PLAYING' &&
      !activeDuel.opponentCashedOut &&
      activeDuel.opponentTargetMult &&
      multiplier >= activeDuel.opponentTargetMult
    ) {
      sounds.playClick();
      setActiveDuel(prev => prev ? {
        ...prev,
        opponentCashedOut: true,
        opponentMult: activeDuel.opponentTargetMult,
      } : null);

      setMessages(prev => [
        ...prev.slice(-30),
        {
          id: `bot_duel_${Date.now()}`,
          user: activeDuel.opponentName,
          avatar: activeDuel.opponentAvatar,
          text: `🤖 Đã chốt cược Solo tại ${activeDuel.opponentTargetMult.toFixed(2)}x! Bạn có dám gồng cao hơn không? 🔥`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'SOLO 1V1',
          isSystem: true,
        },
      ]);
    }

    // Evaluate Duel result on CRASHED
    if (
      phase === 'CRASHED' &&
      activeDuel.status === 'PLAYING' &&
      duelResolvedRoundIdRef.current !== currentRoundId
    ) {
      duelResolvedRoundIdRef.current = currentRoundId;

      const userM = userCashoutMultiplier || userCashoutMultiplier2 || 0;
      const oppM = activeDuel.opponentCashedOut ? (activeDuel.opponentMult || 0) : 0;

      let winnerResult: 'USER' | 'OPPONENT' | 'DRAW' = 'DRAW';
      let msg = '';

      if (userM > oppM) {
        winnerResult = 'USER';
        const winPot = activeDuel.wager * 2;
        setBalance(b => b + winPot);
        msg = `🏆 BẠN THẮNG SOLO 1V1! (${userM.toFixed(2)}x vs ${oppM.toFixed(2)}x) -> +${winPot.toLocaleString('vi-VN')} Xu!`;
        sounds.playClaimReward();
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } else if (userM < oppM) {
        winnerResult = 'OPPONENT';
        msg = `❌ THẤT BẠI SOLO 1V1! (${userM.toFixed(2)}x vs ${oppM.toFixed(2)}x) -> ${activeDuel.opponentName} húp trọn hũ.`;
        sounds.playErrorBeep();
      } else {
        winnerResult = 'DRAW';
        setBalance(b => b + activeDuel.wager);
        msg = `🤝 HÒA SOLO 1V1! (${userM.toFixed(2)}x) -> Hoàn lại ${activeDuel.wager.toLocaleString('vi-VN')} Xu.`;
      }

      setActiveDuel(prev => prev ? {
        ...prev,
        status: 'FINISHED',
        userMult: userM,
        opponentMult: oppM,
        winner: winnerResult,
        resultMessage: msg,
      } : null);

      setShowDuelResultModal(true);

      setMessages(prev => [
        ...prev.slice(-30),
        {
          id: `duel_result_${Date.now()}`,
          user: 'Trọng Tài Vũ Trụ',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Referee',
          text: msg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'SOLO 1V1',
          isSystem: true,
        },
      ]);
    }
  }, [phase, multiplier, currentRoundId, userCashoutMultiplier, userCashoutMultiplier2, activeDuel]);

  // Place Bet 1 via Server API
  const handlePlaceBet = async (amount: number) => {
    if (amount <= 0 || amount > balance) return;
    sounds.playClick();
    setUserBet(amount);

    const userId = currentUserId;
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

  // Place Bet 2 (Tay Cược 2)
  const handlePlaceBet2 = async (amount: number) => {
    if (amount <= 0 || amount > balance) return;
    sounds.playClick();
    setUserBet2(amount);

    const userId = `${currentUserId}_bet2`;
    const username = discordUser ? `${discordUser.globalName || discordUser.username} (Vé 2)` : 'Khách (Vé 2)';
    const avatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest2';

    try {
      const res = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username,
          avatar,
          betAmount: amount,
          targetMultiplier: autoCashoutEnabled2 ? autoCashoutTarget2 : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Đặt cược 2 thất bại.');
        setUserBet2(0);
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
      console.error('Bet2 API error:', err);
    }
  };

  // Cancel Bet 1 during COUNTDOWN
  const handleCancelBet = () => {
    if (userBet <= 0 || phase !== 'COUNTDOWN') return;
    sounds.playClick();
    setBalance(prev => prev + userBet);
    setUserBet(0);
  };

  // Cancel Bet 2 during COUNTDOWN
  const handleCancelBet2 = () => {
    if (userBet2 <= 0 || phase !== 'COUNTDOWN') return;
    sounds.playClick();
    setBalance(prev => prev + userBet2);
    setUserBet2(0);
  };

  // Manual Cashout Bet 1
  const handleCashoutClick = async () => {
    if (userCashedOut || phase !== 'FLYING') return;

    const userId = currentUserId;

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
          text: `Đã chốt lời Vé 1 tại ${data.cashoutMultiplier.toFixed(2)}x [${stage.badge}] (+${data.winAmount.toLocaleString('vi-VN')} Xu)! 🤑🎉`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: discordUser ? 'DISCORD' : 'VIP',
          isSystem: true,
        },
      ]);
    } catch (err) {
      console.error('Cashout API error:', err);
    }
  };

  // Manual Cashout Bet 2
  const handleCashoutClick2 = async () => {
    if (userCashedOut2 || phase !== 'FLYING') return;

    const userId = `${currentUserId}_bet2`;

    try {
      const res = await fetch('/api/game/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) return;

      sounds.playCashoutWin();
      setUserCashedOut2(true);
      setUserCashoutMultiplier2(data.cashoutMultiplier);

      const winAmt = data.winAmount || Math.floor(userBet2 * data.cashoutMultiplier);
      if (typeof data.newBalance === 'number') {
        setBalance(data.newBalance);
      } else {
        setBalance(prev => prev + winAmt);
      }

      const netProfit = winAmt - userBet2;
      setStats(prev => ({
        ...prev,
        totalGames: prev.totalGames + 1,
        wins: prev.wins + 1,
        totalProfit: prev.totalProfit + netProfit,
        highestMultiplier: Math.max(prev.highestMultiplier, data.cashoutMultiplier),
      }));

      const stage = getAltitudeStage(data.cashoutMultiplier);
      const userDisplayName = discordUser ? (discordUser.globalName || discordUser.username) : 'Bạn';
      const userAvatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=You';
      setMessages(prev => [
        ...prev.slice(-30),
        {
          id: Date.now().toString(),
          user: userDisplayName,
          avatar: userAvatar,
          text: `🔥 GỒNG ĐỈNH THÀNH CÔNG Vé 2 tại ${data.cashoutMultiplier.toFixed(2)}x (+${winAmt.toLocaleString('vi-VN')} Xu)!! 🎉🚀`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'GỒNG ĐỈNH',
          isSystem: true,
        },
      ]);
    } catch (err) {
      console.error('Cashout2 API error:', err);
    }
  };

  // Fetch Leaderboards
  const handleOpenLeaderboards = async () => {
    sounds.playClick();
    setShowLeaderboardModal(true);
    try {
      const res = await fetch('/api/game/leaderboard');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setLeaderboardItems(data);
      }
    } catch (err) {
      console.error('Leaderboard API error:', err);
    }
  };

  // Start 1v1 Duel Challenge
  const handleStartDuel = async (wager: number, opponentName: string, opponentAvatar: string) => {
    if (balance < wager) {
      sounds.playErrorBeep();
      alert('Số dư Xu không đủ để tham gia Thách Đấu!');
      return;
    }

    setShowDuelModal(false);
    setShowDuelResultModal(false);

    const target = parseFloat((1.30 + Math.random() * 3.5).toFixed(2));

    const newDuel: DuelState = {
      active: true,
      opponentName,
      opponentAvatar,
      wager,
      status: phase === 'COUNTDOWN' ? 'PLAYING' : 'WAITING',
      opponentTargetMult: target,
      opponentCashedOut: false,
    };

    setActiveDuel(newDuel);

    if (phase === 'COUNTDOWN' && userBet === 0) {
      await handlePlaceBet(wager);
    }

    setMessages(prev => [
      ...prev.slice(-30),
      {
        id: `duel_${Date.now()}`,
        user: 'Hệ Thống',
        avatar: opponentAvatar,
        text: `⚔️ BẠN ĐÃ THÁCH ĐẤU SOLO 1V1: Đã đặt cược ${wager.toLocaleString('vi-VN')} Xu vs ${opponentName}! Hãy gồng cược để áp đảo đối thủ! 🔥`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'SOLO 1V1',
        isSystem: true,
      },
    ]);
  };

  const handleCancelDuel = () => {
    if (activeDuel) {
      setBalance(prev => prev + activeDuel.wager);
      setActiveDuel(null);
    }
  };

  // Skin Management with Account Persistence & Cross-Tab Sync
  const handleEquipSkin = (skinId: RocketSkinId) => {
    setEquippedSkin(skinId);

    // Save locally
    saveStoredSkins(currentUserId, skinId, unlockedSkins);

    // Save to central user database on server
    fetch('/api/user/skin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, equippedSkin: skinId, unlockedSkins }),
    }).catch(() => {});

    // Broadcast sync across tabs
    syncChannel?.postMessage({
      type: 'SYNC_SKIN_STATE',
      userId: currentUserId,
      tabId: TAB_ID,
      equippedSkin: skinId,
      unlockedSkins,
    });
  };

  const handleBuySkin = (skin: RocketSkin) => {
    if (balance < skin.price) return;

    const nextUnlocked = Array.from(new Set([...unlockedSkins, skin.id])) as RocketSkinId[];
    const nextBalance = balance - skin.price;

    setBalance(nextBalance);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rocket_crash_guest_balance', nextBalance.toString());
    }
    setUnlockedSkins(nextUnlocked);
    setEquippedSkin(skin.id);

    // Save locally
    saveStoredSkins(currentUserId, skin.id, nextUnlocked);

    // Save to central user database on server
    fetch('/api/user/skin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        equippedSkin: skin.id,
        unlockedSkins: nextUnlocked,
      }),
    }).catch(() => {});

    // Broadcast sync across tabs
    syncChannel?.postMessage({
      type: 'SYNC_SKIN_STATE',
      userId: currentUserId,
      tabId: TAB_ID,
      equippedSkin: skin.id,
      unlockedSkins: nextUnlocked,
    });
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
    const newId = newUser ? newUser.id : getGuestUserId();
    fetch(`/api/user/${newId}`)
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
            {/* Live 1v1 Solo Duel Banner */}
            {activeDuel && activeDuel.active && (
              <DuelBanner
                duel={activeDuel}
                currentMultiplier={multiplier}
                phase={phase}
                userCashedOut={userCashedOut || userCashedOut2}
                userCashoutMultiplier={userCashoutMultiplier || userCashoutMultiplier2}
                onRematch={() => handleStartDuel(activeDuel.wager, activeDuel.opponentName, activeDuel.opponentAvatar)}
                onClose={() => setActiveDuel(null)}
              />
            )}

            {/* The Rocket Canvas */}
            <RocketCanvas
              phase={phase}
              multiplier={multiplier}
              countdown={countdown}
              userBet={userBet + userBet2}
              userCashedOut={userCashedOut && userCashedOut2}
              userCashoutMultiplier={userCashoutMultiplier}
              crashMultiplier={phase === 'CRASHED' ? crashPoint : undefined}
              activeEvent={activeEvent}
              onClaimEventReward={handleClaimEventReward}
              shieldSavedBet={shieldSavedBet}
              equippedSkinId={equippedSkin}
              jackpotPool={jackpotPool}
            />

            {/* Dual Betting Controls */}
            <BettingControls
              phase={phase}
              balance={balance}
              currentMultiplier={multiplier}
              userBet1={userBet}
              userCashedOut1={userCashedOut}
              userCashoutMultiplier1={userCashoutMultiplier}
              autoCashoutEnabled1={autoCashoutEnabled}
              autoCashoutTarget1={autoCashoutTarget}
              onSetAutoCashoutEnabled1={setAutoCashoutEnabled}
              onSetAutoCashoutTarget1={setAutoCashoutTarget}
              onPlaceBet1={handlePlaceBet}
              onCancelBet1={handleCancelBet}
              onCashout1={handleCashoutClick}
              userBet2={userBet2}
              userCashedOut2={userCashedOut2}
              userCashoutMultiplier2={userCashoutMultiplier2}
              autoCashoutEnabled2={autoCashoutEnabled2}
              autoCashoutTarget2={autoCashoutTarget2}
              onSetAutoCashoutEnabled2={setAutoCashoutEnabled2}
              onSetAutoCashoutTarget2={setAutoCashoutTarget2}
              onPlaceBet2={handlePlaceBet2}
              onCancelBet2={handleCancelBet2}
              onCashout2={handleCashoutClick2}
              onAddFunds={handleAddFunds}
              onOpenGarage={() => setShowGarageModal(true)}
              onOpenDuel={() => setShowDuelModal(true)}
              onOpenLeaderboard={handleOpenLeaderboards}
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
      <RocketGarageModal
        isOpen={showGarageModal}
        onClose={() => setShowGarageModal(false)}
        balance={balance}
        equippedSkin={equippedSkin}
        unlockedSkins={unlockedSkins}
        onEquipSkin={handleEquipSkin}
        onBuySkin={handleBuySkin}
      />

      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        items={leaderboardItems}
      />

      <DuelModal
        isOpen={showDuelModal}
        onClose={() => setShowDuelModal(false)}
        balance={balance}
        activeDuel={activeDuel}
        onStartDuel={handleStartDuel}
        onCancelDuel={handleCancelDuel}
      />

      <DuelResultModal
        isOpen={showDuelResultModal}
        duel={activeDuel}
        onClose={() => setShowDuelResultModal(false)}
        onRematch={() => {
          if (activeDuel) {
            handleStartDuel(activeDuel.wager, activeDuel.opponentName, activeDuel.opponentAvatar);
          }
        }}
        onChangeOpponent={() => {
          setShowDuelResultModal(false);
          setShowDuelModal(true);
        }}
      />

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
