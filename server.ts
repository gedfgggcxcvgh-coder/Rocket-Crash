import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.join(__dirname, 'discord-oauth-config.json');

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

  // In-memory user database store for Discord linked accounts
  const userDatabase: Record<string, any> = {};

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
      response_type: 'code',
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
    const { code, error } = req.query;

    if (error || !code) {
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

    const clientId = discordAuthConfig.clientId || process.env.DISCORD_CLIENT_ID || '1553795964215627836';
    const clientSecret = discordAuthConfig.clientSecret || process.env.DISCORD_CLIENT_SECRET || '';
    
    const appUrl = getAppUrl(req);
    const redirectUri = `${appUrl}/api/auth/discord/callback`;

    try {
      if (!clientId || !clientSecret) {
        throw new Error('Chưa thiết lập Client Secret cho ứng dụng Discord OAuth2.');
      }

      // 1. Exchange OAuth code for tokens with official Discord API
      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: String(code),
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        console.error('Discord Token Exchange Error:', tokenData);
        const detailMsg = tokenData.error_description || tokenData.error || JSON.stringify(tokenData);
        throw new Error(`Discord API Báo Lỗi: ${detailMsg}`);
      }

      // 2. Fetch official user profile from Discord API @me endpoint
      const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const discordUser = await userRes.json();

      if (!userRes.ok) {
        throw new Error('Không thể lấy thông tin người dùng từ Discord');
      }

      // Format official Discord CDN Avatar URL
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.id) % 5}.png`;

      const realUserProfile = {
        id: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name || discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: avatarUrl,
        email: discordUser.email || '',
        bannerColor: discordUser.banner_color || '#5865F2',
      };

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Discord OAuth Success</title>
            <style>
              body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
              .avatar { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 1rem; border: 3px solid #5865f2; }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="${realUserProfile.avatar}" class="avatar" />
              <h2 style="margin:0 0 0.5rem 0;">🎉 Đăng nhập Discord thành công!</h2>
              <p style="color:#94a3b8;margin:0;">Đã xác thực tài khoản <strong>@${realUserProfile.globalName}</strong> (${realUserProfile.id})</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  provider: 'discord',
                  user: ${JSON.stringify(realUserProfile)}
                }, '*');
                setTimeout(() => window.close(), 600);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Discord OAuth Error</title>
            <style>
              body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; border: 1px solid #ef4444; max-width: 480px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2 style="color: #ef4444; margin-top: 0;">❌ Lỗi Xác Thực Discord API</h2>
              <p style="color: #cbd5e1; font-size: 14px;">${err.message}</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 1rem;">Vui lòng kiểm tra lại Client Secret ứng dụng Discord của bạn.</p>
            </div>
          </body>
        </html>
      `);
    }
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
