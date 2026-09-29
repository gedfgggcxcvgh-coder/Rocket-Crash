import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createHash, randomBytes } from 'node:crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.join(__dirname, 'discord-oauth-config.json');
const USER_DB_FILE_PATH = path.join(__dirname, 'user-database.json');

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Enable trust proxy for Render / Vercel cloud HTTPS proxies
  app.set('trust proxy', 1);

  app.use(express.json());

  // Helper to determine accurate public base URL
  const getAppUrl = (req: express.Request) => {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
    const host = req.get('host') || `localhost:${PORT}`;
    const isHttps =
      req.protocol === 'https' ||
      req.headers['x-forwarded-proto'] === 'https' ||
      host.includes('.onrender.com') ||
      host.includes('.vercel.app');
    return `${isHttps ? 'https' : 'http'}://${host}`;
  };

  // Load persisted Discord OAuth configuration if available
  let discordAuthConfig = {
    clientId: process.env.DISCORD_CLIENT_ID || '1553795964215627836',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  };

  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
      if (savedConfig.clientId) discordAuthConfig.clientId = savedConfig.clientId;
      if (savedConfig.clientSecret) discordAuthConfig.clientSecret = savedConfig.clientSecret;
    }
  } catch (err) {
    console.error('Failed to read discord-oauth-config.json:', err);
  }

  // Persistent user database store for Discord linked accounts across devices
  let userDatabase: Record<string, any> = {};
  try {
    if (fs.existsSync(USER_DB_FILE_PATH)) {
      userDatabase = JSON.parse(fs.readFileSync(USER_DB_FILE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to read user-database.json:', err);
  }

  // --- GLOBAL SERVER GAME STATE ENGINE ---
  function serverSha256(message: string): string {
    return createHash('sha256').update(message).digest('hex');
  }

  function serverGenerateSeed(): string {
    return randomBytes(16).toString('hex');
  }

  function serverCalculateMultiplier(seed: string): number {
    let hashVal = 0;
    for (let i = 0; i < seed.length; i++) {
      hashVal = (hashVal * 31 + seed.charCodeAt(i)) & 0xffffffff;
    }
    const r = (Math.abs(hashVal) % 100000) / 100000;
    if (r < 0.05) return parseFloat((1.05 + (r / 0.05) * 0.20).toFixed(2));
    if (r < 0.21) return parseFloat((1.26 + ((r - 0.05) / 0.16) * 0.62).toFixed(2));
    if (r < 0.59) return parseFloat((1.89 + Math.pow((r - 0.21) / 0.38, 1.15) * 2.91).toFixed(2));
    if (r < 0.82) return parseFloat((4.81 + Math.pow((r - 0.59) / 0.23, 1.25) * 9.69).toFixed(2));
    if (r < 0.94) return parseFloat((14.51 + Math.pow((r - 0.82) / 0.12, 1.35) * 30.49).toFixed(2));
    return parseFloat((45.00 + Math.pow((r - 0.94) / 0.06, 1.5) * 243.00).toFixed(2));
  }

  const BOT_NAMES = [
    'ThánhGồng_x100', 'Bảo_AllIn', 'Long_CayCú', 'Dũng_HúpBạc', 
    'Trùm_NổSớm', 'Huy_CháyTúi', 'Tuấn_TayTo', 'Sơn_NonTay', 
    'Đạt_GỡNợ', 'Khang_BịpVcl', 'Phúc_KhôMáu', 'Nam_ĂnNon',
    'AnhBa_BaoSàn', 'Tùng_ChốtNon', 'Minh_TayVàng'
  ];

  const COMCUT_BOT_NAMES = [
    'Thánh_Ăn_Cơm', 'Húp_Cứt_Cay_Cú', 'Nam_BaoSàn', 'Tuấn_BẻCầu',
    'Long_CháyTúi', 'Minh_GỡNợ', 'Đạt_GàBéo', 'Hoàng_TấtTay',
    'Bảo_ThíchCơmSườn', 'Sơn_ĂnCứtChuyênNghiệp', 'Trùm_LắcBát', 'Huy_MêCơmTấm',
    'Bình_BẻCầuGãyTay', 'Tài_Xỉu_Cơm_Cứt', 'Đại_Gia_Allin'
  ];

  interface ComCutHistoryItemServer {
    id: string;
    roundNumber: number;
    dices: [number, number, number];
    total: number;
    result: 'COM' | 'CUT';
    isBao: boolean;
    time: string;
  }

  interface ComCutBotBetServer {
    id: string;
    name: string;
    avatar: string;
    side: 'COM' | 'CUT';
    amount: number;
  }

  let globalComCutState = {
    roundNumber: 1388,
    phase: 'BETTING' as 'BETTING' | 'SHAKING' | 'OPENING' | 'RESULT',
    timeLeft: 25,
    phaseStartTime: Date.now(),
    phaseDuration: 25,
    dices: [4, 5, 2] as [number, number, number],
    diceRotations: [12, -8, 25] as [number, number, number],
    outcome: 'COM' as 'COM' | 'CUT',
    total: 11,
    isBao: false,
    isBaoCom: false,
    isBaoCut: false,
    poolCom: 36247000,
    poolCut: 36113000,
    countCom: 48,
    countCut: 49,
    recentLiveBets: [] as ComCutBotBetServer[],
    history: [
      { id: '1', roundNumber: 1384, dices: [4, 5, 3] as [number, number, number], total: 12, result: 'COM' as const, isBao: false, time: '14:20' },
      { id: '2', roundNumber: 1385, dices: [1, 2, 4] as [number, number, number], total: 7, result: 'CUT' as const, isBao: false, time: '14:21' },
      { id: '3', roundNumber: 1386, dices: [2, 3, 3] as [number, number, number], total: 8, result: 'CUT' as const, isBao: false, time: '14:22' },
      { id: '4', roundNumber: 1387, dices: [6, 4, 5] as [number, number, number], total: 15, result: 'COM' as const, isBao: false, time: '14:23' },
    ] as ComCutHistoryItemServer[],
  };

  // User bets per round on server: roundNumber -> userId -> side -> amount
  const comCutUserBets: Record<number, Record<string, Record<string, number>>> = {};

  interface PlayerBetServer {
    id: string;
    username: string;
    avatar: string;
    betAmount: number;
    cashoutMultiplier?: number;
    targetMultiplier?: number;
    status: 'PENDING' | 'CASHED_OUT' | 'CRASHED';
    isBot?: boolean;
  }

  interface ChatMessageServer {
    id: string;
    user: string;
    avatar: string;
    text: string;
    time: string;
    badge?: string;
    isSystem?: boolean;
  }

  let globalChatMessages: ChatMessageServer[] = [
    { id: '1', user: 'Huy_CháyTúi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Huy', text: 'Má ván trước vừa vào định gồng x50 thì toang, cay dái thật', time: '14:26' },
    { id: '2', user: 'Tuấn_TayTo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan', text: 'Non thì chịu đi chú em, vừa làm phát 50k xu ấm cật haha', time: '14:27' },
    { id: '3', user: 'Bảo_AllIn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao', text: 'Ván này bố m tất tay khô máu, đéo tin k lên nổi x10!', time: '14:28' },
    { id: '4', user: 'Nam_ĂnNon', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nam', text: 'Cứ 2x tao nhảy, ăn non cho lành cãi nhau làm đéo gì', time: '14:29' },
  ];

  function addServerChatMessage(msg: Omit<ChatMessageServer, 'id'>): ChatMessageServer {
    const newMsg: ChatMessageServer = {
      ...msg,
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
    };
    globalChatMessages.push(newMsg);
    if (globalChatMessages.length > 50) {
      globalChatMessages.shift();
    }
    return newMsg;
  }

  let currentSeed = serverGenerateSeed();
  let currentHash = serverSha256(currentSeed);
  let currentCrashPoint = serverCalculateMultiplier(currentSeed);

  let globalGameState = {
    roundId: Date.now().toString(),
    status: 'COUNTDOWN' as 'COUNTDOWN' | 'FLYING' | 'CRASHED',
    countdown: 5.0,
    multiplier: 1.00,
    crashPoint: currentCrashPoint,
    seed: currentSeed,
    hash: currentHash,
    startTime: 0,
    crashedAt: null as number | null,
    history: [
      { id: '1', seed: 'init1', hash: 'hash1', crashPoint: 1.85, timestamp: Date.now() - 60000 },
      { id: '2', seed: 'init2', hash: 'hash2', crashPoint: 12.40, timestamp: Date.now() - 50000 },
      { id: '3', seed: 'init3', hash: 'hash3', crashPoint: 1.05, timestamp: Date.now() - 40000 },
      { id: '4', seed: 'init4', hash: 'hash4', crashPoint: 3.20, timestamp: Date.now() - 30000 },
      { id: '5', seed: 'init5', hash: 'hash5', crashPoint: 15.80, timestamp: Date.now() - 20000 },
      { id: '6', seed: 'init6', hash: 'hash6', crashPoint: 1.42, timestamp: Date.now() - 10000 },
    ],
    players: [] as PlayerBetServer[],
  };

  function generateServerBots(): PlayerBetServer[] {
    const count = Math.floor(Math.random() * 6) + 6;
    const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random()).slice(0, count);
    const amounts = [100000, 250000, 500000, 1000000, 2000000, 3500000, 5000000, 10000000];
    
    const bots = shuffled.map((name, idx) => {
      const betAmount = amounts[Math.floor(Math.random() * amounts.length)];
      const roll = Math.random();
      let target: number;
      if (roll < 0.35) target = parseFloat((Math.random() * 1.5 + 1.35).toFixed(2));
      else if (roll < 0.75) target = parseFloat((Math.random() * 4.5 + 2.8).toFixed(2));
      else if (roll < 0.92) target = parseFloat((Math.random() * 12 + 7.5).toFixed(2));
      else target = parseFloat((Math.random() * 40 + 20).toFixed(2));

      return {
        id: `bot_${idx}_${Date.now()}`,
        username: name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
        betAmount,
        targetMultiplier: target,
        status: 'PENDING' as const,
        isBot: true,
      };
    });

    // Random bot chat comment when placing bets
    if (Math.random() < 0.45 && bots.length > 0) {
      const talker = bots[Math.floor(Math.random() * bots.length)];
      const betFormatted = talker.betAmount.toLocaleString('vi-VN');
      const betComments = [
        `Đù má ván này tao vẩy ${betFormatted} Xu khô máu, đéo x5 đéo làm người! 🔥`,
        `Vừa ném ${betFormatted} Xu vào, anh em né ra cho đại gia thể hiện! 😎`,
        `Cay vcl ván trước ăn lộn, ván này phang ${betFormatted} Xu gỡ gạc!`,
        `Nhẹ nhàng ${betFormatted} Xu xem nhà cái quay hũ kiểu gì, định bịp tao à! 😈`,
        `Tất tay ${betFormatted} Xu! Một là ăn tết to hai là ra đê ở! 🚀`,
        `Ván này tao nhắm đến x10, anh em nào dám gồng theo không?`,
      ];
      addServerChatMessage({
        user: talker.username,
        avatar: talker.avatar,
        text: betComments[Math.floor(Math.random() * betComments.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    return bots;
  }

  globalGameState.players = generateServerBots();

  let sseClients: Array<{ res: express.Response }> = [];

  function getUserRecord(userId: string, username?: string) {
    if (!userDatabase[userId]) {
      userDatabase[userId] = {
        id: userId,
        username: username || 'Khách',
        balance: 1000000,
        equippedSkin: 'STANDARD',
        unlockedSkins: ['STANDARD'],
        stats: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          totalProfit: 0,
          highestMultiplier: 0,
          totalWagered: 0,
        },
      };
      try {
        fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
      } catch (err) {
        console.error('Failed to write user-database.json:', err);
      }
    }
    if (!userDatabase[userId].equippedSkin) {
      userDatabase[userId].equippedSkin = 'STANDARD';
    }
    if (!Array.isArray(userDatabase[userId].unlockedSkins) || userDatabase[userId].unlockedSkins.length === 0) {
      userDatabase[userId].unlockedSkins = ['STANDARD'];
    }
    return userDatabase[userId];
  }

  let globalJackpotPool = 18500000;

  function broadcastGameState() {
    const userBalances: Record<string, number> = {};
    Object.keys(userDatabase).forEach(uId => {
      userBalances[uId] = userDatabase[uId].balance ?? 1000000;
    });

    const payload = JSON.stringify({
      ...globalGameState,
      comCut: globalComCutState,
      comCutUserBets: comCutUserBets[globalComCutState.roundNumber] || {},
      chat: globalChatMessages,
      userBalances,
      jackpotPool: globalJackpotPool,
      serverTime: Date.now(),
    });
    sseClients.forEach(client => {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch {}
    });
  }

  // Server Loop tick - 100ms
  setInterval(() => {
    const now = Date.now();

    // --- Com Va Cut Game Sync Tick ---
    const comCutElapsedSec = (now - globalComCutState.phaseStartTime) / 1000;
    const comCutRemaining = Math.max(0, Math.ceil(globalComCutState.phaseDuration - comCutElapsedSec));
    globalComCutState.timeLeft = comCutRemaining;

    if (globalComCutState.phase === 'BETTING') {
      // Random bot bets during betting window
      if (comCutRemaining > 5 && Math.random() < 0.12) {
        const side: 'COM' | 'CUT' = Math.random() > 0.49 ? 'COM' : 'CUT';
        const chipOpts = [20000, 50000, 100000, 200000, 500000, 1000000];
        const amt = chipOpts[Math.floor(Math.random() * chipOpts.length)];
        const bot = COMCUT_BOT_NAMES[Math.floor(Math.random() * COMCUT_BOT_NAMES.length)];
        if (side === 'COM') {
          globalComCutState.poolCom += amt;
          globalComCutState.countCom += 1;
        } else {
          globalComCutState.poolCut += amt;
          globalComCutState.countCut += 1;
        }
        globalComCutState.recentLiveBets.unshift({
          id: Math.random().toString(),
          name: bot,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot}`,
          side,
          amount: amt,
        });
        if (globalComCutState.recentLiveBets.length > 15) {
          globalComCutState.recentLiveBets.pop();
        }
      }

      if (comCutRemaining <= 0) {
        globalComCutState.phase = 'SHAKING';
        globalComCutState.phaseStartTime = now;
        globalComCutState.phaseDuration = 3;
        globalComCutState.timeLeft = 3;
      }
    } else if (globalComCutState.phase === 'SHAKING') {
      if (comCutRemaining <= 0) {
        const d1 = (Math.floor(Math.random() * 6) + 1) as number;
        const d2 = (Math.floor(Math.random() * 6) + 1) as number;
        const d3 = (Math.floor(Math.random() * 6) + 1) as number;
        const total = d1 + d2 + d3;
        const isBao = d1 === d2 && d2 === d3;
        const isBaoCom = isBao && d1 >= 4;
        const isBaoCut = isBao && d1 <= 3;
        const outcome: 'COM' | 'CUT' = isBao ? (d1 >= 4 ? 'COM' : 'CUT') : (total >= 11 ? 'COM' : 'CUT');

        globalComCutState.dices = [d1, d2, d3];
        globalComCutState.diceRotations = [
          Math.floor(Math.random() * 30) - 15,
          Math.floor(Math.random() * 30) - 15,
          Math.floor(Math.random() * 30) - 15,
        ];
        globalComCutState.total = total;
        globalComCutState.isBao = isBao;
        globalComCutState.isBaoCom = isBaoCom;
        globalComCutState.isBaoCut = isBaoCut;
        globalComCutState.outcome = outcome;

        globalComCutState.phase = 'OPENING';
        globalComCutState.phaseStartTime = now;
        globalComCutState.phaseDuration = 8;
        globalComCutState.timeLeft = 8;
      }
    } else if (globalComCutState.phase === 'OPENING') {
      if (comCutRemaining <= 0) {
        globalComCutState.phase = 'RESULT';
        globalComCutState.phaseStartTime = now;
        globalComCutState.phaseDuration = 4;
        globalComCutState.timeLeft = 4;

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        globalComCutState.history.unshift({
          id: globalComCutState.roundNumber.toString() + '_' + now,
          roundNumber: globalComCutState.roundNumber,
          dices: globalComCutState.dices,
          total: globalComCutState.total,
          result: globalComCutState.outcome,
          isBao: globalComCutState.isBao,
          time: nowStr,
        });
        if (globalComCutState.history.length > 50) {
          globalComCutState.history.pop();
        }

        // Payout to users who placed bets on this round
        const currentRoundBets = comCutUserBets[globalComCutState.roundNumber];
        if (currentRoundBets) {
          const { outcome, total, isBao, isBaoCom, isBaoCut } = globalComCutState;
          const isCom = !isBao && outcome === 'COM';
          const isCut = !isBao && outcome === 'CUT';

          Object.keys(currentRoundBets).forEach(uId => {
            const bets = currentRoundBets[uId];
            let winTotal = 0;
            if (isCom && bets.COM) winTotal += bets.COM * 1.98;
            if (isCut && bets.CUT) winTotal += bets.CUT * 1.98;
            if (isBaoCom && bets.BAO_COM) winTotal += bets.BAO_COM * 30;
            if (isBaoCut && bets.BAO_CUT) winTotal += bets.BAO_CUT * 30;
            if ((total === 13 || total === 14) && bets.COM_GA) winTotal += bets.COM_GA * 8;
            if ((total === 7 || total === 8) && bets.CUT_RUOI) winTotal += bets.CUT_RUOI * 8;

            if (winTotal > 0 && userDatabase[uId]) {
              const wonAmount = Math.floor(winTotal);
              userDatabase[uId].balance = (userDatabase[uId].balance || 0) + wonAmount;
              if (userDatabase[uId].stats) {
                userDatabase[uId].stats!.wins = (userDatabase[uId].stats!.wins || 0) + 1;
                const totalWageredRound = Object.values(bets).reduce((a, b) => a + b, 0);
                userDatabase[uId].stats!.totalProfit = (userDatabase[uId].stats!.totalProfit || 0) + (wonAmount - totalWageredRound);
              }
            }
          });
          try {
            fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
          } catch {}
        }

        // Funny chat comments from bots
        if (Math.random() < 0.45) {
          const bot = COMCUT_BOT_NAMES[Math.floor(Math.random() * COMCUT_BOT_NAMES.length)];
          const comMsgs = [
            `Húp trọn bát Cơm thơm phức rồi anh em ơi! 🍚🍗`,
            `Ngon lành cành đào, theo Cơm là ấm cật! 🍚✨`,
            `Cơm dẻo canh ngọt, ván này bú đẫm! 😋`,
            `Ai ôm Cơm giơ tay, lụm lúa về bản! 💰`,
          ];
          const cutMsgs = [
            `Đù má lại ỉa ra Cứt rồi, cay vãi nồi! 💩😭`,
            `Cứt nhão nhoét luôn, anh em bơi hết ra đê chưa? 💩🚨`,
            `Bệt Cứt 3 tay rồi nhà cái ơi, tha cho em! 💀`,
            `Húp Cứt ngập mồm, ván sau tất tay đảo Cơm gỡ lại! 🔥`,
          ];
          const msgList = globalComCutState.outcome === 'COM' ? comMsgs : cutMsgs;
          addServerChatMessage({
            user: bot,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot}`,
            text: msgList[Math.floor(Math.random() * msgList.length)],
            time: nowStr,
          });
        }
      }
    } else if (globalComCutState.phase === 'RESULT') {
      if (comCutRemaining <= 0) {
        globalComCutState.roundNumber += 1;
        globalComCutState.poolCom = 32000000 + Math.floor(Math.random() * 20000000);
        globalComCutState.poolCut = 30000000 + Math.floor(Math.random() * 20000000);
        globalComCutState.countCom = 35 + Math.floor(Math.random() * 20);
        globalComCutState.countCut = 33 + Math.floor(Math.random() * 20);
        globalComCutState.phase = 'BETTING';
        globalComCutState.phaseStartTime = now;
        globalComCutState.phaseDuration = 25;
        globalComCutState.timeLeft = 25;
      }
    }

    // --- Rocket Crash Game Tick ---

    if (globalGameState.status === 'COUNTDOWN') {
      globalGameState.countdown = Math.max(0, parseFloat((globalGameState.countdown - 0.1).toFixed(1)));
      if (globalGameState.countdown <= 0) {
        globalGameState.status = 'FLYING';
        globalGameState.startTime = now;
        globalGameState.multiplier = 1.00;
      }
    } else if (globalGameState.status === 'FLYING') {
      const elapsedSec = (now - globalGameState.startTime) / 1000;
      const currentMult = parseFloat(Math.pow(Math.E, 0.06 * elapsedSec).toFixed(2));

      if (currentMult >= globalGameState.crashPoint) {
        globalGameState.status = 'CRASHED';
        globalGameState.multiplier = globalGameState.crashPoint;
        globalGameState.crashedAt = now;

        globalGameState.players.forEach(p => {
          if (p.status === 'PENDING') {
            p.status = 'CRASHED';
          }
        });

        // Add crash comment from bot
        const crashMultVal = globalGameState.crashPoint;
        const crashMultStr = crashMultVal.toFixed(2);
        const randBot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        
        let crashSlangs: string[] = [];
        if (crashMultVal < 1.35) {
          crashSlangs = [
            `ĐÙ MÁ NỔ ${crashMultStr}x??? NHÀ CÁI BỊP VCL KHÚC NÀY!! 🤬`,
            `Chưa kịp chớp mắt đã BÙM ở ${crashMultStr}x, cay vãi cặt!! 😭`,
            `Má nó nuốt sạch tiền cược trong 1 giây, ảo thật đấy!! 💀`,
            `Game bịp đéo chịu được, vừa bấm cược xong nổ luôn!! 💩`,
            `Nhà cái nuốt dày thế, giả lại tiền cược cho taooo! 🚨`,
          ];
        } else if (crashMultVal < 3.50) {
          crashSlangs = [
            `Vcl nổ ở ${crashMultStr}x, gồng thêm 0.2 nữa là húp cmnr cay vãi nồi!`,
            `Biết thế chốt mẹ 2x cho lành, tham thì thâm vcl... 😮‍💨`,
            `Nổ ngay trước mũi x3, cay đéo tả nổi các ông ạ!`,
            `Lại cút mất tiền cược, ván sau xé xác nhà cái ra gỡ! 🔥`,
            `Má ơi nổ ${crashMultStr}x vừa kịp cút, cay đắng thật!`,
          ];
        } else {
          crashSlangs = [
            `ĐÙ MÁ X${crashMultStr} KÌA CÓ AI GỒNG TỚI ĐÂY KHÔNG??? OÁCH VCL! 🚀✨`,
            `Aiii chốt được ${crashMultStr}x giơ tay tao lạy phát!! Bay tít mù cmnl! 👑`,
            `Vãi lờ x${crashMultStr}!! Tiếc vcl vừa nhảy x2 cmnr 😱`,
            `Ăn đậm x${crashMultStr} rồi!! Chuyến này đổi đời cmnl anh em ơi! 💰💰`,
          ];
        }

        addServerChatMessage({
          user: randBot,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${randBot}`,
          text: crashSlangs[Math.floor(Math.random() * crashSlangs.length)],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        globalGameState.history.unshift({
          id: globalGameState.roundId,
          seed: globalGameState.seed,
          hash: globalGameState.hash,
          crashPoint: globalGameState.crashPoint,
          timestamp: now,
        });
        if (globalGameState.history.length > 20) {
          globalGameState.history.pop();
        }
      } else {
        globalGameState.multiplier = currentMult;

        globalGameState.players.forEach(p => {
          if (p.status === 'PENDING' && p.targetMultiplier && currentMult >= p.targetMultiplier) {
            p.status = 'CASHED_OUT';
            p.cashoutMultiplier = p.targetMultiplier;

            // Bot flex in chat when cashing out
            if (p.isBot && Math.random() < 0.28) {
              const win = Math.floor(p.betAmount * p.targetMultiplier);
              const winStr = win.toLocaleString('vi-VN');
              const multStr = p.targetMultiplier.toFixed(2);
              const flexSlangs = [
                `Húp ngọt +${winStr} Xu ở ${multStr}x!! Tuổi lờ ăn được tao haha 😏`,
                `Chốt ${multStr}x húp tạm +${winStr} Xu làm cốc bia, cãi nhau với nhà cái làm đéo gì 🍺`,
                `Vẩy nhẹ ${multStr}x bú +${winStr} Xu, gồng làm đéo gì cho đau tim anh em ơi! 🔥`,
                `Húp +${winStr} Xu ấm cật vcl!! Đủ tiền bao người yêu đi nghỉ dưỡng weekend! 🏖️`,
                `Đại gia chốt ${multStr}x húp +${winStr} Xu! Anh em ở lại gồng vui vẻ nhé 👋`,
              ];
              addServerChatMessage({
                user: p.username,
                avatar: p.avatar,
                text: flexSlangs[Math.floor(Math.random() * flexSlangs.length)],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }

            if (!p.isBot) {
              const primaryUserId = p.id.replace('_bet2', '');
              if (userDatabase[primaryUserId]) {
                const win = Math.floor(p.betAmount * p.targetMultiplier);
                userDatabase[primaryUserId].balance = (userDatabase[primaryUserId].balance || 0) + win;
                try {
                  fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
                } catch {}
              }
            }
          }
        });
      }
    } else if (globalGameState.status === 'CRASHED') {
      if (now - (globalGameState.crashedAt || 0) >= 3000) {
        currentSeed = serverGenerateSeed();
        currentHash = serverSha256(currentSeed);
        currentCrashPoint = serverCalculateMultiplier(currentSeed);

        globalGameState.roundId = now.toString();
        globalGameState.status = 'COUNTDOWN';
        globalGameState.countdown = 5.0;
        globalGameState.multiplier = 1.00;
        globalGameState.crashPoint = currentCrashPoint;
        globalGameState.seed = currentSeed;
        globalGameState.hash = currentHash;
        globalGameState.crashedAt = null;
        globalGameState.players = generateServerBots();
      }
    }

    broadcastGameState();
  }, 100);

  // GET /api/game/state - Current State Snapshot
  app.get('/api/game/state', (req, res) => {
    res.json({
      ...globalGameState,
      comCut: globalComCutState,
      serverTime: Date.now(),
    });
  });

  // GET /api/comcut/state - Dedicated Cơm Hay Cứt State Snapshot
  app.get('/api/comcut/state', (req, res) => {
    const userId = req.query.userId as string | undefined;
    const userBets = (userId && comCutUserBets[globalComCutState.roundNumber]?.[userId]) || undefined;
    res.json({
      ...globalComCutState,
      userBets,
      serverTime: Date.now(),
    });
  });

  // POST /api/comcut/bet - Place a bet in Com Va Cut game
  app.post('/api/comcut/bet', (req, res) => {
    const { userId, side, amount, roundNumber } = req.body;
    if (!userId || !side || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Thông tin cược không hợp lệ' });
    }
    if (globalComCutState.phase !== 'BETTING' || globalComCutState.timeLeft <= 5) {
      return res.status(400).json({ error: 'Hệ thống đã khóa cược cho phiên này' });
    }
    if (roundNumber && roundNumber !== globalComCutState.roundNumber) {
      return res.status(400).json({ error: 'Phiên cược đã chuyển sang vòng mới' });
    }

    const record = getUserRecord(userId);
    if ((record.balance || 0) < amount) {
      return res.status(400).json({ error: 'Số dư không đủ để đặt cược' });
    }

    record.balance = (record.balance || 0) - amount;
    if (record.stats) {
      record.stats.totalGames = (record.stats.totalGames || 0) + 1;
      record.stats.totalWagered = (record.stats.totalWagered || 0) + amount;
    }

    const currentR = globalComCutState.roundNumber;
    if (!comCutUserBets[currentR]) {
      comCutUserBets[currentR] = {};
    }
    if (!comCutUserBets[currentR][userId]) {
      comCutUserBets[currentR][userId] = {
        COM: 0,
        CUT: 0,
        BAO_COM: 0,
        BAO_CUT: 0,
        COM_GA: 0,
        CUT_RUOI: 0,
      };
    }
    comCutUserBets[currentR][userId][side] = (comCutUserBets[currentR][userId][side] || 0) + amount;

    // Update pool
    if (side === 'COM' || side === 'COM_GA' || side === 'BAO_COM') {
      globalComCutState.poolCom += amount;
      globalComCutState.countCom += 1;
    } else {
      globalComCutState.poolCut += amount;
      globalComCutState.countCut += 1;
    }

    // Add to recent live bets
    globalComCutState.recentLiveBets.unshift({
      id: Math.random().toString(),
      name: record.username || 'Bạn',
      avatar: record.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      side: (side === 'COM' || side === 'COM_GA' || side === 'BAO_COM') ? 'COM' : 'CUT',
      amount,
    });
    if (globalComCutState.recentLiveBets.length > 20) {
      globalComCutState.recentLiveBets.pop();
    }

    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch {}

    broadcastGameState();

    res.json({
      success: true,
      balance: record.balance,
      userBets: comCutUserBets[currentR][userId],
      roundNumber: currentR,
    });
  });

  // GET /api/game/stream - Real-time SSE Game Stream
  app.get('/api/game/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ ...globalGameState, comCut: globalComCutState, serverTime: Date.now() })}\n\n`);

    const client = { res };
    sseClients.push(client);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== client);
    });
  });

  // GET /api/user/:userId - Get user profile & balance
  app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;
    const username = req.query.username as string;
    const record = getUserRecord(userId, username);
    res.json(record);
  });

  // POST /api/user/faucet - Add free test funds
  app.post('/api/user/faucet', (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ' });
    }
    const record = getUserRecord(userId);
    record.balance = (record.balance || 0) + amount;
    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch {}
    broadcastGameState();
    res.json({ success: true, balance: record.balance });
  });

  // POST /api/user/balance - Set or adjust balance directly from mini games
  app.post('/api/user/balance', (req, res) => {
    const { userId, balance, change, stats } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId' });
    }
    const record = getUserRecord(userId);
    if (typeof balance === 'number') {
      record.balance = Math.max(0, Math.floor(balance));
    } else if (typeof change === 'number') {
      record.balance = Math.max(0, Math.floor((record.balance || 0) + change));
    }
    if (stats && typeof stats === 'object') {
      record.stats = { ...(record.stats || {}), ...stats };
    }
    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch (err) {
      console.error('Failed to save balance to user-database.json:', err);
    }
    broadcastGameState();
    res.json({ success: true, balance: record.balance });
  });

  // POST /api/user/skin - Save equipped skin and unlocked skins
  app.post('/api/user/skin', (req, res) => {
    const { userId, equippedSkin, unlockedSkins } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId' });
    }
    const record = getUserRecord(userId);
    if (equippedSkin) record.equippedSkin = equippedSkin;
    if (Array.isArray(unlockedSkins) && unlockedSkins.length > 0) {
      record.unlockedSkins = Array.from(new Set([...(record.unlockedSkins || []), ...unlockedSkins]));
    }
    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch (err) {
      console.error('Failed to update skin in database:', err);
    }
    res.json({
      success: true,
      equippedSkin: record.equippedSkin,
      unlockedSkins: record.unlockedSkins,
    });
  });

  // POST /api/game/bet - Place a bet
  app.post('/api/game/bet', (req, res) => {
    const { userId, username, avatar, betAmount, targetMultiplier } = req.body;
    if (!userId || !betAmount || betAmount <= 0) {
      return res.status(400).json({ error: 'Cược không hợp lệ.' });
    }

    if (globalGameState.status !== 'COUNTDOWN') {
      return res.status(400).json({ error: 'Rất tiếc! Đợt cược ván này đã kết thúc.' });
    }

    const primaryUserId = userId.replace('_bet2', '');
    const userRecord = getUserRecord(primaryUserId, username ? username.replace(' (Vé 2)', '') : undefined);

    if ((userRecord.balance || 0) < betAmount) {
      return res.status(400).json({ error: 'Không đủ số dư Xu.' });
    }
    userRecord.balance -= betAmount;
    globalJackpotPool += Math.floor(betAmount * 0.01);

    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch {}

    const existingIndex = globalGameState.players.findIndex(p => p.id === userId);
    if (existingIndex >= 0) {
      globalGameState.players[existingIndex] = {
        id: userId,
        username: username || 'Player',
        avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Player',
        betAmount,
        targetMultiplier,
        status: 'PENDING',
        isBot: false,
      };
    } else {
      globalGameState.players.unshift({
        id: userId,
        username: username || 'Player',
        avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Player',
        betAmount,
        targetMultiplier,
        status: 'PENDING',
        isBot: false,
      });
    }

    broadcastGameState();
    res.json({ success: true, newBalance: userDatabase[primaryUserId]?.balance });
  });

  // POST /api/game/cashout - Cashout bet
  app.post('/api/game/cashout', (req, res) => {
    const { userId, betAmount, cashoutMultiplier, winAmount } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const primaryUserId = userId.replace('_bet2', '');
    const userRecord = getUserRecord(primaryUserId);

    const player = globalGameState.players.find(p => p.id === userId);
    const effectiveMult = (typeof cashoutMultiplier === 'number' && cashoutMultiplier >= 1.0)
      ? cashoutMultiplier
      : globalGameState.multiplier;
    const effectiveBet = player?.betAmount || (typeof betAmount === 'number' ? betAmount : 50000);
    const effectiveWin = (typeof winAmount === 'number' && winAmount > 0)
      ? winAmount
      : Math.floor(effectiveBet * effectiveMult);

    if (player) {
      player.status = 'CASHED_OUT';
      player.cashoutMultiplier = effectiveMult;
    }

    userRecord.balance = (userRecord.balance || 0) + effectiveWin;
    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch {}

    broadcastGameState();
    res.json({
      success: true,
      cashoutMultiplier: effectiveMult,
      winAmount: effectiveWin,
      newBalance: userRecord.balance,
    });
  });

  // POST /api/chat/send - Send chat message
  app.post('/api/chat/send', (req, res) => {
    const { user, avatar, badge, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Nội dung tin nhắn trống.' });
    }

    const createdMsg = addServerChatMessage({
      user: user || 'Khách',
      avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      badge,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    broadcastGameState();
    res.json({ success: true, message: createdMsg });
  });

  // GET /api/game/leaderboard - Top Players Leaderboard
  app.get('/api/game/leaderboard', (req, res) => {
    const mockBotsLeaderboard = [
      { id: 'b1', username: 'ThánhGồng_x100', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThánhGồng_x100', totalProfit: 85200000, highestMultiplier: 104.50, wins: 42, vipTitle: 'Vua Gồng Lãi 👑', badge: 'VIP' },
      { id: 'b2', username: 'ĐạiGia_SàiGòn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DaiGia', totalProfit: 62400000, highestMultiplier: 78.20, wins: 38, vipTitle: 'Đại Gia Tên Lửa 💰', badge: 'VIP' },
      { id: 'b3', username: 'Bảo_AllIn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao', totalProfit: 41800000, highestMultiplier: 45.10, wins: 29, vipTitle: 'Thần Tài Vũ Trụ ⚡', badge: 'VIP' },
      { id: 'b4', username: 'Tuấn_TayTo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan', totalProfit: 35000000, highestMultiplier: 32.80, wins: 25, vipTitle: 'Sát Thủ Tên Lửa 🎯', badge: 'VIP' },
      { id: 'b5', username: 'Phúc_KhôMáu', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Phuc', totalProfit: 28400000, highestMultiplier: 28.50, wins: 21, vipTitle: 'Chiến Hạm Thép 🚀', badge: 'VIP' },
    ];

    const realUsers = Object.values(userDatabase).map((u: any) => ({
      id: u.id,
      username: u.username || 'Khách',
      avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`,
      totalProfit: u.stats?.totalProfit || 0,
      highestMultiplier: u.stats?.highestMultiplier || 1.0,
      wins: u.stats?.wins || 0,
      vipTitle: u.stats?.vipTitle || 'Phi Công Tập Sự 🧑‍🚀',
      badge: u.discordUser ? 'DISCORD' : 'VIP',
    }));

    const combined = [...realUsers, ...mockBotsLeaderboard].sort((a, b) => b.totalProfit - a.totalProfit);
    res.json(combined);
  });

  // POST /api/auth/discord/config - Save dynamic Client ID and Client Secret permanently
  app.post('/api/auth/discord/config', (req, res) => {
    const { clientId, clientSecret } = req.body;
    if (clientId) discordAuthConfig.clientId = clientId.trim();
    if (clientSecret) discordAuthConfig.clientSecret = clientSecret.trim();

    try {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(discordAuthConfig, null, 2));
    } catch (err) {
      console.error('Failed to write discord-oauth-config.json:', err);
    }

    res.json({
      success: true,
      clientId: discordAuthConfig.clientId,
      hasSecret: !!discordAuthConfig.clientSecret,
    });
  });

  // GET /api/auth/discord/url - Returns official Discord OAuth2 authorize URL
  app.get('/api/auth/discord/url', (req, res) => {
    const customClientId = req.query.client_id as string;
    const clientId = customClientId || discordAuthConfig.clientId || process.env.DISCORD_CLIENT_ID || '1553795964215627836';
    
    // Construct exact redirect URI
    const appUrl = getAppUrl(req);
    const redirectUri = `${appUrl}/api/auth/discord/callback`;

    if (!clientId) {
      return res.json({
        url: null,
        error: 'MISSING_CLIENT_ID',
        redirectUri,
        isConfigured: false,
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: 'identify email',
      prompt: 'consent',
    });

    const discordAuthUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
    res.json({
      url: discordAuthUrl,
      clientId,
      redirectUri,
      isConfigured: !!(clientId && (discordAuthConfig.clientSecret || process.env.DISCORD_CLIENT_SECRET)),
      hasSecret: !!(discordAuthConfig.clientSecret || process.env.DISCORD_CLIENT_SECRET),
    });
  });

  // GET /api/auth/discord/callback - Official Discord OAuth2 redirect callback
  app.get('/api/auth/discord/callback', async (req, res) => {
    const { error } = req.query;

    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Discord OAuth Cancelled</title>
            <style>
              body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2 style="color: #f59e0b;">⚠️ Đã hủy xác thực Discord</h2>
              <p style="color: #94a3b8;">Cửa sổ này sẽ tự động đóng...</p>
            </div>
            <script>
              setTimeout(() => window.close(), 1200);
            </script>
          </body>
        </html>
      `);
    }

    // Dual-mode Callback: Process Implicit Token directly in Browser (Bypasses server IP rate-limits 100%)
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <title>Xác Thực Discord Thành Công</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            body { background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
            .card { background: #131b2e; padding: 2rem 1.5rem; border-radius: 1.5rem; text-align: center; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); max-width: 400px; width: 100%; }
            .spinner { width: 44px; height: 44px; border: 3px solid #1e293b; border-top-color: #5865f2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.2rem; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .avatar { width: 76px; height: 76px; border-radius: 50%; border: 3px solid #22c55e; margin: 0 auto 0.8rem; box-shadow: 0 0 20px rgba(34,197,94,0.4); object-fit: cover; }
            .badge { display: inline-block; background: rgba(88,101,242,0.2); border: 1px solid rgba(88,101,242,0.5); color: #818cf8; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 0.8rem; }
            .btn-action { display: block; width: 100%; margin-top: 1.2rem; padding: 12px 18px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(16,185,129,0.35); transition: transform 0.15s; }
            .btn-action:active { transform: scale(0.97); }
          </style>
        </head>
        <body>
          <div class="card" id="app-box">
            <div class="spinner"></div>
            <h3 style="margin:0;color:#5865f2;font-size:16px;">Đang kết nối tài khoản Discord...</h3>
            <p style="color:#94a3b8;font-size:13px;margin-top:0.5rem;">Vui lòng chờ trong giây lát</p>
          </div>
          <script>
            async function handleDiscordAuth() {
              const hash = window.location.hash;
              
              // 1. Client-Side Implicit Token Flow
              let token = null;
              if (hash && hash.includes('access_token')) {
                const params = new URLSearchParams(hash.substring(1));
                token = params.get('access_token');
              }

              if (token) {
                try {
                  const res = await fetch('https://discord.com/api/v10/users/@me', {
                    headers: { Authorization: 'Bearer ' + token }
                  });
                  if (!res.ok) throw new Error('Không thể lấy hồ sơ Discord');
                  const discordUser = await res.json();
                  
                  const avatarUrl = discordUser.avatar
                    ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=256'
                    : 'https://cdn.discordapp.com/embed/avatars/' + (parseInt(discordUser.id) % 5) + '.png';

                  // Fetch server save or initialize user
                  let serverSave = null;
                  try {
                    const checkRes = await fetch('/api/user/' + discordUser.id);
                    if (checkRes.ok) serverSave = await checkRes.json();
                  } catch(e) {}

                  const userBalance = serverSave && typeof serverSave.balance === 'number' ? serverSave.balance : 500000;
                  const stats = serverSave && serverSave.stats ? serverSave.stats : {
                    totalGames: 0, wins: 0, losses: 0, totalProfit: 0, highestMultiplier: 0, totalWagered: 0
                  };

                  const fullDiscordUser = {
                    id: discordUser.id,
                    username: discordUser.username,
                    globalName: discordUser.global_name || discordUser.username,
                    discriminator: discordUser.discriminator || '0',
                    avatar: avatarUrl,
                    email: discordUser.email || '',
                    bannerColor: discordUser.banner_color || '#5865F2',
                    roles: ['VIP Phi Công', 'Tài Xỉu Master'],
                    level: 1,
                    xp: 0,
                    linkedAt: Date.now(),
                    lastSyncedAt: Date.now(),
                    balance: userBalance,
                    totalGames: stats.totalGames || 0,
                    wins: stats.wins || 0,
                    losses: stats.losses || 0,
                    totalProfit: stats.totalProfit || 0,
                    highestMultiplier: stats.highestMultiplier || 0,
                    totalWagered: stats.totalWagered || 0,
                    streakDays: 1,
                    lastDailyClaim: Date.now(),
                  };

                  // 1. Save directly to localStorage for instant persistence across tabs & reloads
                  try {
                    localStorage.setItem('rocket_crash_discord_user', JSON.stringify(fullDiscordUser));
                    localStorage.setItem('rocket_crash_last_oauth_ts', Date.now().toString());
                    window.dispatchEvent(new Event('storage'));
                  } catch (e) {}

                  // 2. Sync to central server database
                  try {
                    await fetch('/api/user/sync', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        discordId: fullDiscordUser.id,
                        username: fullDiscordUser.globalName,
                        avatar: fullDiscordUser.avatar,
                        balance: fullDiscordUser.balance,
                        stats: stats,
                      })
                    });
                  } catch(e) {}

                  // 3. Notify all open tabs via BroadcastChannel
                  try {
                    if ('BroadcastChannel' in window) {
                      const syncChannel = new BroadcastChannel('rocket_crash_cross_tab_sync');
                      syncChannel.postMessage({
                        type: 'SYNC_ACCOUNT_STATE',
                        discordUser: fullDiscordUser,
                        tabId: 'oauth_cb_' + Date.now()
                      });
                    }
                  } catch(e) {}

                  // 4. Notify window.opener if desktop popup
                  if (window.opener && window.opener !== window) {
                    try {
                      window.opener.postMessage({
                        type: 'OAUTH_AUTH_SUCCESS',
                        provider: 'discord',
                        user: fullDiscordUser
                      }, '*');
                    } catch(e) {}
                  }

                  // 5. Update UI with countdown & redirect button
                  document.getElementById('app-box').innerHTML = \`
                    <img src="\${avatarUrl}" class="avatar" alt="Discord Avatar" />
                    <div class="badge">Discord Đã Xác Thực</div>
                    <h2 style="margin:0 0 0.4rem 0;color:#22c55e;font-size:20px;font-weight:900;">🎉 Đăng Nhập Thành Công!</h2>
                    <p style="color:#cbd5e1;margin:0 0 0.5rem 0;font-size:15px;font-weight:bold;">Chào mừng @\${fullDiscordUser.globalName}</p>
                    <p style="color:#38bdf8;font-size:13px;font-weight:600;">💰 +500.000 Xu Thưởng đã sẵn sàng trong ví!</p>
                    <a href="/" id="btn-redirect" class="btn-action" onclick="window.location.replace('/'); return false;">
                      🚀 VÀO GAME NGAY (<span id="timer-sec">2</span>s)
                    </a>
                  \`;

                  // Attempt window.close() for desktop popups
                  if (window.opener && window.opener !== window) {
                    setTimeout(() => {
                      try { window.close(); } catch(e) {}
                    }, 500);
                  }

                  // Auto-redirect timer: Always redirect to '/' after 2s if popup wasn't closed by browser
                  let sec = 2;
                  const timer = setInterval(() => {
                    sec--;
                    const span = document.getElementById('timer-sec');
                    if (span) span.innerText = sec;
                    if (sec <= 0) {
                      clearInterval(timer);
                      window.location.replace('/');
                    }
                  }, 1000);

                  return;
                } catch (e) {
                  console.error(e);
                  document.getElementById('app-box').innerHTML = \`
                    <h3 style="color:#ef4444;font-size:16px;">❌ Lỗi truy vấn API Discord</h3>
                    <p style="color:#94a3b8;font-size:13px;margin:0.5rem 0 1rem 0;">\${e.message || 'Lỗi không xác định'}</p>
                    <a href="/" class="btn-action" style="background:#475569;">Quay Lại Game</a>
                  \`;
                  return;
                }
              }

              document.getElementById('app-box').innerHTML = \`
                <h3 style="color:#ef4444;font-size:16px;">❌ Không tìm thấy Token xác thực</h3>
                <p style="color:#94a3b8;font-size:13px;margin:0.5rem 0 1rem 0;">Vui lòng quay lại màn hình game và bấm đăng nhập lại.</p>
                <a href="/" class="btn-action" style="background:#475569;">Quay Lại Game</a>
              \`;
            }
            handleDiscordAuth();
          </script>
        </body>
      </html>
    `);
  });

  // POST /api/user/sync - Sync user account data
  app.post('/api/user/sync', (req, res) => {
    const { discordId, balance, stats, username, avatar } = req.body;
    if (!discordId) {
      return res.status(400).json({ error: 'Missing discordId' });
    }

    userDatabase[discordId] = {
      discordId,
      username,
      avatar,
      balance,
      stats,
      lastSyncedAt: Date.now(),
    };

    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch (err) {
      console.error('Failed to write user-database.json:', err);
    }

    res.json({ success: true, saved: userDatabase[discordId] });
  });

  // Health check endpoint for Cloud Run and load balancers
  app.get(['/healthz', '/api/health'], (req, res) => {
    res.status(200).send('OK');
  });

  // Vite Dev Server middleware or production static serving
  const distPath = path.join(__dirname, 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // If in production mode but dist/index.html is missing, build it automatically
    if (!fs.existsSync(indexHtmlPath)) {
      try {
        console.log('⚡ Production mode: dist/index.html not found. Building assets...');
        const { execSync } = await import('node:child_process');
        execSync('npx vite build', { stdio: 'inherit' });
      } catch (buildErr) {
        console.error('❌ Failed to run vite build:', buildErr);
      }
    }

    if (fs.existsSync(indexHtmlPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
          return next();
        }
        res.sendFile(indexHtmlPath, (err) => {
          if (err && !res.headersSent) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Application loading error. Please refresh.');
          }
        });
      });
    } else {
      // Fallback to Vite server middleware if dist build is unavailable
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  } else {
    // In development mode, ALWAYS mount Vite dev middleware for instant live compilation
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Rocket Crash Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
