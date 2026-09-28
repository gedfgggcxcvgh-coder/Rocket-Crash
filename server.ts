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
  const PORT = process.env.PORT || 3000;

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
    const amounts = [1000, 2500, 5000, 10000, 20000, 35000, 50000, 100000];
    return shuffled.map((name, idx) => {
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
        status: 'PENDING',
        isBot: true,
      };
    });
  }

  globalGameState.players = generateServerBots();

  let sseClients: Array<{ res: express.Response }> = [];

  function getUserRecord(userId: string, username?: string) {
    if (!userDatabase[userId]) {
      userDatabase[userId] = {
        id: userId,
        username: username || 'Khách',
        balance: 1000000,
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
    return userDatabase[userId];
  }

  function broadcastGameState() {
    const userBalances: Record<string, number> = {};
    Object.keys(userDatabase).forEach(uId => {
      userBalances[uId] = userDatabase[uId].balance ?? 1000000;
    });

    const payload = JSON.stringify({
      ...globalGameState,
      chat: globalChatMessages,
      userBalances,
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
        const crashMultStr = globalGameState.crashPoint.toFixed(2);
        const randBot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        const crashSlangs = [
          `Vcl nổ ở ${crashMultStr}x, bay cụ nó tiền cược rồi! 😭`,
          `Nổ sớm thế nhở ${crashMultStr}x, cay vãi nồi!`,
          `Hahaha may mà chốt sớm, nhường các bố gồng tiếp!`,
          `BÙM ở ${crashMultStr}x!! Bị nuốt sạch cắc nào rồi!`,
        ];
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

            // Optional bot flex in chat
            if (p.isBot && Math.random() < 0.15) {
              const win = Math.floor(p.betAmount * p.targetMultiplier);
              addServerChatMessage({
                user: p.username,
                avatar: p.avatar,
                text: `Húp +${win.toLocaleString('vi-VN')} Xu ở ${p.targetMultiplier.toFixed(2)}x, ấm cật rồi ae! 🤑`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }

            if (!p.isBot && userDatabase[p.id]) {
              const win = Math.floor(p.betAmount * p.targetMultiplier);
              userDatabase[p.id].balance = (userDatabase[p.id].balance || 0) + win;
              try {
                fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
              } catch {}
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
      serverTime: Date.now(),
    });
  });

  // GET /api/game/stream - Real-time SSE Game Stream
  app.get('/api/game/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ ...globalGameState, serverTime: Date.now() })}\n\n`);

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

  // POST /api/game/bet - Place a bet
  app.post('/api/game/bet', (req, res) => {
    const { userId, username, avatar, betAmount, targetMultiplier } = req.body;
    if (!userId || !betAmount || betAmount <= 0) {
      return res.status(400).json({ error: 'Cược không hợp lệ.' });
    }

    if (globalGameState.status !== 'COUNTDOWN') {
      return res.status(400).json({ error: 'Rất tiếc! Đợt cược ván này đã kết thúc.' });
    }

    if (!userDatabase[userId]) {
      userDatabase[userId] = {
        id: userId,
        username: username || 'Khách',
        balance: 1000000,
      };
    }

    if ((userDatabase[userId].balance || 0) < betAmount) {
      return res.status(400).json({ error: 'Không đủ số dư Xu.' });
    }
    userDatabase[userId].balance -= betAmount;
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
    res.json({ success: true, newBalance: userDatabase[userId]?.balance });
  });

  // POST /api/game/cashout - Cashout bet
  app.post('/api/game/cashout', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    if (globalGameState.status !== 'FLYING') {
      return res.status(400).json({ error: 'Tên lửa không trong trạng thái bay.' });
    }

    const player = globalGameState.players.find(p => p.id === userId);
    if (!player || player.status !== 'PENDING') {
      return res.status(400).json({ error: 'Không tìm thấy cược mở.' });
    }

    const currentMult = globalGameState.multiplier;
    player.status = 'CASHED_OUT';
    player.cashoutMultiplier = currentMult;

    const winAmount = Math.floor(player.betAmount * currentMult);

    if (userDatabase[userId]) {
      userDatabase[userId].balance = (userDatabase[userId].balance || 0) + winAmount;
      try {
        fs.writeFileSync(USER_DB_FILE_PATH, JSON.stringify(userDatabase, null, 2));
      } catch {}
    }

    broadcastGameState();
    res.json({
      success: true,
      cashoutMultiplier: currentMult,
      winAmount,
      newBalance: userDatabase[userId]?.balance,
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
      <html>
        <head>
          <title>Xác Thực Discord...</title>
          <meta charset="utf-8" />
          <style>
            body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 420px; }
            .spinner { width: 42px; height: 42px; border: 3px solid #334155; border-top-color: #5865f2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.2rem; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .avatar { width: 72px; height: 72px; border-radius: 50%; border: 3px solid #22c55e; margin: 0 auto 1rem; }
          </style>
        </head>
        <body>
          <div class="card" id="app-box">
            <div class="spinner"></div>
            <h3 style="margin:0;color:#5865f2;">Đang kết nối tài khoản Discord...</h3>
            <p style="color:#94a3b8;font-size:13px;margin-top:0.5rem;">Vui lòng chờ trong giây lát</p>
          </div>
          <script>
            async function handleDiscordAuth() {
              const hash = window.location.hash;
              const search = window.location.search;
              
              // 1. Client-Side Implicit Token Flow (Bypasses server IP rate limits 100%)
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

                  const realUserProfile = {
                    id: discordUser.id,
                    username: discordUser.username,
                    globalName: discordUser.global_name || discordUser.username,
                    discriminator: discordUser.discriminator || '0',
                    avatar: avatarUrl,
                    email: discordUser.email || '',
                    bannerColor: discordUser.banner_color || '#5865F2',
                  };

                  document.getElementById('app-box').innerHTML = \`
                    <img src="\${avatarUrl}" class="avatar" />
                    <h2 style="margin:0 0 0.5rem 0;color:#22c55e;">🎉 Thành Công!</h2>
                    <p style="color:#cbd5e1;margin:0;font-size:14px;">Đã xác thực @\${realUserProfile.globalName}</p>
                  \`;

                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'OAUTH_AUTH_SUCCESS',
                      provider: 'discord',
                      user: realUserProfile
                    }, '*');
                    setTimeout(() => window.close(), 700);
                  } else {
                    window.location.href = '/';
                  }
                  return;
                } catch (e) {
                  console.error(e);
                  document.getElementById('app-box').innerHTML = \`
                    <h3 style="color:#ef4444;">❌ Lỗi truy vấn API Discord</h3>
                    <p style="color:#94a3b8;font-size:13px;">\${e.message || 'Lỗi không xác định'}</p>
                  \`;
                  return;
                }
              }

              document.getElementById('app-box').innerHTML = \`
                <h3 style="color:#ef4444;">❌ Không tìm thấy Token xác thực</h3>
                <p style="color:#94a3b8;font-size:13px;">Vui lòng đóng cửa sổ và thử bấm đăng nhập lại.</p>
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

  // GET /api/user/:discordId - Retrieve synced user data
  app.get('/api/user/:discordId', (req, res) => {
    const { discordId } = req.params;
    const userData = userDatabase[discordId];
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userData);
  });

  // Vite Dev Server middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Rocket Crash Server running at http://localhost:${PORT}`);
  });
}

startServer();
