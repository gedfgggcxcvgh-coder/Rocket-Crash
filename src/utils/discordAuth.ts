import { DiscordUser, DiscordCloudSave } from '../types/discord';
import { UserStats } from '../types/game';

const DISCORD_USER_KEY = 'rocket_crash_discord_user';
const DISCORD_CLOUD_REGISTRY_KEY = 'rocket_crash_discord_cloud_registry';

/**
 * Get saved Discord user from storage
 */
export function getSavedDiscordUser(): DiscordUser | null {
  try {
    const raw = localStorage.getItem(DISCORD_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save Discord user to storage and update cloud registry
 */
export function saveDiscordUser(user: DiscordUser): void {
  try {
    localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(user));
    
    // Save to global cloud registry (simulated cross-device backend)
    const registry = getCloudRegistry();
    registry[user.id] = {
      discordId: user.id,
      username: user.globalName || user.username,
      savedAt: Date.now(),
      balance: user.balance,
      stats: {
        totalGames: user.totalGames,
        wins: user.wins,
        losses: user.losses,
        totalProfit: user.totalProfit,
        highestMultiplier: user.highestMultiplier,
        totalWagered: user.totalWagered,
      },
      syncToken: btoa(`${user.id}:${user.balance}:${Date.now()}`),
    };
    localStorage.setItem(DISCORD_CLOUD_REGISTRY_KEY, JSON.stringify(registry));
  } catch (err) {
    console.error('Error saving discord user:', err);
  }
}

/**
 * Remove Discord user link (Logout)
 */
export function removeDiscordUser(): void {
  localStorage.removeItem(DISCORD_USER_KEY);
}

/**
 * Get cloud registry of all accounts
 */
export function getCloudRegistry(): Record<string, DiscordCloudSave> {
  try {
    const raw = localStorage.getItem(DISCORD_CLOUD_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Calculate level based on XP / total wagered
 */
export function calculateDiscordLevel(wagered: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  const xpPerLevel = 10000;
  const level = Math.max(1, Math.floor(wagered / xpPerLevel) + 1);
  const currentXp = wagered % xpPerLevel;
  const nextLevelXp = xpPerLevel;
  const progress = Math.min(100, Math.floor((currentXp / nextLevelXp) * 100));
  return { level, currentXp, nextLevelXp, progress };
}

/**
 * Generate default Discord roles based on gameplay achievements
 */
export function getDiscordRoles(stats: { balance: number; highestMultiplier: number; totalWagered: number }): string[] {
  const roles: string[] = ['🚀 Thành Viên Discord'];
  if (stats.balance >= 50000 || stats.totalWagered >= 100000) {
    roles.push('💎 Tay To High Roller');
  }
  if (stats.highestMultiplier >= 20) {
    roles.push('🌌 Thợ Săn Sao Hỏa x20+');
  }
  if (stats.highestMultiplier >= 50) {
    roles.push('👑 Moonshot Master');
  }
  if (stats.balance >= 200000) {
    roles.push('🐳 Space Whale VIP');
  }
  return roles;
}

/**
 * Create or sync Discord User from OAuth profile payload (supports Server API cross-device sync)
 */
export async function createDiscordUserFromOAuthProfile(
  rawProfile: { id: string; username: string; globalName?: string; avatar: string; email?: string; bannerColor?: string },
  currentBalance: number,
  currentStats: UserStats
): Promise<DiscordUser> {
  const discordId = rawProfile.id || Math.floor(100000000000000000 + Math.random() * 900000000000000000).toString();
  
  // Try fetching existing profile from central server first
  let serverSave: any = null;
  try {
    const res = await fetch(`/api/user/${discordId}`);
    if (res.ok) {
      serverSave = await res.json();
    }
  } catch {}

  const registry = getCloudRegistry();
  const existingSave = serverSave || registry[discordId];

  // If user already exists on server, restore their balance; if new user, grant +500,000 Xu testing bonus!
  const newBalance = existingSave ? existingSave.balance : (Math.max(currentBalance, 10000) + 500000);
  const totalWagered = existingSave && existingSave.stats ? existingSave.stats.totalWagered : currentStats.totalWagered;
  const { level, currentXp } = calculateDiscordLevel(totalWagered);

  const user: DiscordUser = {
    id: discordId,
    username: rawProfile.username,
    globalName: rawProfile.globalName || rawProfile.username,
    discriminator: '0',
    avatar: rawProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${discordId}&backgroundColor=5865f2`,
    email: rawProfile.email || '',
    bannerColor: rawProfile.bannerColor || '#5865F2',
    roles: getDiscordRoles({
      balance: newBalance,
      highestMultiplier: existingSave && existingSave.stats ? existingSave.stats.highestMultiplier : currentStats.highestMultiplier,
      totalWagered,
    }),
    level,
    xp: currentXp,
    linkedAt: Date.now(),
    lastSyncedAt: Date.now(),
    balance: newBalance,
    totalGames: existingSave && existingSave.stats ? existingSave.stats.totalGames : currentStats.totalGames,
    wins: existingSave && existingSave.stats ? existingSave.stats.wins : currentStats.wins,
    losses: existingSave && existingSave.stats ? existingSave.stats.losses : currentStats.losses,
    totalProfit: existingSave && existingSave.stats ? existingSave.stats.totalProfit : currentStats.totalProfit,
    highestMultiplier: existingSave && existingSave.stats ? existingSave.stats.highestMultiplier : currentStats.highestMultiplier,
    totalWagered,
    streakDays: 1,
    lastDailyClaim: Date.now(),
  };

  saveDiscordUser(user);

  // Sync with central server database
  try {
    await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: user.id,
        username: user.globalName,
        avatar: user.avatar,
        balance: user.balance,
        stats: {
          totalGames: user.totalGames,
          wins: user.wins,
          losses: user.losses,
          totalProfit: user.totalProfit,
          highestMultiplier: user.highestMultiplier,
          totalWagered: user.totalWagered,
        },
      }),
    });
  } catch {}

  return user;
}

/**
 * Connect directly with Discord ID or Tag
 */
export async function connectDiscordDirect(
  input: string,
  currentBalance: number,
  currentStats: UserStats
): Promise<DiscordUser> {
  const cleanInput = input.trim();
  const isNumericId = /^\d{16,20}$/.test(cleanInput);
  const discordId = isNumericId ? cleanInput : Math.floor(100000000000000000 + Math.random() * 900000000000000000).toString();
  
  // Try fetching existing profile from central server first
  let serverSave: any = null;
  try {
    const res = await fetch(`/api/user/${discordId}`);
    if (res.ok) {
      serverSave = await res.json();
    }
  } catch {}

  const registry = getCloudRegistry();
  const existingSave = serverSave || registry[discordId];

  const username = isNumericId ? `DiscordUser_${cleanInput.slice(-4)}` : cleanInput.replace(/^@/, '');
  const avatarSeed = isNumericId ? discordId : username;
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=5865f2`;

  const newBalance = existingSave ? existingSave.balance : (Math.max(currentBalance, 10000) + 500000); // +500,000 Xu testing bonus!
  const totalWagered = existingSave && existingSave.stats ? existingSave.stats.totalWagered : currentStats.totalWagered;
  const { level, currentXp } = calculateDiscordLevel(totalWagered);

  const user: DiscordUser = {
    id: discordId,
    username: username,
    globalName: username,
    discriminator: '0',
    avatar: avatarUrl,
    bannerColor: '#5865F2',
    roles: getDiscordRoles({
      balance: newBalance,
      highestMultiplier: existingSave && existingSave.stats ? existingSave.stats.highestMultiplier : currentStats.highestMultiplier,
      totalWagered,
    }),
    level,
    xp: currentXp,
    linkedAt: Date.now(),
    lastSyncedAt: Date.now(),
    balance: newBalance,
    totalGames: existingSave && existingSave.stats ? existingSave.stats.totalGames : currentStats.totalGames,
    wins: existingSave && existingSave.stats ? existingSave.stats.wins : currentStats.wins,
    losses: existingSave && existingSave.stats ? existingSave.stats.losses : currentStats.losses,
    totalProfit: existingSave && existingSave.stats ? existingSave.stats.totalProfit : currentStats.totalProfit,
    highestMultiplier: existingSave && existingSave.stats ? existingSave.stats.highestMultiplier : currentStats.highestMultiplier,
    totalWagered,
    streakDays: 1,
    lastDailyClaim: Date.now(),
  };

  saveDiscordUser(user);

  try {
    await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: user.id,
        username: user.globalName,
        avatar: user.avatar,
        balance: user.balance,
        stats: {
          totalGames: user.totalGames,
          wins: user.wins,
          losses: user.losses,
          totalProfit: user.totalProfit,
          highestMultiplier: user.highestMultiplier,
          totalWagered: user.totalWagered,
        },
      }),
    });
  } catch {}

  return user;
}

/**
 * Claim daily Discord allowance (+500.000 Xu)
 */
export function claimDailyDiscordReward(user: DiscordUser): { success: boolean; reward: number; nextUser: DiscordUser; message: string } {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = now - (user.lastDailyClaim || 0);

  if (diff < ONE_DAY_MS) {
    const hoursLeft = Math.ceil((ONE_DAY_MS - diff) / (60 * 60 * 1000));
    return {
      success: false,
      reward: 0,
      nextUser: user,
      message: `Bạn đã nhận trợ cấp hôm nay rồi. Vui lòng quay lại sau ${hoursLeft} giờ nữa!`,
    };
  }

  const reward = 500000;
  const nextUser: DiscordUser = {
    ...user,
    balance: user.balance + reward,
    lastDailyClaim: now,
    streakDays: (user.streakDays || 1) + 1,
    lastSyncedAt: now,
  };

  saveDiscordUser(nextUser);

  fetch('/api/user/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discordId: nextUser.id,
      username: nextUser.globalName,
      avatar: nextUser.avatar,
      balance: nextUser.balance,
    }),
  }).catch(() => {});

  return {
    success: true,
    reward,
    nextUser,
    message: `Nhận thành công +${reward.toLocaleString('vi-VN')} Xu trợ cấp Discord hàng ngày! 🔥`,
  };
}

/**
 * Sync current game stats with Discord account
 */
export function syncGameDataWithDiscord(
  user: DiscordUser,
  balance: number,
  stats: UserStats
): DiscordUser {
  const { level, currentXp } = calculateDiscordLevel(stats.totalWagered);
  const updatedUser: DiscordUser = {
    ...user,
    balance,
    totalGames: stats.totalGames,
    wins: stats.wins,
    losses: stats.losses,
    totalProfit: stats.totalProfit,
    highestMultiplier: Math.max(user.highestMultiplier || 0, stats.highestMultiplier),
    totalWagered: stats.totalWagered,
    level,
    xp: currentXp,
    roles: getDiscordRoles({
      balance,
      highestMultiplier: Math.max(user.highestMultiplier || 0, stats.highestMultiplier),
      totalWagered: stats.totalWagered,
    }),
    lastSyncedAt: Date.now(),
  };

  saveDiscordUser(updatedUser);

  fetch('/api/user/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discordId: updatedUser.id,
      username: updatedUser.globalName,
      avatar: updatedUser.avatar,
      balance,
      stats,
    }),
  }).catch(() => {});

  return updatedUser;
}
