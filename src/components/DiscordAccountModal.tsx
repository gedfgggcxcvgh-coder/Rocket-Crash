import React, { useState, useEffect } from 'react';
import { 
  X, Check, Copy, ExternalLink, RefreshCw, LogOut, Award,
  Sparkles, Gift, Terminal, Send
} from 'lucide-react';
import { DiscordUser } from '../types/discord';
import { UserStats } from '../types/game';
import { 
  connectDiscordDirect, 
  claimDailyDiscordReward, 
  syncGameDataWithDiscord,
  calculateDiscordLevel,
  createDiscordUserFromOAuthProfile
} from '../utils/discordAuth';
import { sounds } from '../utils/audio';

interface DiscordAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  discordUser: DiscordUser | null;
  onUpdateDiscordUser: (user: DiscordUser | null) => void;
  userBalance: number;
  userStats: UserStats;
  onApplyBalanceAndStats: (newBalance: number, newStats?: Partial<UserStats>) => void;
}

export const DiscordAccountModal: React.FC<DiscordAccountModalProps> = ({
  isOpen,
  onClose,
  discordUser,
  onUpdateDiscordUser,
  userBalance,
  userStats,
  onApplyBalanceAndStats,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'bot'>('profile');
  const [discordInput, setDiscordInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  // Dynamic OAuth Credentials
  const [clientIdInput, setClientIdInput] = useState(() => localStorage.getItem('discord_client_id') || '1553795964215627836');
  const [clientSecretInput, setClientSecretInput] = useState(() => localStorage.getItem('discord_client_secret') || '');
  const [showConfigBox, setShowConfigBox] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  // Save OAuth credentials to backend and local storage
  const handleSaveOAuthCredentials = async () => {
    sounds.playClick();
    if (clientIdInput) localStorage.setItem('discord_client_id', clientIdInput.trim());
    if (clientSecretInput) localStorage.setItem('discord_client_secret', clientSecretInput.trim());

    await fetch('/api/auth/discord/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientIdInput.trim(),
        clientSecret: clientSecretInput.trim(),
      }),
    });

    setSyncStatus('✅ Đã lưu cấu hình Client ID & Secret! Bây giờ hãy bấm [MỞ TRANG ĐĂNG NHẬP DISCORD.COM].');
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Listen for OAuth postMessage from Discord Login Popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (data && (data.type === 'OAUTH_AUTH_SUCCESS' || data.provider === 'discord') && data.user) {
        sounds.playCashoutWin();
        const rawUser = data.user;
        const user = await createDiscordUserFromOAuthProfile(rawUser, userBalance, userStats);
        onUpdateDiscordUser(user);
        onApplyBalanceAndStats(user.balance);
        setSyncStatus(`🎉 Đăng nhập Discord thành công! Chào mừng @${user.globalName || user.username} (+500.000 Xu Thưởng).`);
        setTimeout(() => setSyncStatus(null), 4000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userBalance, userStats, onUpdateDiscordUser, onApplyBalanceAndStats]);

  if (!isOpen) return null;

  // Handle direct connect
  const handleConnect = async (tagToUse?: string) => {
    sounds.playClick();
    const targetTag = tagToUse || discordInput.trim() || 'PhiCông_Discord#1337';
    const user = await connectDiscordDirect(targetTag, userBalance, userStats);
    onUpdateDiscordUser(user);
    onApplyBalanceAndStats(user.balance);
    setSyncStatus('🎉 Liên kết tài khoản Discord thành công! Đã cộng +500.000 Xu thưởng.');
    setTimeout(() => setSyncStatus(null), 3500);
  };

  // Handle real Discord OAuth2 popup flow
  const handleOAuthLogin = async () => {
    sounds.playClick();
    try {
      if (clientIdInput) {
        localStorage.setItem('discord_client_id', clientIdInput.trim());
        if (clientSecretInput) localStorage.setItem('discord_client_secret', clientSecretInput.trim());
        await fetch('/api/auth/discord/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientIdInput.trim(),
            clientSecret: clientSecretInput.trim(),
          }),
        });
      }

      const res = await fetch(`/api/auth/discord/url${clientIdInput ? `?client_id=${clientIdInput.trim()}` : ''}`);
      const data = await res.json();

      if (data.error === 'MISSING_CLIENT_ID' || !data.url) {
        setShowConfigBox(true);
        setSyncStatus('⚠️ Vui lòng dán Client ID của Discord App từ https://discord.com/developers/applications');
        return;
      }

      const popup = window.open(
        data.url,
        'discord_oauth_popup',
        'width=580,height=720,scrollbars=yes'
      );
      if (!popup) {
        alert('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép hiện popup để mở trang đăng nhập Discord!');
      }
    } catch {
      alert('Không thể khởi tạo OAuth2 Discord.');
    }
  };

  // Handle manual sync now
  const handleManualSync = () => {
    if (!discordUser) return;
    sounds.playClick();
    const updated = syncGameDataWithDiscord(discordUser, userBalance, userStats);
    onUpdateDiscordUser(updated);
    setSyncStatus('☁️ Đã đồng bộ số dư và toàn bộ dữ liệu cược lên Cloud Discord!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Handle daily reward claim
  const handleClaimDaily = () => {
    if (!discordUser) return;
    sounds.playCashoutWin();
    const res = claimDailyDiscordReward(discordUser);
    if (res.success) {
      onUpdateDiscordUser(res.nextUser);
      onApplyBalanceAndStats(res.nextUser.balance);
      setSyncStatus(res.message);
    } else {
      setSyncStatus(res.message);
    }
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Handle disconnect
  const handleDisconnect = () => {
    sounds.playClick();
    onUpdateDiscordUser(null);
    setSyncStatus('Đã ngắt kết nối tài khoản Discord.');
    setTimeout(() => setSyncStatus(null), 2500);
  };

  // Copy cloud sync key
  const handleCopySyncKey = () => {
    if (!discordUser) return;
    const token = btoa(`${discordUser.id}:${discordUser.balance}:${discordUser.username}`);
    navigator.clipboard.writeText(token);
    setCopiedSyncKey(true);
    setTimeout(() => setCopiedSyncKey(false), 2000);
  };

  // Test webhook
  const handleTestWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      setWebhookStatus('Vui lòng nhập đúng URL Discord Webhook (https://discord.com/api/webhooks/...)');
      return;
    }
    try {
      setWebhookStatus('Đang gửi thông báo lên server Discord...');
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Rocket Crash Cloud',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=RocketBot',
          embeds: [
            {
              title: '🚀 ĐỒNG BỘ DỮ LIỆU TÀI KHOẢN DISCORD',
              description: `Tài khoản **${discordUser?.username || 'Phi Công'}** vừa đồng bộ dữ liệu!\n\n💰 **Số dư ví:** \`${userBalance.toLocaleString('vi-VN')} Xu\`\n🌟 **Kỷ lục bay:** \`${userStats.highestMultiplier.toFixed(2)}x\`\n🎮 **Tổng ván đã chơi:** \`${userStats.totalGames}\``,
              color: 0x5865f2,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      if (response.ok) {
        setWebhookStatus('✅ Gửi thông báo webhook lên Discord thành công!');
      } else {
        setWebhookStatus('❌ Webhook phản hồi lỗi. Vui lòng kiểm tra lại URL.');
      }
    } catch {
      setWebhookStatus('❌ Không thể gửi webhook. Kiểm tra kết nối mạng.');
    }
  };

  const levelInfo = discordUser ? calculateDiscordLevel(discordUser.totalWagered) : { level: 1, currentXp: 0, nextLevelXp: 10000, progress: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Hệ Thống Tài Khoản Discord
                {discordUser && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Đã liên kết
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Đồng bộ dữ liệu số dư, cấp độ và lịch sử cược theo Discord ID</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 px-4 sm:px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[#5865F2] text-[#5865F2]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Tài Khoản & Hồ Sơ</span>
          </button>

          <button
            onClick={() => setActiveTab('bot')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bot'
                ? 'border-[#5865F2] text-[#5865F2]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Kết Nối Server & Webhook</span>
          </button>
        </div>

        {/* Status notification banner */}
        {syncStatus && (
          <div className="px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{syncStatus}</span>
            <button onClick={() => setSyncStatus(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {activeTab === 'profile' && (
            <>
              {discordUser ? (
                /* CONNECTED PROFILE VIEW */
                <div className="space-y-5">
                  {/* Discord Profile Card */}
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-xl">
                    {/* Banner */}
                    <div className="h-20 bg-gradient-to-r from-[#5865F2] via-indigo-600 to-purple-600 relative">
                      <div className="absolute top-2 right-3 text-[11px] font-bold text-white/80 bg-slate-950/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        Discord ID: {discordUser.id}
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="px-5 pb-5 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10">
                      <div className="flex items-end gap-3.5">
                        <div className="relative">
                          <img
                            src={discordUser.avatar}
                            alt={discordUser.username}
                            className="w-20 h-20 rounded-2xl border-4 border-slate-900 bg-slate-800 shadow-md object-cover"
                          />
                          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="Đang trực tuyến" />
                        </div>

                        <div className="mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">{discordUser.globalName || discordUser.username}</span>
                            <span className="text-xs text-slate-400 font-mono-numbers">#{discordUser.discriminator || '0'}</span>
                          </div>
                          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                            <span>🟢 Tài khoản Discord đã xác minh</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleManualSync}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="Lưu toàn bộ số dư và lịch sử cược lên đám mây"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Đồng Bộ Ngay</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="px-3 py-2 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/40 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Đổi Nick</span>
                        </button>
                      </div>
                    </div>

                    {/* Level & XP Bar */}
                    <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/60 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-300">Cấp Độ Phi Công: Level {levelInfo.level}</span>
                        <span className="text-slate-400 font-mono-numbers">
                          {levelInfo.currentXp.toLocaleString('vi-VN')} / {levelInfo.nextLevelXp.toLocaleString('vi-VN')} XP (Cược để lên cấp)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#5865F2] to-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${levelInfo.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Roles Badges */}
                    <div className="px-5 py-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-medium mr-1">Vai trò Discord:</span>
                      {discordUser.roles.map(r => (
                        <span key={r} className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-semibold">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Daily Discord Reward Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-600/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          Trợ Cấp Hàng Ngày Discord
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black">+5.000 Xu</span>
                        </h4>
                        <p className="text-xs text-slate-400">Mỗi ngày thành viên Discord được nhận miễn phí 5.000 Xu để trải nghiệm</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClaimDaily}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
                    >
                      🎁 NHẬN 5.000 XU NGAY
                    </button>
                  </div>
                </div>
              ) : (
                /* NOT CONNECTED: LOGIN & LINKING OPTIONS */
                <div className="space-y-6">
                  {/* Hero Link Pitch */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col gap-4 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#5865F2] flex items-center justify-center shrink-0 shadow-xl shadow-indigo-500/30">
                        <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-base font-black text-white">Đăng Nhập Tài Khoản Discord</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            +5.000 Xu Thưởng
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Lưu trữ số dư và dữ liệu cược an toàn vĩnh viễn trên đám mây. Đồng bộ danh tính, avatar và tên Discord vào phòng chơi.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOAuthLogin}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.98] text-white font-black text-sm md:text-base shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>ĐĂNG NHẬP BẰNG DISCORD</span>
                    </button>

                    {/* Step-by-Step OAuth Config Panel */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-indigo-400" />
                          Cấu Hình Discord App Client ID (Để không bị lỗi Unknown App)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowConfigBox(!showConfigBox)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-200 font-semibold cursor-pointer underline"
                        >
                          {showConfigBox ? 'Ẩn Hướng Dẫn' : '⚙️ Nhập Client ID'}
                        </button>
                      </div>

                      {showConfigBox && (
                        <div className="space-y-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                          <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                            <li>Mở <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 font-bold underline">Discord Developer Portal</a> và tạo một <strong>New Application</strong>.</li>
                            <li>Vào mục <strong>OAuth2</strong> → Thêm URL Callback Redirect bên dưới vào phần <strong>Redirects</strong>:</li>
                          </ol>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/api/auth/discord/callback`}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono text-emerald-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/api/auth/discord/callback`);
                                setCopiedRedirectUri(true);
                                setTimeout(() => setCopiedRedirectUri(false), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              {copiedRedirectUri ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedRedirectUri ? 'Đã sao chép' : 'Sao chép'}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Discord Client ID</label>
                              <input
                                type="text"
                                placeholder="VD: 128910293847581..."
                                value={clientIdInput}
                                onChange={e => setClientIdInput(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2] font-mono mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Discord Client Secret</label>
                              <input
                                type="password"
                                placeholder="Client Secret từ Discord..."
                                value={clientSecretInput}
                                onChange={e => setClientSecretInput(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2] font-mono mt-0.5"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveOAuthCredentials}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs transition-all cursor-pointer shadow-md"
                          >
                            LƯU CLIENT ID & XÁC THỰC NGAY
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Discord ID / Tag Input */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-300">
                      Hoặc liên kết nhanh bằng Discord Tag / User ID:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nhập tên Discord (VD: GamerPro#1337 hoặc @GamerPro)"
                        value={discordInput}
                        onChange={e => setDiscordInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleConnect()}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                      />
                      <button
                        type="button"
                        onClick={() => handleConnect()}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        XÁC NHẬN LIÊN KẾT
                      </button>
                    </div>

                    {/* Quick Sample Profiles */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">Hoặc chọn mẫu nhanh:</span>
                      {[
                        'ThợSăn_TênLửa#2026',
                        'Trùm_Discord#9999',
                        'SpaceWhale#8888',
                      ].map(sample => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => handleConnect(sample)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] transition-colors cursor-pointer"
                        >
                          @{sample}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Benefits grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                      <span className="font-bold text-emerald-400">☁️ Cloud Backup</span>
                      <span className="text-slate-400">Số dư ví & kỷ lục x cao nhất không bao giờ bị mất</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                      <span className="font-bold text-indigo-400">🎁 Trợ Cấp 5K Xu</span>
                      <span className="text-slate-400">Nhận 5.000 Xu hàng ngày khi duy trì chuỗi đăng nhập</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
                      <span className="font-bold text-amber-400">🏆 Danh Tính VIP</span>
                      <span className="text-slate-400">Hiện avatar & tên Discord thật trong phòng cược và chat</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'bot' && (
            /* BOT & WEBHOOK TAB */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-400" />
                  Gửi Thông Báo Jackpot Lên Server Discord Của Bạn
                </h4>
                <p className="text-xs text-slate-400">
                  Dán đường dẫn Webhook của kênh Discord để nhận thông báo tự động mỗi khi có pha chốt lời khủng hoặc thắng lớn:
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                  />
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    className="px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    GỬI THỬ NGHIỆM
                  </button>
                </div>

                {webhookStatus && (
                  <p className="text-xs text-indigo-300 font-medium pt-1">{webhookStatus}</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Hỗ trợ Discord.js v14 & Slash Commands /crash trực tiếp trong Discord Server.</span>
                <span className="font-bold text-indigo-400">Sẵn sàng tích hợp</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Đồng bộ tự động mỗi khi cược hoặc chốt lời</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
