import React, { useState } from 'react';
import { Bot, Copy, Check, Terminal, ExternalLink, Sparkles, Send, BellRing, Play } from 'lucide-react';
import { sounds } from '../utils/audio';

interface DiscordIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
}

export const DiscordIntegrationModal: React.FC<DiscordIntegrationModalProps> = ({
  isOpen,
  onClose,
  userBalance,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'webhook' | 'activity'>('simulator');
  const [copiedCode, setCopiedCode] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  // Simulator state
  const [simMultiplier, setSimMultiplier] = useState(1.0);
  const [simIsFlying, setSimIsFlying] = useState(false);
  const [simCashedOut, setSimCashedOut] = useState(false);
  const [simBet, setSimBet] = useState(500);
  const [simResult, setSimResult] = useState<string | null>(null);

  if (!isOpen) return null;

  // Simulator start
  const handleStartSim = () => {
    sounds.playClick();
    setSimIsFlying(true);
    setSimCashedOut(false);
    setSimMultiplier(1.0);
    setSimResult(null);

    // High-flying crash generator with thrilling early crash variance
    const roll = Math.random();
    let crashAt: number;
    if (roll < 0.06) {
      crashAt = +(Math.random() * 0.20 + 1.08).toFixed(2); // Nổ chớp nhoáng 1.08x - 1.28x
    } else if (roll < 0.22) {
      crashAt = +(Math.random() * 0.55 + 1.30).toFixed(2); // Nổ sớm 1.30x - 1.85x
    } else if (roll < 0.60) {
      crashAt = +(Math.random() * 3.0 + 1.90).toFixed(2);  // Tầm trung 1.90x - 4.90x
    } else if (roll < 0.85) {
      crashAt = +(Math.random() * 10 + 5.0).toFixed(2);    // Bay cao 5x - 15x
    } else if (roll < 0.95) {
      crashAt = +(Math.random() * 30 + 15.0).toFixed(2);   // Quỹ đạo 15x - 45x
    } else {
      crashAt = +(Math.random() * 120 + 50.0).toFixed(2);  // Moonshot 50x - 170x
    }

    let current = 1.0;
    let stepCount = 0;

    const interval = setInterval(() => {
      stepCount++;
      // Smooth logarithmic acceleration
      const delta = current < 3 ? 0.12 : current < 10 ? 0.35 : current < 30 ? 1.2 : 3.5;
      current = +(current + delta).toFixed(2);

      if (current >= crashAt) {
        clearInterval(interval);
        setSimMultiplier(crashAt);
        setSimIsFlying(false);
        setSimResult(`💥 BÙM! Tên lửa đã nổ tại ${crashAt}x! Bạn chưa kịp chốt lời.`);
        sounds.playExplosion();
      } else {
        setSimMultiplier(current);
      }
    }, 280);

    // Save timer ref in case user stops early
    (window as unknown as { __simInterval?: NodeJS.Timeout }).__simInterval = interval;
  };

  const handleSimCashout = () => {
    sounds.playCashoutWin();
    const interval = (window as unknown as { __simInterval?: NodeJS.Timeout }).__simInterval;
    if (interval) clearInterval(interval);
    setSimIsFlying(false);
    setSimCashedOut(true);
    setSimResult(
      `🎉 CHỐT LỜI THÀNH CÔNG! Đã dừng tại ${simMultiplier.toFixed(2)}x, nhận +${Math.floor(
        simBet * simMultiplier
      ).toLocaleString('vi-VN')} Xu!`
    );
  };

  // Sample Discord.js v14 bot code
  const discordBotCode = `// Rocket Crash Discord Bot (Discord.js v14) - Bản Nâng Cấp Bay Cao & Moonshot
// Cài đặt: npm install discord.js
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Hàm tính hệ số nổ ngẫu nhiên (Bay Cao & thót tim với tỷ lệ nổ sớm bất ngờ)
function generateHighFlyerCrash() {
  const r = Math.random();
  if (r < 0.05) return +(1.05 + Math.random() * 0.20).toFixed(2); // 5% nổ chớp nhoáng 1.05x - 1.25x
  if (r < 0.21) return +(1.26 + Math.random() * 0.60).toFixed(2); // 16% nổ sớm 1.26x - 1.86x
  if (r < 0.59) return +(1.88 + Math.random() * 2.90).toFixed(2); // 38% tầm trung đẹp 1.88x - 4.78x
  if (r < 0.82) return +(4.80 + Math.random() * 9.50).toFixed(2); // 23% bay cao 4.8x - 14.3x
  if (r < 0.94) return +(14.5 + Math.random() * 30.0).toFixed(2); // 12% quỹ đạo sâu 14.5x - 44.5x
  return +(45.0 + Math.random() * 200.0).toFixed(2);              // 6% Moonshot 45x - 245x!
}

// Khởi tạo lệnh Slash /crash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'crash') {
    const bet = interaction.options.getInteger('bet') || 100;
    const autoCashout = interaction.options.getNumber('auto') || 0;
    
    // Tạo điểm nổ bí mật
    const crashMultiplier = generateHighFlyerCrash();
    let currentMultiplier = 1.00;
    let cashedOut = false;

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🚀 TÊN LỬA ĐANG BAY (ROCKET CRASH)')
      .setDescription(\`Người chơi: <@\${interaction.user.id}>\\nTiền cược: **\${bet} Xu**\\n\\n**Hệ số: 1.00x** 🌍 Tầng Khí Quyển\`)
      .setFooter({ text: 'Bấm nút [💰 DỪNG LẠI] để Chốt lời trước khi nổ!' });

    const cashoutBtn = new ButtonBuilder()
      .setCustomId(\`cashout_\${interaction.id}\`)
      .setLabel('💰 DỪNG LẠI (CASH OUT)')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(cashoutBtn);

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    // Lắng nghe người chơi bấm nút Dừng lại
    const collector = message.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      cashedOut = true;
      collector.stop('cashed_out');
      const winAmount = Math.floor(bet * currentMultiplier);

      const winEmbed = new EmbedBuilder()
        .setColor(0x10B981)
        .setTitle('🎉 CHỐT LỜI THÀNH CÔNG!')
        .setDescription(\`Chúc mừng <@\${interaction.user.id}> đã dừng tại **\${currentMultiplier.toFixed(2)}x**!\\nThưởng: **+\${winAmount.toLocaleString()} Xu** 🤑\`);

      await i.update({ embeds: [winEmbed], components: [] });
    });

    // Vòng lặp gia tốc tên lửa
    const interval = setInterval(async () => {
      if (cashedOut) {
        clearInterval(interval);
        return;
      }

      // Tăng hệ số mượt mà theo từng tầng
      const step = currentMultiplier < 3 ? 0.15 : currentMultiplier < 10 ? 0.45 : currentMultiplier < 30 ? 1.5 : 3.8;
      currentMultiplier = +(currentMultiplier + step).toFixed(2);

      // Tự động chốt lời nếu có cài đặt
      if (autoCashout > 0 && currentMultiplier >= autoCashout) {
        clearInterval(interval);
        cashedOut = true;
        collector.stop('auto_cashout');
        const winAmount = Math.floor(bet * autoCashout);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x10B981)
              .setTitle('🎉 TỰ ĐỘNG CHỐT LỜI!')
              .setDescription(\`Đạt mốc cài đặt **\${autoCashout}x**! Nhận: **+\${winAmount.toLocaleString()} Xu**\`)
          ],
          components: []
        });
        return;
      }

      // Kiểm tra nổ
      if (currentMultiplier >= crashMultiplier) {
        clearInterval(interval);
        if (!cashedOut) {
          collector.stop('crashed');
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('💥 BÙM! TÊN LỬA ĐÃ NỔ!')
                .setDescription(\`Tên lửa nổ tại **\${crashMultiplier}x**!\\nBạn đã mất **\${bet} Xu**.\`)
            ],
            components: []
          });
        }
        return;
      }

      // Nhãn độ cao vũ trụ
      const tag = currentMultiplier >= 50 ? '🌌 Siêu Không Gian' : currentMultiplier >= 18 ? '🔴 Sao Hỏa' : currentMultiplier >= 6 ? '🌕 Mặt Trăng' : '🌍 Quỹ Đạo';

      // Cập nhật Embed hệ số đang bay
      embed.setDescription(\`Người chơi: <@\${interaction.user.id}>\\nTiền cược: **\${bet} Xu**\\n\\n**Hệ số: \${currentMultiplier.toFixed(2)}x** [\${tag}] 🚀\\nNhận nếu dừng ngay: **+\${Math.floor(bet * currentMultiplier).toLocaleString()} Xu**\`);
      await interaction.editReply({ embeds: [embed] }).catch(() => {});
    }, 1100);
  }
});

client.login('YOUR_DISCORD_BOT_TOKEN');
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(discordBotCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      setWebhookStatus('Vui lòng nhập đúng đường dẫn Webhook của Discord (bắt đầu bằng https://discord.com/api/webhooks/...)');
      return;
    }

    try {
      setWebhookStatus('Đang gửi thông báo thử nghiệm...');
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Rocket Crash Bot',
          avatar_url: 'https://images.unsplash.com/photo-1517976487507-5b3b4b371f66?w=128&auto=format&fit=crop',
          embeds: [
            {
              title: '🚀 THÔNG BÁO JACKPOT TÊN LỬA!',
              description: `Người chơi vừa thắng lớn trong minigame Rocket Crash!\n\n**Hệ số:** \`15.40x\` 🌟\n**Tiền thưởng:** \`+77,000 Xu\``,
              color: 0xf59e0b,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      if (response.ok) {
        setWebhookStatus('✅ Gửi thông báo đến server Discord thành công! Hãy kiểm tra channel của bạn.');
      } else {
        setWebhookStatus(`Lỗi gửi: mã phản hồi ${response.status}`);
      }
    } catch {
      setWebhookStatus('Không thể gửi trực tiếp qua client (có thể do CORS của Discord Webhook). Trong thực tế bạn gọi webhook từ Node.js backend!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Bộ Tích Hợp Discord (Discord Mini Game Hub)
              </h2>
              <p className="text-xs text-slate-400">
                Mô phỏng bot, mã nguồn Discord.js v14 và giải pháp nhúng server
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Đóng
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Mô Phỏng Trực Quan Trên Discord</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Mã Nguồn Bot Discord.js (Copy & Chạy)</span>
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'webhook'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Webhook Thông Báo Thắng Lớn</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-slate-900 text-cyan-400 border-t-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Discord Activity (Chơi trong Voice)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: DISCORD SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Đây là giao diện tương tác thực tế khi thành viên gõ lệnh <code>/crash</code> trong server Discord của bạn!
                </span>
              </div>

              {/* Realistic Discord Chat Mockup */}
              <div className="bg-[#313338] rounded-xl p-4 sm:p-5 border border-slate-700/60 shadow-xl font-sans text-sm">
                {/* Slash command call line */}
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                  <span className="text-indigo-400 font-semibold">@Bạn</span> đã sử dụng lệnh{' '}
                  <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-indigo-300 font-mono">
                    /crash bet:{simBet}
                  </span>
                </div>

                {/* Bot Message Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-base shrink-0 shadow-md">
                    🚀
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">Rocket Crash Bot</span>
                      <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                        BOT
                      </span>
                      <span className="text-[11px] text-slate-400">Hôm nay lúc 14:30</span>
                    </div>

                    {/* Discord Embed */}
                    <div className="bg-[#2b2d31] border-l-4 border-amber-500 rounded-r-lg p-4 space-y-2 max-w-lg shadow">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        🚀 VÒNG BAY TÊN LỬA
                      </h4>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          Người chơi: <span className="text-indigo-300 font-medium">@Bạn</span>
                        </div>
                        <div>
                          Tiền cược: <span className="font-bold text-amber-400">{simBet} Xu</span>
                        </div>
                      </div>

                      {/* Big Multiplier readout */}
                      <div className="py-2 px-3 bg-[#1e1f22] rounded-md border border-slate-700/60 text-center my-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">
                          Hệ số hiện tại
                        </span>
                        <span
                          className={`text-3xl font-black font-mono-numbers ${
                            simIsFlying
                              ? 'text-amber-400 animate-pulse'
                              : simCashedOut
                              ? 'text-emerald-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {simMultiplier.toFixed(2)}x
                        </span>
                        {simIsFlying && (
                          <div className="text-xs text-emerald-400 font-semibold mt-1">
                            Tiền nhận nếu dừng: +{Math.floor(simBet * simMultiplier)} Xu
                          </div>
                        )}
                      </div>

                      {/* Result feedback */}
                      {simResult && (
                        <div
                          className={`p-2 rounded text-xs font-semibold ${
                            simCashedOut
                              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950/50 text-red-300 border border-red-800'
                          }`}
                        >
                          {simResult}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 pt-1">
                        Hệ thống cược tự động hóa với Button Components
                      </div>
                    </div>

                    {/* Discord Button Components */}
                    <div className="mt-3 flex items-center gap-2">
                      {!simIsFlying ? (
                        <button
                          onClick={handleStartSim}
                          className="px-4 py-2 rounded bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Thử Chạy Lệnh /crash</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleSimCashout}
                          className="px-5 py-2.5 rounded bg-[#248046] hover:bg-[#1a6334] text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-1.5 active:scale-95 animate-bounce"
                        >
                          <span>💰 BẤM DỪNG LẠI (CASH OUT) NGAY!</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOT SOURCE CODE */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">
                  File mã nguồn hoàn chỉnh <code>bot.js</code> (Discord.js v14):
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Đã Sao Chép!' : 'Sao Chép Mã'}</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-[340px]">
                  {discordBotCode}
                </pre>
              </div>

              {/* Steps guide */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
                <h5 className="font-bold text-white">Cách đưa bot vào Discord:</h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Truy cập <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Discord Developer Portal</a> và tạo ứng dụng mới.</li>
                  <li>Vào mục <strong>Bot</strong>, copy <strong>Bot Token</strong> và dán vào dòng cuối cùng của mã trên.</li>
                  <li>Bật quyền <code>bot</code> và <code>applications.commands</code> trong mục OAuth2 để mời Bot vào server của bạn.</li>
                  <li>Chạy trên máy tính hoặc VPS của bạn bằng lệnh <code>node bot.js</code>!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOK ALERTS */}
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Tự động gửi thông báo vinh danh người chơi lên channel Discord mỗi khi ai đó thắng lớn hoặc trúng x10+!
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Đường dẫn Webhook Channel Discord:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleTestWebhook}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all whitespace-nowrap active:scale-95"
                  >
                    Gửi Thử
                  </button>
                </div>
                {webhookStatus && (
                  <p className="text-xs text-amber-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {webhookStatus}
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-white">Cách lấy Discord Webhook URL:</div>
                <p>1. Trong server Discord, bấm vào Cài đặt Kênh (biểu tượng bánh răng) của channel muốn nhận tin.</p>
                <p>2. Chọn mục <strong>Tích hợp (Integrations)</strong> &rarr; <strong>Tạo Webhook (Webhooks)</strong>.</p>
                <p>3. Sao chép URL Webhook và dán vào ô bên trên.</p>
              </div>
            </div>
          )}

          {/* TAB 4: DISCORD ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-bold text-base text-white">Chơi Trực Tiếp Trong Kênh Thoại (Discord Activities)</h4>
              <p>
                Discord hiện nay cho phép nhúng trực tiếp trang web game vào Kênh Thoại (Voice Channel) thông qua tính năng <strong>Discord Embedded App SDK</strong>.
              </p>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h5 className="font-bold text-indigo-300">Các bước thực hiện:</h5>
                <p>
                  1. Đăng ký ứng dụng tại Discord Developer Portal và chọn mục <strong>Activities</strong>.
                </p>
                <p>
                  2. Cài đặt URL của ứng dụng web này vào phần <strong>URL Mapping</strong> của Discord Activity.
                </p>
                <p>
                  3. Các thành viên trong server chỉ cần bấm vào biểu tượng <strong>Tên lửa (Hoạt động)</strong> trong kênh voice để cùng nhau chơi game, ngắm tên lửa bay và trò chuyện bằng giọng nói thời gian thực!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Rocket Crash Discord Toolkit v1.0 • Hỗ trợ Node.js & Discord.js
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
