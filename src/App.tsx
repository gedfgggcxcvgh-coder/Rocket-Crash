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

const INITIAL_BALANCE = 10000;

const BOT_NAMES = [
  'ThánhGồng_x100', 'Bảo_AllIn', 'Long_CayCú', 'Dũng_HúpBạc', 
  'Trùm_NổSớm', 'Huy_CháyTúi', 'Tuấn_TayTo', 'Sơn_NonTay', 
  'Đạt_GỡNợ', 'Khang_BịpVcl', 'Phúc_KhôMáu', 'Nam_ĂnNon',
  'AnhBa_BaoSàn', 'Tùng_ChốtNon', 'Minh_TayVàng'
];

const INITIAL_CHATS: ChatMessage[] = [
  { id: '1', user: 'Huy_CháyTúi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Huy', text: 'Má ván trước vừa vào định gồng x50 thì toang, cay dái thật', time: '14:26' },
  { id: '2', user: 'Tuấn_TayTo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan', text: 'Non thì chịu đi chú em, vừa làm phát 50k xu ấm cật haha', time: '14:27' },
  { id: '3', user: 'Bảo_AllIn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao', text: 'Ván này bố m tất tay khô máu, đéo tin k lên nổi x10!', time: '14:28' },
  { id: '4', user: 'Nam_ĂnNon', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nam', text: 'Cứ 2x tao nhảy, ăn non cho lành cãi nhau làm đéo gì', time: '14:29' },
];

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
    const saved = localStorage.getItem('rocket_crash_balance');
    return saved ? parseInt(saved, 10) : INITIAL_BALANCE;
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
    const saved = localStorage.getItem('rocket_crash_stats');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
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
    localStorage.setItem('rocket_crash_balance', balance.toString());
  }, [balance]);

  // Persist stats
  useEffect(() => {
    localStorage.setItem('rocket_crash_stats', JSON.stringify(stats));
  }, [stats]);

  // Initialize a new round
  const initNewRound = useCallback(async (modeToUse?: FlightMode) => {
    const activeMode = modeToUse || flightModeRef.current;
    const seed = generateSeed();
    const hash = await sha256(seed);
    const calculatedCrash = calculateMultiplier(seed, activeMode);

    setCurrentSeed(seed);
    setCurrentHash(hash);
    setCrashPoint(calculatedCrash);
    setCurrentRoundId(Date.now().toString());
    milestoneReachedRef.current = {};
    botChattedCashoutRef.current = {};

    // Reset event states
    setActiveEvent(null);
    activeEventRef.current = null;
    setShieldSavedBet(false);
    effectiveTRef.current = 0;
    lastFrameTimeRef.current = 0;

    // Plan a surprise flight event in ~55% of playable rounds
    if (calculatedCrash > 2.0 && Math.random() < 0.58) {
      const eventTypes: FlightEventType[] = [
        'WARP_NITRO',
        'ALIEN_SHIELD',
        'COSMIC_AIRDROP',
        'ENGINE_OVERHEAT',
        'LUCKY_ENVELOPE',
      ];
      const chosenType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const minTrig = 1.35;
      const maxTrig = Math.max(1.7, Math.min(calculatedCrash * 0.65, 12.0));
      const triggerMult = parseFloat((minTrig + Math.random() * (maxTrig - minTrig)).toFixed(2));
      plannedEventRef.current = {
        triggered: false,
        triggerMult,
        type: chosenType,
      };
    } else {
      plannedEventRef.current = null;
    }

    // Reset user round status
    setUserCashedOut(false);
    setUserCashoutMultiplier(undefined);
    setMultiplier(1.00);
    setPhase('COUNTDOWN');
    setCountdown(5.0);

    // Generate simulated lobby players with heavy, high-stakes bets
    const playerCount = Math.floor(Math.random() * 6) + 7;
    const shuffledNames = [...BOT_NAMES].sort(() => 0.5 - Math.random()).slice(0, playerCount);
    const botBets: PlayerBet[] = shuffledNames.map((name, idx) => {
      // Much heavier stakes: from 1k up to 100k
      const amounts = [1000, 2500, 5000, 10000, 20000, 35000, 50000, 100000];
      const botBetAmt = amounts[Math.floor(Math.random() * amounts.length)];
      // Targets range from 1.3x up to 35x+
      const targetRoll = Math.random();
      let target: number;
      if (targetRoll < 0.35) {
        target = parseFloat((Math.random() * 1.5 + 1.35).toFixed(2));
      } else if (targetRoll < 0.75) {
        target = parseFloat((Math.random() * 4.5 + 2.8).toFixed(2));
      } else if (targetRoll < 0.92) {
        target = parseFloat((Math.random() * 12 + 7.5).toFixed(2));
      } else {
        target = parseFloat((Math.random() * 40 + 20).toFixed(2));
      }

      return {
        id: `bot_${idx}_${Date.now()}`,
        username: name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
        betAmount: botBetAmt,
        cashoutMultiplier: target,
        status: 'PENDING',
      };
    });

    setPlayers(botBets);

    // Random countdown chat banter from a bot (cục súc / cà khịa / all-in)
    if (Math.random() > 0.3) {
      const countdownSlangs = [
        'Ván này tao vào hẳn 50k, nổ sớm thì bố nghỉ game!',
        'Đm kéo ga lên đàng hoàng nha con sâu, nổ phát nữa là tao đốt server đấy',
        'Ván này tao all-in khô máu, không lên x10 chặt cu tao đi',
        'Ai còn thở không gáy lên xem nào, cược to vcl!',
        'Bơm tiền vào anh em ơiii, ván này đéo tin không nổ trên 5x!',
        'Cầu mong ông bà độ cho con gỡ lại 50k ván trước 😭🙏',
        'Vào tiền nhanh lên các con giời, chuẩn bị phóng kìa!',
        'Cứ từ từ mà đếm tiền, ván này tao ngửi thấy mùi x to',
        'Má run tay vcl nhưng vẫn phải táng 20k vào mặt nó'
      ];
      const speaker = shuffledNames[Math.floor(Math.random() * shuffledNames.length)];
      const randTxt = countdownSlangs[Math.floor(Math.random() * countdownSlangs.length)];
      setMessages(prev => [
        ...prev.slice(-30),
        {
          id: `cd_${Date.now()}`,
          user: speaker,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${speaker}`,
          text: randTxt,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, []);

  // Initial mount
  useEffect(() => {
    initNewRound();
  }, [initNewRound]);

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

  // Countdown Loop
  useEffect(() => {
    if (phase !== 'COUNTDOWN') return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          launchRocket();
          return 0;
        }
        if (prev <= 3.1 && Math.abs(prev - Math.round(prev)) < 0.1) {
          sounds.playCountdownBeep(false);
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(timer);
  }, [phase]);

  // Launch Rocket
  const launchRocket = () => {
    sounds.playCountdownBeep(true);
    sounds.startEngine();
    setPhase('FLYING');
    flightStartTimeRef.current = performance.now();
    lastFrameTimeRef.current = performance.now();
    effectiveTRef.current = 0;
    milestoneReachedRef.current = {};

    // Mark active players as FLYING
    setPlayers(prev =>
      prev.map(p => ({
        ...p,
        status: 'FLYING',
      }))
    );
  };

  // Flying Animation & Multiplier Loop
  useEffect(() => {
    if (phase !== 'FLYING') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const crash = crashPoint;

    const updateFlight = (timestamp: number) => {
      const lastTs = lastFrameTimeRef.current || timestamp;
      const dt = Math.min(Math.max((timestamp - lastTs) / 1000, 0), 0.1);
      lastFrameTimeRef.current = timestamp;

      // Speed boost multiplier during Warp Nitro
      const speedFactor = activeEventRef.current?.type === 'WARP_NITRO' ? 2.3 : 1.0;
      effectiveTRef.current += dt * speedFactor;
      const t = effectiveTRef.current;

      // Pacing formula: steady, suspenseful rise with dramatic acceleration
      // Gives players ample time to react and watch the spaceship conquer cosmic layers
      const currentMult = parseFloat(
        Math.max(
          1.00,
          1.0 + 0.12 * t + 0.016 * Math.pow(t, 2) + 0.0009 * Math.pow(t, 3.25)
        ).toFixed(2)
      );

      // Update sound pitch
      sounds.updateEnginePitch(currentMult);

      // Check planned surprise event trigger
      if (
        plannedEventRef.current &&
        !plannedEventRef.current.triggered &&
        currentMult >= plannedEventRef.current.triggerMult &&
        currentMult < crash
      ) {
        plannedEventRef.current.triggered = true;
        triggerFlightEvent(plannedEventRef.current.type, currentMult);
      }

      // Check active event expiration
      if (activeEventRef.current && Date.now() > activeEventRef.current.expiresAtTimestamp) {
        if (activeEventRef.current.type === 'ENGINE_OVERHEAT') {
          setMessages(prev => [
            ...prev.slice(-30),
            {
              id: `survive_${Date.now()}`,
              user: 'Tuấn_TayTo',
              avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan',
              text: 'VÃI CẢ LINH HỒN!! Vừa thoát khỏi đợt quá nhiệt động cơ trong gang tấc! Gáy lên anh em!! 🚀🔥',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
        setActiveEvent(null);
        activeEventRef.current = null;
      }

      // Trigger fun community chat cheers on altitude milestones
      if (currentMult >= 10 && !milestoneReachedRef.current[10]) {
        milestoneReachedRef.current[10] = true;
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `cheer_10_${Date.now()}`,
            user: 'Minh_TayVàng',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Minh',
            text: '🌕 ĐÙ MÁ QUA x10 RỒI!! Tim đập thình thịch đéo dám thở luôn anh em ơi 😱🔥',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else if (currentMult >= 25 && !milestoneReachedRef.current[25]) {
        milestoneReachedRef.current[25] = true;
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `cheer_25_${Date.now()}`,
            user: 'ThánhGồng_x100',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThánhGồng',
            text: '🔴 VCL x25 RỒI!! Ai còn sống sót không hay nhảy mẹ hết rồi?! Giàu to rồi các con vợ ơi!! 🚀💸',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else if (currentMult >= 50 && !milestoneReachedRef.current[50]) {
        milestoneReachedRef.current[50] = true;
        setMessages(prev => [
          ...prev.slice(-30),
          {
            id: `cheer_50_${Date.now()}`,
            user: 'AnhBa_BaoSàn',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnhBa',
            text: '🌌 Á ĐÙ X50 VŨ TRỤ SÂU!! ĐỈNH VCL, QUẢ NÀY MUA ĐẤT XÂY BIỆT THỰ THẬT RỒI!! 💎💎✨',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }

      // Check Auto Cashout for current user
      if (
        userBetRef.current > 0 &&
        !isCashedOutRef.current &&
        autoCashoutEnabledRef.current &&
        currentMult >= autoCashoutTargetRef.current &&
        currentMult < crash
      ) {
        executeUserCashout(autoCashoutTargetRef.current);
      }

      // Check Simulated Players Cashout
      setPlayers(prev =>
        prev.map(p => {
          if (p.isCurrentUser) return p;
          if (p.status === 'FLYING' && p.cashoutMultiplier && currentMult >= p.cashoutMultiplier) {
            const winAmount = Math.floor(p.betAmount * p.cashoutMultiplier);

            // Random chance for bot to flex / trash talk in chat (max 2 per round)
            if (
              !botChattedCashoutRef.current[p.id] &&
              Object.keys(botChattedCashoutRef.current).length < 2 &&
              Math.random() < 0.4
            ) {
              botChattedCashoutRef.current[p.id] = true;
              const botFlexSlangs = [
                `Húp vội +${winAmount.toLocaleString('vi-VN')} Xu ở ${p.cashoutMultiplier}x, té sớm cho lành haha!`,
                `Ăn non +${winAmount.toLocaleString('vi-VN')} Xu ấm cật rồi, nhường các bố gồng tiếp`,
                `Tay run vcl bấm vội tại ${p.cashoutMultiplier}x! Không tham!`,
                `+${winAmount.toLocaleString('vi-VN')} Xu bỏ túi! Gáy lên anh em ơiii 🤑`,
                `Chốt non tại ${p.cashoutMultiplier}x cho chắc ăn, tham thì thâm!`,
                `Đớp nhẹ +${winAmount.toLocaleString('vi-VN')} Xu, ván này ấm no rồi ae`,
              ];
              const slang = botFlexSlangs[Math.floor(Math.random() * botFlexSlangs.length)];
              setMessages(m => [
                ...m.slice(-30),
                {
                  id: `win_${p.id}_${Date.now()}`,
                  user: p.username,
                  avatar: p.avatar,
                  text: slang,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }

            return {
              ...p,
              status: 'WON',
              winAmount,
            };
          }
          return p;
        })
      );

      // Check Crash Condition
      if (currentMult >= crash) {
        triggerCrash(crash);
        return;
      }

      setMultiplier(currentMult);
      animFrameRef.current = requestAnimationFrame(updateFlight);
    };

    animFrameRef.current = requestAnimationFrame(updateFlight);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, crashPoint]);

  // Execute User Cashout
  const executeUserCashout = (cashMultiplier: number) => {
    if (userCashedOut || userBet <= 0) return;

    sounds.playCashoutWin();
    setUserCashedOut(true);
    setUserCashoutMultiplier(cashMultiplier);
    isCashedOutRef.current = true;

    const winTotal = Math.floor(userBet * cashMultiplier);
    const netProfit = winTotal - userBet;

    setBalance(prev => prev + winTotal);

    // Update user entry in player list
    setPlayers(prev =>
      prev.map(p =>
        p.isCurrentUser
          ? { ...p, status: 'WON', cashoutMultiplier: cashMultiplier, winAmount: winTotal }
          : p
      )
    );

    // Record stats
    setStats(prev => ({
      ...prev,
      totalGames: prev.totalGames + 1,
      wins: prev.wins + 1,
      totalProfit: prev.totalProfit + netProfit,
      highestMultiplier: Math.max(prev.highestMultiplier, cashMultiplier),
    }));

    // Post to chat
    const stage = getAltitudeStage(cashMultiplier);
    const userDisplayName = discordUser ? (discordUser.globalName || discordUser.username) : 'Bạn';
    const userAvatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=You';
    setMessages(prev => [
      ...prev.slice(-30),
      {
        id: Date.now().toString(),
        user: userDisplayName,
        avatar: userAvatar,
        text: `Đã chốt lời an toàn tại ${cashMultiplier.toFixed(2)}x [${stage.badge}] (+${winTotal.toLocaleString('vi-VN')} Xu)! 🤑🎉`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: discordUser ? 'DISCORD' : 'VIP',
        isSystem: true,
      },
    ]);
  };

  // Trigger Crash
  const triggerCrash = (finalCrashMultiplier: number) => {
    sounds.playExplosion();
    setPhase('CRASHED');
    setMultiplier(finalCrashMultiplier);

    // Update remaining players as LOST
    setPlayers(prev =>
      prev.map(p => {
        if (p.status === 'FLYING') {
          return { ...p, status: 'LOST' };
        }
        return p;
      })
    );

    // Check if UFO Alien Shield was active when crashed
    let wasShielded = false;
    if (activeEventRef.current?.type === 'ALIEN_SHIELD' && userBet > 0 && !isCashedOutRef.current) {
      wasShielded = true;
      setShieldSavedBet(true);
      setBalance(prev => prev + userBet);
      sounds.playShieldActivate();
      setMessages(prev => [
        ...prev.slice(-30),
        {
          id: `shield_save_${Date.now()}`,
          user: 'Bảo_AllIn',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao',
          text: '🛸 ĐÙ MÁ KHIÊN UFO HẤP THỤ VỤ NỔ CỨU MẠNG!! Được hoàn 100% tiền cược đỉnh vcl!! 🔥',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    // If user bet and didn't cash out and wasn't shielded -> record loss
    if (userBet > 0 && !isCashedOutRef.current && !wasShielded) {
      setStats(prev => ({
        ...prev,
        totalGames: prev.totalGames + 1,
        losses: prev.losses + 1,
        totalProfit: prev.totalProfit - userBet,
      }));
    }

    // Add to history
    const completedRound: RoundHistory = {
      id: currentRoundId,
      multiplier: finalCrashMultiplier,
      timestamp: Date.now(),
      seed: currentSeed,
      hash: currentHash,
      mode: flightModeRef.current,
    };

    setHistory(prev => [completedRound, ...prev.slice(0, 24)]);

    // Reset user bet for next round
    setUserBet(0);

    // Post realistic, slightly salty & edgy community reactions
    let crashCommentsPool: string[];
    if (finalCrashMultiplier < 1.6) {
      crashCommentsPool = [
        `Vcl vừa nhấc đít đã nổ ${finalCrashMultiplier.toFixed(2)}x, game bịp đéo chịu được 🤬`,
        `Đm đùa tao à??? Mới 1 giây bay cụ nó đống xu!`,
        `Cay dái vãi lìn, con tàu rác nổ sớm thế nhờ!`,
        `Má nó nuốt không chừa một cắc, ván sau x2 tiền gỡ lại bố m đéo sợ`,
        `Cục súc vcl vừa vào tiền to phát đứt phựt luôn... Trầm cảm!`,
        `Á đù nổ ${finalCrashMultiplier.toFixed(2)}x, cứu tao với cháy mẹ acc rồi 😭`,
        `Game hút máu ác thật sự, ván sau tất tay khô máu!`,
      ];
    } else if (finalCrashMultiplier < 5.0) {
      crashCommentsPool = [
        `Biết ngay mà đm, định gồng thêm tí thì BÙM ở ${finalCrashMultiplier.toFixed(2)}x! Tham thì thâm!`,
        `Cay thế nhở, tay chuẩn bị bấm chốt thì nó nổ mẹ, đúng số chó`,
        `Hahaha mấy con giời gồng tham chết hết chưa, tao chốt từ 2x ấm cật rồi`,
        `Vcl non tay thế, lúc 3x đéo nhảy giờ lại về mo`,
        `Đen như mõm chó, ${finalCrashMultiplier.toFixed(2)}x là toang...`,
        `Tiếc đứt ruột vcl, ván sau tất tay phục thù!`,
        `Chốt non 2.5x hóa ra lại chuẩn bài haha, sống sót qua kiếp nạn`,
      ];
    } else if (finalCrashMultiplier < 18.0) {
      crashCommentsPool = [
        `Húp đậm ngập mồm rồi anh em ơii!! Đã cái nư vcl 🤑🔥`,
        `Vl nổ ở ${finalCrashMultiplier.toFixed(2)}x, tiếc quá tao nhảy non từ 3x nhìn nó bay mà ứa nước mắt`,
        `Ai gồng được tới ${finalCrashMultiplier.toFixed(2)}x lên tiếng cho xin vía với, tay to vcl!`,
        `Khét lẹt! Vừa gỡ lại hết đống nợ lúc nãy haha`,
        `Gáy lên các con vợ ơi!! Quả này ăn đẫm mồm rồi!`,
        `Nổ ở ${finalCrashMultiplier.toFixed(2)}x đỉnh thật sự, ấm cật cả tuần!`,
      ];
    } else {
      crashCommentsPool = [
        `Á ĐÙ NỔ Ở ${finalCrashMultiplier.toFixed(2)}x TẬN ĐỈNH VŨ TRỤ!! QUẢ NÀY ÔNG NÀO GỒNG LÀ ĐỔI ĐỜI RỒI 😱💎`,
        `Vãi cả chưởng bay như hack!! Mắt tao trố ra luôn nổ ${finalCrashMultiplier.toFixed(2)}x!`,
        `Mẹ nó tiếc vcl, nhảy lúc x5 nhìn nó lên tận ${finalCrashMultiplier.toFixed(2)}x mà đau tim chết mất!`,
        `Huyền thoại vcl!! Ai ăn được phát này khao cả phòng đi chứ còn chờ gì nữa 🚀💸💸`,
      ];
    }

    const randComment1 = crashCommentsPool[Math.floor(Math.random() * crashCommentsPool.length)];
    const randUser1 = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    
    // 50% chance a second bot chimes in with a reply or reaction
    const newChatItems: ChatMessage[] = [
      {
        id: `crash1_${Date.now()}`,
        user: randUser1,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${randUser1}`,
        text: randComment1,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    if (Math.random() < 0.55) {
      const remainingBots = BOT_NAMES.filter(b => b !== randUser1);
      const randUser2 = remainingBots[Math.floor(Math.random() * remainingBots.length)];
      const replies = finalCrashMultiplier < 2.0
        ? [
            'Chuẩn đm, cay vãi nồi',
            'Thôi ván sau gấp đôi tiền gỡ lại',
            'Khóc tiếng miên luôn ae ạ 😂',
            'Tao cũng bay sạch tiền cược ván này rồi',
          ]
        : [
            'Đù ngon thế, tao nhảy sớm quá tiếc vcl',
            'Tay to đấy, xin vía ván sau gồng tiếp',
            'Ảo ma canada thật sự haha',
            'Quả này uy tín luôn kkk',
          ];
      const randReply = replies[Math.floor(Math.random() * replies.length)];
      newChatItems.push({
        id: `crash2_${Date.now() + 50}`,
        user: randUser2,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${randUser2}`,
        text: randReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    setMessages(prev => [...prev.slice(-30), ...newChatItems]);

    // Wait 3.5s then restart countdown
    setTimeout(() => {
      initNewRound();
    }, 3800);
  };

  // Place Bet
  const handlePlaceBet = (amount: number) => {
    if (amount <= 0 || amount > balance) return;
    sounds.playClick();
    setBalance(prev => prev - amount);
    setUserBet(amount);

    setStats(prev => ({
      ...prev,
      totalWagered: prev.totalWagered + amount,
    }));

    // Add user into active players lobby list
    const userDisplayName = discordUser ? (discordUser.globalName || discordUser.username) : 'Bạn (Người Chơi)';
    const userAvatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=You';
    const userPlayer: PlayerBet = {
      id: 'current_user',
      username: userDisplayName,
      avatar: userAvatar,
      betAmount: amount,
      status: 'PENDING',
      isCurrentUser: true,
    };
    setPlayers(prev => [userPlayer, ...prev.filter(p => !p.isCurrentUser)]);
  };

  // Cancel Bet during COUNTDOWN
  const handleCancelBet = () => {
    if (userBet <= 0 || phase !== 'COUNTDOWN') return;
    sounds.playClick();
    setBalance(prev => prev + userBet);
    setStats(prev => ({
      ...prev,
      totalWagered: prev.totalWagered - userBet,
    }));
    setUserBet(0);
    setPlayers(prev => prev.filter(p => !p.isCurrentUser));
  };

  // Manual Cashout button click
  const handleCashoutClick = () => {
    executeUserCashout(multiplier);
  };

  // Free Faucet replenishment
  const handleAddFunds = (amount: number) => {
    sounds.playCashoutWin();
    setBalance(prev => prev + amount);
  };

  // Toggle Sound
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  // Send message to chat
  const handleSendMessage = (text: string) => {
    const userDisplayName = discordUser ? (discordUser.globalName || discordUser.username) : 'Bạn';
    const userAvatar = discordUser ? discordUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=You';
    setMessages(prev => [
      ...prev.slice(-30),
      {
        id: Date.now().toString(),
        user: userDisplayName,
        avatar: userAvatar,
        badge: discordUser ? 'DISCORD' : 'VIP',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
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
                  +5K
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
                title="Liên kết tài khoản Discord (+5.000 Xu)"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Liên Kết Discord</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full font-black">
                  +5K
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
        onUpdateDiscordUser={setDiscordUser}
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
