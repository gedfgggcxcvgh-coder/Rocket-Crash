export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar: string;
  email?: string;
  bannerColor?: string;
  roles: string[];
  level: number;
  xp: number;
  linkedAt: number;
  lastSyncedAt: number;
  // Shared game account data tied to this Discord ID
  balance: number;
  totalGames: number;
  wins: number;
  losses: number;
  totalProfit: number;
  highestMultiplier: number;
  totalWagered: number;
  streakDays: number;
  lastDailyClaim: number;
}

export interface DiscordCloudSave {
  discordId: string;
  username: string;
  savedAt: number;
  balance: number;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    totalProfit: number;
    highestMultiplier: number;
    totalWagered: number;
  };
  syncToken: string;
}
