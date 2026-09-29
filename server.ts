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

  type BotArchetype = 'DIAMOND' | 'SAFE' | 'WHALE' | 'MARTINGALE' | 'ORACLE';

  interface BotConfig {
    name: string;
    archetype: BotArchetype;
    badge: string;
    badgeColor: string;
    isWhale?: boolean;
    amounts: number[];
    minTarget: number;
    maxTarget: number;
    betQuotes: string[];
    winQuotes: string[];
    lossQuotes: string[];
  }

  const BOT_CONFIGS: Record<string, BotConfig> = {
    'ThánhGồng_x100': {
      name: 'ThánhGồng_x100',
      archetype: 'DIAMOND',
      badge: '💎 Gồng Thủ',
      badgeColor: 'purple',
      amounts: [500000, 1000000, 2000000, 5000000],
      minTarget: 7.5,
      maxTarget: 50.0,
      betQuotes: [
        'Đã gồng là phải tới nóc! Không x10 thì ra đê ở với vợ! 💎🚀',
        'Tay to gồng kim cương, sàn không nuốt nổi tao đâu! 👑',
        'Ván này tao nhắm x25, đứa nào chốt non đứng sang một bên! 🔥',
      ],
      winQuotes: [
        'THẤY CHƯA?? BẢO GỒNG LÀ GỒNG! Húp trọn {win} Xu ở {mult}x!! 💎👑✨',
        'ĐẲNG CẤP GỒNG THỦ! {mult}x ngọt nước, +{win} Xu bỏ két sắt! 💰🚀',
      ],
      lossQuotes: [
        'Má nó cay thật, gồng tới {mult}x thì toang, ván sau x2 tiền khô máu tiếp! 😭',
        'Chưa chạm đỉnh đã nổ, nhà cái ghen tị với đôi tay kim cương của tao à! 🤬',
      ],
    },
    'Bảo_AllIn': {
      name: 'Bảo_AllIn',
      archetype: 'DIAMOND',
      badge: '💎 Gồng Thủ',
      badgeColor: 'purple',
      amounts: [1000000, 2500000, 5000000],
      minTarget: 5.0,
      maxTarget: 25.0,
      betQuotes: [
        'Tất tay khô máu! Một là đổi đời hai là ăn mì tôm cả tháng! 💥',
        'Vào tiền là phải dứt khoát! Ván này đéo x5 đéo chịu về!',
      ],
      winQuotes: [
        'HÚP TẤT TAY! +{win} Xu ở {mult}x, đêm nay cả xóm có lẩu ăn! 🍲🍻',
        'Thần tài gõ cửa! Bú trọn +{win} Xu đỉnh chóp anh em ơi! 🎉',
      ],
      lossQuotes: [
        'Toang mẹ sổ đỏ rồi, ai cứu với ván này nổ sớm thế! 💀',
      ],
    },
    'Khang_BịpVcl': {
      name: 'Khang_BịpVcl',
      archetype: 'DIAMOND',
      badge: '💎 Gồng Thủ',
      badgeColor: 'purple',
      amounts: [800000, 2000000, 6000000],
      minTarget: 6.0,
      maxTarget: 30.0,
      betQuotes: [
        'Nhà cái bịp thì tao cũng bịp lại! Gồng tới {bet} Xu xem ai gan dạ hơn! 😈',
        'Chuyến bay này tao đặt vé VIP, đứa nào nhảy trước là gà!',
      ],
      winQuotes: [
        'Bịp lại nhà cái thành công rực rỡ! +{win} Xu ở {mult}x, cay chưa con trai! 😈',
      ],
      lossQuotes: [
        'Bị bắt bài rồi vcl, nhà cái quả này tinh tướng thật 😤',
      ],
    },
    'Nam_ĂnNon': {
      name: 'Nam_ĂnNon',
      archetype: 'SAFE',
      badge: '🛡️ Ăn Non',
      badgeColor: 'emerald',
      amounts: [300000, 800000, 1500000],
      minTarget: 1.25,
      maxTarget: 1.75,
      betQuotes: [
        'Ăn non trường thọ anh em ơi, tích tiểu thành đại cho lành 🛡️',
        'Cứ 1.x là tao nhảy, chê ít thì cút ra ngoài xem ai sống lâu hơn haha',
      ],
      winQuotes: [
        'Bỏ túi +{win} Xu ở {mult}x nhẹ nhàng! Mấy ông gồng tí nữa khóc tiếng Mán cho xem 😏🛡️',
        'Ấm cật +{win} Xu! Cứ đều đặn ngày chục củ là ấm, gồng làm đéo gì đau tim ☕',
      ],
      lossQuotes: [
        'Đù má nổ ở {mult}x thì chịu rồi, nhà cái quay xe khét lẹt thế 😭',
      ],
    },
    'Tùng_ChốtNon': {
      name: 'Tùng_ChốtNon',
      archetype: 'SAFE',
      badge: '🛡️ Ăn Non',
      badgeColor: 'emerald',
      amounts: [200000, 500000, 1200000],
      minTarget: 1.30,
      maxTarget: 1.85,
      betQuotes: [
        'Vẩy nhẹ {bet} Xu kiếm bữa lẩu hải sản, nhảy sớm cho chắc củ 🍲',
      ],
      winQuotes: [
        'Húp +{win} Xu thơm phức! Cơm no áo ấm không phải lo nghĩ 🛡️',
      ],
      lossQuotes: [
        'Vừa bấm vào đã bùm ở {mult}x, nhà cái không cho kiếm bát phở sáng à 🍜',
      ],
    },
    'Sơn_NonTay': {
      name: 'Sơn_NonTay',
      archetype: 'SAFE',
      badge: '🛡️ Ăn Non',
      badgeColor: 'emerald',
      amounts: [250000, 500000, 1000000],
      minTarget: 1.20,
      maxTarget: 1.65,
      betQuotes: [
        'Em gan bé, chỉ mong kiếm hộp sữa cho con thôi các bác nhường em 🍼',
      ],
      winQuotes: [
        'Chốt vội {mult}x húp +{win} Xu! May quá nhảy kịp không thì toang mạng! 🍼',
      ],
      lossQuotes: [
        'Trời ơi nổ {mult}x khét thế, hộp sữa của con em bay màu rồi 😭',
      ],
    },
    'Tuấn_TayTo': {
      name: 'Tuấn_TayTo',
      archetype: 'WHALE',
      badge: '🐋 Cá Mập',
      badgeColor: 'amber',
      isWhale: true,
      amounts: [5000000, 10000000, 20000000, 30000000],
      minTarget: 1.85,
      maxTarget: 4.20,
      betQuotes: [
        'Cá mập vào lệnh {bet} Xu! Cả phòng né ra cho sóng đánh dạt vào bờ! 🐋🌊',
        'Vẩy nhẹ chục triệu Xu cà phê sáng! Để xem tàu bay được đến đâu! 💰',
      ],
      winQuotes: [
        '🐋 CÁ MẬP NUỐT TRỌN +{win} Xu Ở {mult}x! Cảm ơn nhà cái đã tài trợ chuyến du lịch Dubai! 👑✈️',
        'Bú đậm +{win} Xu! Anh em vỗ tay chúc mừng đại gia phát nào! 👏🎉',
      ],
      lossQuotes: [
        'Cháy vài chục triệu bọ, muỗi đốt inox! Ván sau tao bơm thêm 100 triệu đập nát sàn! 💸',
      ],
    },
    'AnhBa_BaoSàn': {
      name: 'AnhBa_BaoSàn',
      archetype: 'WHALE',
      badge: '🐋 Cá Mập',
      badgeColor: 'amber',
      isWhale: true,
      amounts: [10000000, 25000000, 50000000],
      minTarget: 2.00,
      maxTarget: 3.80,
      betQuotes: [
        'Sàn này anh Ba bao trọn gói {bet} Xu! Tàu bay uy tín lên nào em ơi! 🚀',
        'Hôm nay anh Ba giải ngân {bet} Xu, ai đi cùng tàu hưởng lộc chung!',
      ],
      winQuotes: [
        '👑 ANH BA HÚP +{win} Xu! Tiền về đầy ví, phát lộc cho anh em có dám nhận không? 🧧',
      ],
      lossQuotes: [
        'Rơi mất vài đồng lẻ, coi như bố thí cho phi hành đoàn! Ván sau lấy lại gấp đôi! 😎',
      ],
    },
    'Minh_TayVàng': {
      name: 'Minh_TayVàng',
      archetype: 'WHALE',
      badge: '🐋 Cá Mập',
      badgeColor: 'amber',
      isWhale: true,
      amounts: [8000000, 15000000, 35000000],
      minTarget: 2.10,
      maxTarget: 4.50,
      betQuotes: [
        'Tay vàng chạm đâu ra tiền đấy! Đặt nhẹ {bet} Xu lấy vía may mắn ✨',
      ],
      winQuotes: [
        'Húp trọn +{win} Xu nhẹ nhàng! Đôi tay vàng vẫn giữ vững phong độ đỉnh cao 🪙',
      ],
      lossQuotes: [
        'Hôm nay vía hơi đen nổ ở {mult}x, để tí ra thắp hương lại rồi vào quẩy tiếp!',
      ],
    },
    'Phúc_KhôMáu': {
      name: 'Phúc_KhôMáu',
      archetype: 'MARTINGALE',
      badge: '⚡ Gấp Thếp',
      badgeColor: 'rose',
      amounts: [500000, 1500000, 3500000, 8000000],
      minTarget: 2.00,
      maxTarget: 3.50,
      betQuotes: [
        'Máu dồn lên não rồi! Ván này gấp thếp x2 tiền cược {bet} Xu phục thù! ⚡🔥',
        'Không tin sàn bịp được mãi! Phang mạnh {bet} Xu đập tan cầu đen!',
      ],
      winQuotes: [
        '⚡ GẤP THẾP THÀNH CÔNG RỰC RỠ! Lấy lại cả vốn lẫn lãi +{win} Xu, quá đãaaa! 🚀',
      ],
      lossQuotes: [
        'Càng thua càng phải gấp! Ván sau tao nhân 3 cược, đéo tin không về bờ! 🤬⚡',
      ],
    },
    'Huy_CháyTúi': {
      name: 'Huy_CháyTúi',
      archetype: 'MARTINGALE',
      badge: '⚡ Gấp Thếp',
      badgeColor: 'rose',
      amounts: [400000, 1000000, 2500000, 6000000],
      minTarget: 2.20,
      maxTarget: 3.80,
      betQuotes: [
        'Còn cái nịt cũng phải đập vào! Ván này gấp thếp {bet} Xu gỡ nợ! 💸',
      ],
      winQuotes: [
        'Cứu được cái túi thủng rồi anh em ơi! +{win} Xu hồi sinh ngoạn mục! 🌟',
      ],
      lossQuotes: [
        'Cháy túi tập 2 nổ ở {mult}x rồi má ơi, ai cho vay ít Xu gỡ gạc cứu tao với 😭',
      ],
    },
    'Long_CayCú': {
      name: 'Long_CayCú',
      archetype: 'MARTINGALE',
      badge: '⚡ Gấp Thếp',
      badgeColor: 'rose',
      amounts: [600000, 1500000, 4000000],
      minTarget: 2.40,
      maxTarget: 4.00,
      betQuotes: [
        'Cay cú vcl ván trước hụt! Ván này bơm {bet} Xu đấm thẳng mặt nhà cái!',
      ],
      winQuotes: [
        'Đấy! Phải thế chứ! Trả thù ngọt ngào +{win} Xu ở {mult}x!! 🥊',
      ],
      lossQuotes: [
        'Cay gấp bội phần rồi!! Thề không đập nát sàn này tao không ngủ! 🔥',
      ],
    },
    'Thầy_Bói_RaCầu': {
      name: 'Thầy_Bói_RaCầu',
      archetype: 'ORACLE',
      badge: '🔮 Soi Cầu',
      badgeColor: 'cyan',
      amounts: [500000, 1200000, 2500000],
      minTarget: 2.20,
      maxTarget: 5.50,
      betQuotes: [
        '🔮 Quẻ bói hôm nay chỉ ra: Sao Hỏa hội tụ, chuyến này bay vượt x3 anh em theo thầy! 🪐',
        'Thầy soi cầu 5 ván gần nhất thấy nhịp rồng bay, đặt {bet} Xu chuẩn chỉ!',
      ],
      winQuotes: [
        'Thầy đã phán thì cấm có sai! Húp +{win} Xu ở {mult}x, mau quỳ xuống lạy thầy đi con! 🔮🙏',
      ],
      lossQuotes: [
        'Quẻ nổ ở {mult}x bị mây mù che khuất, phong thủy hôm nay có chút nhiễu loạn rồi khà khà...',
      ],
    },
    'Đạt_GỡNợ': {
      name: 'Đạt_GỡNợ',
      archetype: 'ORACLE',
      badge: '🔮 Soi Cầu',
      badgeColor: 'cyan',
      amounts: [400000, 1000000, 2000000],
      minTarget: 2.10,
      maxTarget: 4.20,
      betQuotes: [
        'Theo thuật toán cầu bệt, ván này chắc chắn hồi phục x2.5! Vào {bet} Xu!',
      ],
      winQuotes: [
        'Bắt đúng sóng rồi! +{win} Xu trả bớt được cục nợ tháng này, mừng rơi nước mắt 🥹',
      ],
      lossQuotes: [
        'Cầu gãy đôi ở {mult}x rồi các ông ơi, thuật toán gì tầm này nữa 💀',
      ],
    },
    'Dũng_HúpBạc': {
      name: 'Dũng_HúpBạc',
      archetype: 'ORACLE',
      badge: '🔮 Soi Cầu',
      badgeColor: 'cyan',
      amounts: [600000, 1500000, 3500000],
      minTarget: 2.30,
      maxTarget: 5.00,
      betQuotes: [
        'Đã ngửi thấy mùi bạc rơi, ván này {bet} Xu bay đẹp anh em đừng nhảy vội!',
      ],
      winQuotes: [
        'Húp trọn mâm bạc +{win} Xu! Cảm giác ngửi mùi không bao giờ phản bội!',
      ],
      lossQuotes: [
        'Mùi khét lẹt nổ banh xác ở {mult}x rồi, mũi nghẹt cmnr 🤧',
      ],
    },
  };

  const BOT_NAMES = Object.keys(BOT_CONFIGS);
  const botLossStreak: Record<string, number> = {};

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
    botArchetype?: BotArchetype;
    badge?: string;
    badgeColor?: string;
    isWhale?: boolean;
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
    { id: '1', user: 'Huy_CháyTúi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Huy', text: 'Má ván trước vừa vào định gồng x50 thì toang, cay dái thật', time: '14:26', badge: '⚡ Gấp Thếp' },
    { id: '2', user: 'Tuấn_TayTo', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan', text: 'Non thì chịu đi chú em, vừa làm phát 20M xu ấm cật haha', time: '14:27', badge: '🐋 Cá Mập' },
    { id: '3', user: 'Bảo_AllIn', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao', text: 'Ván này bố m tất tay khô máu, đéo tin k lên nổi x10!', time: '14:28', badge: '💎 Gồng Thủ' },
    { id: '4', user: 'Nam_ĂnNon', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nam', text: 'Cứ 1.5x tao nhảy, ăn non cho lành cãi nhau làm đéo gì', time: '14:29', badge: '🛡️ Ăn Non' },
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
    const count = Math.floor(Math.random() * 5) + 7; // 7 to 11 bots
    const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random()).slice(0, count);

    const bots = shuffled.map((name, idx) => {
      const config = BOT_CONFIGS[name];
      let baseAmt = config.amounts[Math.floor(Math.random() * config.amounts.length)];

      // Martingale bot logic: double if lost previous round
      const lossCount = botLossStreak[name] || 0;
      if (config.archetype === 'MARTINGALE' && lossCount > 0) {
        baseAmt = Math.min(baseAmt * Math.pow(2, Math.min(lossCount, 3)), 20000000);
      }

      // Calculate target multiplier based on bot archetype
      const { minTarget, maxTarget } = config;
      let target = parseFloat((minTarget + Math.random() * (maxTarget - minTarget)).toFixed(2));
      if (config.archetype === 'DIAMOND' && Math.random() < 0.25) {
        target = parseFloat((Math.random() * 35 + 15).toFixed(2));
      }

      return {
        id: `bot_${idx}_${Date.now()}`,
        username: name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
        betAmount: baseAmt,
        targetMultiplier: target,
        status: 'PENDING' as const,
        isBot: true,
        botArchetype: config.archetype,
        badge: config.badge,
        badgeColor: config.badgeColor,
        isWhale: config.isWhale,
      };
    });

    // Random bot chat comment when placing bets
    if (Math.random() < 0.65 && bots.length > 0) {
      const talker = bots[Math.floor(Math.random() * bots.length)];
      const config = BOT_CONFIGS[talker.username];
      const betFormatted = talker.betAmount.toLocaleString('vi-VN');

      let comment = '';
      if (config.betQuotes && config.betQuotes.length > 0) {
        const raw = config.betQuotes[Math.floor(Math.random() * config.betQuotes.length)];
        comment = raw.replace('{bet}', betFormatted);
      } else {
        comment = `Đã vào ${betFormatted} Xu! Ván này bay cao nào anh em! 🚀`;
      }

      addServerChatMessage({
        user: talker.username,
        avatar: talker.avatar,
        text: comment,
        badge: talker.badge,
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
          rankExp: 1000,
          rankLevel: 1,
          rankTier: 'BRONZE',
        },
      };
      try {
        fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
      } catch (err) {
        console.error('Failed to write user-database.json:', err);
      }
    }
    if (!userDatabase[userId].stats) {
      userDatabase[userId].stats = {
        totalGames: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        highestMultiplier: 0,
        totalWagered: 0,
        rankExp: 1000,
        rankLevel: 1,
        rankTier: 'BRONZE',
      };
    }
    if (typeof userDatabase[userId].stats.rankExp !== 'number') {
      const wag = userDatabase[userId].stats.totalWagered || 0;
      const prof = Math.max(0, userDatabase[userId].stats.totalProfit || 0);
      userDatabase[userId].stats.rankExp = Math.max(1000, Math.floor(wag / 1000) + Math.floor(prof / 500));
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

  let roundMilestoneFlags = { x5: false, x10: false };

  // Server Loop tick - 100ms
  setInterval(() => {
    const now = Date.now();

    // --- Com Va Cut Game Sync Tick ---
    const comCutElapsedSec = (now - globalComCutState.phaseStartTime) / 1000;
    const comCutRemaining = Math.max(0, Math.ceil(globalComCutState.phaseDuration - comCutElapsedSec));
    globalComCutState.timeLeft = comCutRemaining;

    if (globalComCutState.phase === 'BETTING') {
      // Upgraded tactical bot bets during betting window
      if (comCutRemaining > 5 && Math.random() < 0.22) {
        const bot = COMCUT_BOT_NAMES[Math.floor(Math.random() * COMCUT_BOT_NAMES.length)];
        let side: 'COM' | 'CUT' = Math.random() > 0.48 ? 'COM' : 'CUT';
        
        // Distinct bot personality in Com & Cut
        if (bot === 'Thánh_Ăn_Cơm' || bot === 'Bảo_ThíchCơmSườn' || bot === 'Huy_MêCơmTấm') {
          side = 'COM';
        } else if (bot === 'Húp_Cứt_Cay_Cú' || bot === 'Sơn_ĂnCứtChuyênNghiệp') {
          side = 'CUT';
        }

        const isWhale = bot === 'Nam_BaoSàn' || bot === 'Đại_Gia_Allin';
        const chipOpts = isWhale ? [2000000, 5000000, 10000000] : [50000, 100000, 200000, 500000, 1000000];
        const amt = chipOpts[Math.floor(Math.random() * chipOpts.length)];

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
        if (globalComCutState.recentLiveBets.length > 20) {
          globalComCutState.recentLiveBets.pop();
        }

        // Funny bot chat comments in Com & Cut
        if (Math.random() < 0.15) {
          const comcutComments = [
            `Cầu Cơm đang bệt đẹp anh em theo tôi húp bát phở! 🍚🔥`,
            `Vừa vẩy ${amt.toLocaleString('vi-VN')} Xu vào ${side === 'COM' ? 'Cơm' : 'Cứt'}, đéo tin không về bờ!`,
            `Bẻ cầu sang ${side === 'COM' ? 'Cơm' : 'Cứt'} ván này! Đứa nào theo tao ấm cật! ⚡`,
            `Bát này tao linh cảm Bão x30 đấy, anh em lót nhẹ ít Xu! 🌪️`,
          ];
          addServerChatMessage({
            user: bot,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${bot}`,
            badge: isWhale ? '🐋 CÁ MẬP' : '🍚 TÀI XỈU',
            text: comcutComments[Math.floor(Math.random() * comcutComments.length)],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
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
        roundMilestoneFlags = { x5: false, x10: false };
      }
    } else if (globalGameState.status === 'FLYING') {
      const elapsedSec = (now - globalGameState.startTime) / 1000;
      const currentMult = parseFloat(Math.pow(Math.E, 0.06 * elapsedSec).toFixed(2));

      // In-flight bot excitement milestones
      if (currentMult >= 5.0 && !roundMilestoneFlags.x5) {
        roundMilestoneFlags.x5 = true;
        const flyingDiamond = globalGameState.players.find(p => p.isBot && p.status === 'PENDING' && (p.targetMultiplier || 0) > 5.0);
        if (flyingDiamond) {
          addServerChatMessage({
            user: flyingDiamond.username,
            avatar: flyingDiamond.avatar,
            badge: flyingDiamond.badge,
            text: `VƯỢT 5.0X RỒI ANH EM ƠI! TÀU BAY TÍT VCL, GỒNG TỚI NÓC NÀO! 🚀💎✨`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } else if (currentMult >= 10.0 && !roundMilestoneFlags.x10) {
        roundMilestoneFlags.x10 = true;
        const flyingGong = globalGameState.players.find(p => p.isBot && p.status === 'PENDING' && (p.targetMultiplier || 0) > 10.0);
        if (flyingGong) {
          addServerChatMessage({
            user: flyingGong.username,
            avatar: flyingGong.avatar,
            badge: flyingGong.badge,
            text: `ĐÙ MÁ 10X RỒI!! TIM ĐẬP 200 BPM VẪN GỒNG, HUYỀN THOẠI LÀ ĐÂY! 👑🚀💎`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }

      if (currentMult >= globalGameState.crashPoint) {
        globalGameState.status = 'CRASHED';
        globalGameState.multiplier = globalGameState.crashPoint;
        globalGameState.crashedAt = now;

        const crashedHumanPlayers: PlayerBetServer[] = [];

        globalGameState.players.forEach(p => {
          if (p.status === 'PENDING') {
            p.status = 'CRASHED';
            if (p.isBot) {
              botLossStreak[p.username] = (botLossStreak[p.username] || 0) + 1;
            } else {
              crashedHumanPlayers.push(p);
            }
          } else if (p.isBot && p.status === 'CASHED_OUT') {
            botLossStreak[p.username] = 0;
          }
        });

        // Add crash comment from bot archetype
        const crashMultVal = globalGameState.crashPoint;
        const crashMultStr = crashMultVal.toFixed(2);
        const crashedBots = globalGameState.players.filter(p => p.isBot && p.status === 'CRASHED');
        const randBotPlayer = crashedBots.length > 0
          ? crashedBots[Math.floor(Math.random() * crashedBots.length)]
          : globalGameState.players.find(p => p.isBot);

        if (randBotPlayer) {
          const config = BOT_CONFIGS[randBotPlayer.username];
          let crashQuote = '';
          if (config && config.lossQuotes && config.lossQuotes.length > 0) {
            crashQuote = config.lossQuotes[Math.floor(Math.random() * config.lossQuotes.length)].replace('{mult}', crashMultStr);
          } else {
            crashQuote = `Nổ ở ${crashMultStr}x cay vãi nồi! Ván sau gỡ lại! 🔥`;
          }

          addServerChatMessage({
            user: randBotPlayer.username,
            avatar: randBotPlayer.avatar,
            badge: randBotPlayer.badge,
            text: crashQuote,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }

        // Bots react to human player crash
        if (crashedHumanPlayers.length > 0 && Math.random() < 0.65) {
          const human = crashedHumanPlayers[0];
          const primaryId = human.id.replace('_bet2', '');
          const humanRecord = userDatabase[primaryId];
          const humanName = humanRecord?.username || 'Bạn';

          const sympathyBots = ['Nam_ĂnNon', 'Huy_CháyTúi', 'Tuấn_TayTo', 'ThánhGồng_x100'];
          const reactingSympathyBot = sympathyBots[Math.floor(Math.random() * sympathyBots.length)];
          const sympathyBotConfig = BOT_CONFIGS[reactingSympathyBot];

          const sympathyTexts = [
            `Chia buồn cùng bác @${humanName}, tàu nổ bất ngờ quá, ván sau xé xác nhà cái ra gỡ! 😭🔥`,
            `Bác @${humanName} gồng nghẹt thở mà nổ ở ${crashMultStr}x tiếc vcl, tí làm lại ván mới nhé! 🚀`,
            `Khổ thân bác @${humanName}, bảo chốt sớm như em đi không nghe haha 🤣`,
            `Đừng buồn @${humanName} ơi, cờ bạc ăn nhau về sáng, ván sau tất tay phục thù! ⚡`,
          ];

          setTimeout(() => {
            addServerChatMessage({
              user: reactingSympathyBot,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${reactingSympathyBot}`,
              badge: sympathyBotConfig?.badge,
              text: sympathyTexts[Math.floor(Math.random() * sympathyTexts.length)],
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          }, 800);
        }

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

            // Bot flex in chat when cashing out with archetype quotes
            if (p.isBot && Math.random() < 0.45) {
              const win = Math.floor(p.betAmount * p.targetMultiplier);
              const winStr = win.toLocaleString('vi-VN');
              const multStr = p.targetMultiplier.toFixed(2);
              const config = BOT_CONFIGS[p.username];

              let flexText = '';
              if (config && config.winQuotes && config.winQuotes.length > 0) {
                flexText = config.winQuotes[Math.floor(Math.random() * config.winQuotes.length)]
                  .replace('{win}', winStr)
                  .replace('{mult}', multStr);
              } else {
                flexText = `Húp +${winStr} Xu ở ${multStr}x ngọt nước! 🚀`;
              }

              addServerChatMessage({
                user: p.username,
                avatar: p.avatar,
                badge: p.badge,
                text: flexText,
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

    // Bot admiration reaction when player cashes out big
    if (effectiveMult >= 2.5 || effectiveWin >= 3000000) {
      const uName = userRecord.username || 'Bạn';
      const hypeBots = ['ThánhGồng_x100', 'Tuấn_TayTo', 'Nam_ĂnNon', 'Thầy_Bói_RaCầu', 'Minh_TayVàng'];
      const reactingBot = hypeBots[Math.floor(Math.random() * hypeBots.length)];
      const botConfig = BOT_CONFIGS[reactingBot];

      const hypeTexts = [
        `Vãi chưởng @${uName} chốt quả ${effectiveMult.toFixed(2)}x húp +${effectiveWin.toLocaleString('vi-VN')} Xu đỉnh nóc kịch trần! 👑🔥`,
        `Tay to vcl bác @${uName}! Nhận của em một lạy sư phụ ơi! 🙇‍♂️✨`,
        `Bác @${uName} gồng uy tín thế! Bú đậm +${effectiveWin.toLocaleString('vi-VN')} Xu tối nay bao anh em bia nhé! 🍺💰`,
        `Đẳng cấp thật sự @${uName}, quả đấy gồng nghẹt thở luôn mà vẫn húp ngọt! 🚀`,
      ];

      setTimeout(() => {
        addServerChatMessage({
          user: reactingBot,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${reactingBot}`,
          badge: botConfig?.badge,
          text: hypeTexts[Math.floor(Math.random() * hypeTexts.length)],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        broadcastGameState();
      }, 600);
    }

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

  // Helper to determine rank tier and level from EXP
  function getTierFromExp(exp: number): { tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'LEGEND'; level: number; title: string } {
    if (exp >= 2000000) return { tier: 'LEGEND', level: 13, title: 'Thần Bài Vũ Trụ 👑✨' };
    if (exp >= 1000000) return { tier: 'MASTER', level: 12, title: 'Chiến Thần Vũ Trụ 👑' };
    if (exp >= 550000) return { tier: 'DIAMOND', level: 11, title: 'Gồng Thủ Kim Cương 💎' };
    if (exp >= 360000) return { tier: 'PLATINUM', level: 10, title: 'Chiến Hạm Bất Bại 💠' };
    if (exp >= 260000) return { tier: 'GOLD', level: 9, title: 'Thần Tài Gõ Cửa 🥇' };
    if (exp >= 180000) return { tier: 'GOLD', level: 8, title: 'Đại Gia Sàn Đấu 🥇' };
    if (exp >= 120000) return { tier: 'GOLD', level: 7, title: 'Bậc Thầy Chốt Lời 🥇' };
    if (exp >= 80000) return { tier: 'SILVER', level: 6, title: 'Cao Thủ Cầu Kèo 🥈' };
    if (exp >= 50000) return { tier: 'SILVER', level: 5, title: 'Bậc Thầy Lắc Bát 🥈' };
    if (exp >= 30000) return { tier: 'SILVER', level: 4, title: 'Thợ Săn Tên Lửa 🥈' };
    if (exp >= 15000) return { tier: 'BRONZE', level: 3, title: 'Phi Công Tập Sự 🥉' };
    if (exp >= 5000) return { tier: 'BRONZE', level: 2, title: 'Tân Binh Lão Luyện 🥉' };
    return { tier: 'BRONZE', level: 1, title: 'Tân Binh Vũ Trụ 🥉' };
  }

  // GET /api/game/leaderboard - Top Players Unified Leaderboard (Both Games & Ranks)
  app.get('/api/game/leaderboard', (req, res) => {
    const mockUnifiedBotsLeaderboard = [
      {
        id: 'bot_legend_1',
        username: 'ThánhGồng_x100',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThánhGồng_x100',
        totalProfit: 85200000,
        totalWagered: 120000000,
        highestMultiplier: 104.50,
        wins: 62,
        totalGames: 80,
        rocketProfit: 62000000,
        rocketWins: 42,
        comCutProfit: 23200000,
        comCutWins: 20,
        comCutBaoWins: 3,
        rankTier: 'LEGEND' as const,
        rankLevel: 13,
        rankExp: 2850000,
        vipTitle: 'Bá Chủ Thiên Hà 👑',
        badge: '👑 THẦN THOẠI',
        isBot: true,
      },
      {
        id: 'bot_legend_2',
        username: 'AnhBa_BaoSàn',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnhBa',
        totalProfit: 76800000,
        totalWagered: 190000000,
        highestMultiplier: 42.00,
        wins: 58,
        totalGames: 75,
        rocketProfit: 41800000,
        rocketWins: 31,
        comCutProfit: 35000000,
        comCutWins: 27,
        comCutBaoWins: 7,
        rankTier: 'LEGEND' as const,
        rankLevel: 13,
        rankExp: 2420000,
        vipTitle: 'Trùm Cuối Cá Mập 🐋',
        badge: '👑 THẦN THOẠI',
        isBot: true,
      },
      {
        id: 'bot_master_1',
        username: 'Tuấn_TayTo',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tuan',
        totalProfit: 68400000,
        totalWagered: 110000000,
        highestMultiplier: 38.40,
        wins: 51,
        totalGames: 68,
        rocketProfit: 42400000,
        rocketWins: 33,
        comCutProfit: 26000000,
        comCutWins: 18,
        comCutBaoWins: 4,
        rankTier: 'MASTER' as const,
        rankLevel: 12,
        rankExp: 1840000,
        vipTitle: 'Chiến Thần Vũ Trụ ⚔️',
        badge: '👑 CAO THỦ',
        isBot: true,
      },
      {
        id: 'bot_master_2',
        username: 'Bảo_AllIn',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bao',
        totalProfit: 54100000,
        totalWagered: 85000000,
        highestMultiplier: 45.10,
        wins: 43,
        totalGames: 60,
        rocketProfit: 38100000,
        rocketWins: 28,
        comCutProfit: 16000000,
        comCutWins: 15,
        comCutBaoWins: 2,
        rankTier: 'MASTER' as const,
        rankLevel: 12,
        rankExp: 1310000,
        vipTitle: 'Vua Gồng Lãi 💎',
        badge: '👑 CAO THỦ',
        isBot: true,
      },
      {
        id: 'bot_diamond_1',
        username: 'Nam_ĂnNon',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nam',
        totalProfit: 46200000,
        totalWagered: 72000000,
        highestMultiplier: 1.85,
        wins: 72,
        totalGames: 88,
        rocketProfit: 28000000,
        rocketWins: 44,
        comCutProfit: 18200000,
        comCutWins: 28,
        comCutBaoWins: 1,
        rankTier: 'DIAMOND' as const,
        rankLevel: 11,
        rankExp: 880000,
        vipTitle: 'Thần Rút Sớm 🛡️',
        badge: '💎 KIM CƯƠNG',
        isBot: true,
      },
      {
        id: 'bot_diamond_2',
        username: 'Thần_Cơm_Bão_x30',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ComBao',
        totalProfit: 41800000,
        totalWagered: 55000000,
        highestMultiplier: 8.50,
        wins: 38,
        totalGames: 52,
        rocketProfit: 12800000,
        rocketWins: 14,
        comCutProfit: 29000000,
        comCutWins: 24,
        comCutBaoWins: 8,
        rankTier: 'DIAMOND' as const,
        rankLevel: 11,
        rankExp: 790000,
        vipTitle: 'Thợ Săn Bão x30 🌪️',
        badge: '💎 KIM CƯƠNG',
        isBot: true,
      },
      {
        id: 'bot_diamond_3',
        username: 'Khang_BịpVcl',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Khang',
        totalProfit: 35400000,
        totalWagered: 50000000,
        highestMultiplier: 32.50,
        wins: 34,
        totalGames: 48,
        rocketProfit: 24400000,
        rocketWins: 22,
        comCutProfit: 11000000,
        comCutWins: 12,
        comCutBaoWins: 2,
        rankTier: 'DIAMOND' as const,
        rankLevel: 11,
        rankExp: 650000,
        vipTitle: 'Chiến Thần Tâm Lý 😈',
        badge: '💎 KIM CƯƠNG',
        isBot: true,
      },
      {
        id: 'bot_platinum_1',
        username: 'Phúc_KhôMáu',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Phuc',
        totalProfit: 28400000,
        totalWagered: 45000000,
        highestMultiplier: 28.50,
        wins: 29,
        totalGames: 42,
        rocketProfit: 19400000,
        rocketWins: 19,
        comCutProfit: 9000000,
        comCutWins: 10,
        comCutBaoWins: 1,
        rankTier: 'PLATINUM' as const,
        rankLevel: 10,
        rankExp: 480000,
        vipTitle: 'Sát Thủ Gấp Thếp ⚡',
        badge: '💠 BẠCH KIM',
        isBot: true,
      },
      {
        id: 'bot_platinum_2',
        username: 'Thầy_Bói_RaCầu',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThayBoi',
        totalProfit: 24600000,
        totalWagered: 38000000,
        highestMultiplier: 18.20,
        wins: 27,
        totalGames: 40,
        rocketProfit: 14600000,
        rocketWins: 16,
        comCutProfit: 10000000,
        comCutWins: 11,
        comCutBaoWins: 3,
        rankTier: 'PLATINUM' as const,
        rankLevel: 10,
        rankExp: 420000,
        vipTitle: 'Nhà Tiên Tri Vũ Trụ 🔮',
        badge: '💠 BẠCH KIM',
        isBot: true,
      },
    ];

    const realUsers = Object.values(userDatabase).map((u: any) => {
      const stats = u.stats || {};
      const totalWagered = stats.totalWagered || 0;
      const totalProfit = stats.totalProfit || 0;
      let exp = stats.rankExp;
      if (typeof exp !== 'number') {
        exp = Math.max(1000, Math.floor(totalWagered / 1000) + Math.floor(Math.max(0, totalProfit) / 500));
        stats.rankExp = exp;
      }
      const rankInfo = getTierFromExp(exp);

      return {
        id: u.id,
        username: u.username || 'Khách',
        avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`,
        totalProfit,
        totalWagered,
        highestMultiplier: stats.highestMultiplier || 1.0,
        wins: stats.wins || 0,
        totalGames: stats.totalGames || 0,
        rocketProfit: stats.rocketProfit ?? Math.floor(totalProfit * 0.65),
        rocketWins: stats.rocketWins ?? Math.floor((stats.wins || 0) * 0.6),
        comCutProfit: stats.comCutProfit ?? Math.floor(totalProfit * 0.35),
        comCutWins: stats.comCutWins ?? Math.floor((stats.wins || 0) * 0.4),
        comCutBaoWins: stats.comCutBaoWins || 0,
        rankTier: rankInfo.tier,
        rankLevel: rankInfo.level,
        rankExp: exp,
        vipTitle: stats.vipTitle || rankInfo.title,
        badge: u.discordUser ? 'DISCORD' : rankInfo.tier,
        isBot: false,
      };
    });

    const combined = [...realUsers, ...mockUnifiedBotsLeaderboard].sort((a, b) => b.rankExp - a.rankExp);
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
    const { discordId, userId, balance, stats, username, avatar } = req.body;
    const targetId = discordId || userId;
    if (!targetId) {
      return res.status(400).json({ error: 'Missing discordId or userId' });
    }

    userDatabase[targetId] = {
      ...(userDatabase[targetId] || {}),
      discordId: targetId,
      username: username || userDatabase[targetId]?.username || 'Khách',
      avatar: avatar || userDatabase[targetId]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetId}`,
      balance: typeof balance === 'number' ? balance : (userDatabase[targetId]?.balance || 500000),
      stats: {
        ...(userDatabase[targetId]?.stats || {}),
        ...(stats || {}),
      },
      lastSyncedAt: Date.now(),
    };

    try {
      fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
    } catch (err) {
      console.error('Failed to write user-database.json:', err);
    }

    res.json({ success: true, saved: userDatabase[targetId] });
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
