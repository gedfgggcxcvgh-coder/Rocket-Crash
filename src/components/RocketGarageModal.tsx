import React, { useState, useEffect, useRef } from 'react';
import { RocketSkin, RocketSkinId } from '../types/game';
import { ROCKET_SKINS, getSkinById } from '../utils/skins';
import { X, Check, Lock, Sparkles, Coins, Flame, Shield, Eye } from 'lucide-react';
import { sounds } from '../utils/audio';

interface RocketGarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  equippedSkin: RocketSkinId;
  unlockedSkins: RocketSkinId[];
  onEquipSkin: (skinId: RocketSkinId) => void;
  onBuySkin: (skin: RocketSkin) => void;
}

export const RocketGarageModal: React.FC<RocketGarageModalProps> = ({
  isOpen,
  onClose,
  balance,
  equippedSkin,
  unlockedSkins,
  onEquipSkin,
  onBuySkin,
}) => {
  const [selectedPreviewSkin, setSelectedPreviewSkin] = useState<RocketSkinId>(equippedSkin);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreviewSkin(equippedSkin);
    }
  }, [isOpen, equippedSkin]);

  // Live Preview Canvas Loop inside Garage Modal
  useEffect(() => {
    if (!isOpen) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      const w = canvas.width;
      const h = canvas.height;

      // Dark space background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Star dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 37 + t * 40) % w;
        const sy = (i * 19) % h;
        ctx.beginPath();
        ctx.arc(w - sx, sy, (i % 3) * 0.5 + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floating Rocket Position
      const rx = w * 0.5;
      const ry = h * 0.55 + Math.sin(t * 2) * 6;
      const currentSkin = getSkinById(selectedPreviewSkin);

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(-0.15 + Math.sin(t * 1.5) * 0.05);

      // Draw custom flame trail based on skin
      const flameLen = 30 + Math.random() * 12;
      const flameGrad = ctx.createLinearGradient(-20, 0, -20 - flameLen, 0);
      flameGrad.addColorStop(0, '#FFFFFF');
      flameGrad.addColorStop(0.3, currentSkin.trailColorHex[0] || '#F97316');
      flameGrad.addColorStop(0.8, currentSkin.trailColorHex[1] || '#EF4444');
      flameGrad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(-18, -6);
      ctx.lineTo(-20 - flameLen, 0);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.shadowColor = currentSkin.trailColorHex[0] || '#F97316';
      ctx.shadowBlur = 18;
      ctx.fill();

      // Simple vector silhouette/icon inside canvas
      ctx.fillStyle = currentSkin.glowColor || '#FFFFFF';
      ctx.shadowColor = currentSkin.glowColor || '#FFFFFF';
      ctx.shadowBlur = 12;
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentSkin.icon, 0, 0);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, selectedPreviewSkin]);

  if (!isOpen) return null;

  const activePreviewData = getSkinById(selectedPreviewSkin);
  const isPreviewUnlocked = unlockedSkins.includes(selectedPreviewSkin) || activePreviewData.price === 0;
  const isPreviewEquipped = equippedSkin === selectedPreviewSkin;
  const canAffordPreview = balance >= activePreviewData.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 p-4 sm:p-5 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl sm:rounded-2xl text-amber-400">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                GARA TÊN LỬA VŨ TRỤ
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Trang bị skin & vệt lửa độc quyền</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 flex flex-col gap-4">
          {/* Top Live Preview Banner */}
          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 relative overflow-hidden shadow-inner shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 z-10 w-full sm:w-auto">
              {/* Live Canvas Box */}
              <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shrink-0 shadow-lg">
                <canvas ref={previewCanvasRef} width={144} height={96} className="w-full h-full block" />
                <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-slate-950/80 text-[8px] sm:text-[9px] text-slate-300 font-bold border border-slate-800 flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5 text-cyan-400" />
                  <span>XEM TRƯỚC</span>
                </div>
              </div>

              {/* Skin Info */}
              <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-white truncate">{activePreviewData.name}</span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    {activePreviewData.rarity || 'HIẾM'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1 sm:line-clamp-2">{activePreviewData.description}</p>
                <p className="text-[10px] sm:text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Hiệu ứng: {activePreviewData.effectDescription || 'Vệt lửa độc quyền'}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Button inside Preview Banner (for desktop) */}
            <div className="hidden sm:block z-10 w-full sm:w-auto shrink-0">
              {isPreviewEquipped ? (
                <button
                  disabled
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-default"
                >
                  <Check className="w-4 h-4" />
                  <span>Đang Trang Bị</span>
                </button>
              ) : isPreviewUnlocked ? (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onEquipSkin(selectedPreviewSkin);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Trang Bị Ngay
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (canAffordPreview) {
                      sounds.playClaimReward();
                      onBuySkin(activePreviewData);
                    } else {
                      sounds.playErrorBeep();
                    }
                  }}
                  disabled={!canAffordPreview}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Mở Khóa ({activePreviewData.price.toLocaleString('vi-VN')} Xu)</span>
                </button>
              )}
            </div>
          </div>

          {/* User Balance Capsule */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl sm:rounded-2xl px-3.5 py-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Số dư khả dụng:</span>
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-extrabold text-amber-400 font-mono-numbers">
                {balance.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-bold text-amber-500">Xu</span>
            </div>
          </div>

          {/* Skins Grid with Direct On-Card Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
            {ROCKET_SKINS.map(skin => {
              const isUnlocked = unlockedSkins.includes(skin.id) || skin.price === 0;
              const isEquipped = equippedSkin === skin.id;
              const isSelected = selectedPreviewSkin === skin.id;
              const canAfford = balance >= skin.price;

              return (
                <div
                  key={skin.id}
                  onClick={() => setSelectedPreviewSkin(skin.id)}
                  className={`relative rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-amber-500/80 bg-slate-950 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : isEquipped
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isUnlocked
                      ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-800/60'
                  }`}
                >
                  {/* Skin Icon & Name */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-2xl shrink-0 shadow-inner"
                      style={{
                        boxShadow: `0 0 15px ${skin.glowColor || skin.trailColorHex[0]}33`,
                      }}
                    >
                      {skin.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-white text-sm truncate">{skin.name}</h3>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-slate-800 text-amber-400 border border-slate-700 shrink-0">
                          {skin.rarity || 'HIẾM'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-1 line-clamp-2">
                        {skin.description}
                      </p>
                    </div>
                  </div>

                  {/* Trail colors preview + Direct Card Action Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-medium">Vệt:</span>
                      <div className="flex items-center gap-1">
                        {skin.trailColorHex.map((c, idx) => (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Direct Button on Card */}
                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                      {isEquipped ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Đang Dùng</span>
                        </span>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setSelectedPreviewSkin(skin.id);
                            onEquipSkin(skin.id);
                          }}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
                        >
                          Trang Bị
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            setSelectedPreviewSkin(skin.id);
                            if (canAfford) {
                              sounds.playClaimReward();
                              onBuySkin(skin);
                            } else {
                              sounds.playErrorBeep();
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 text-[11px] font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Mở Khóa ({skin.price.toLocaleString('vi-VN')} Xu)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ALWAYS-VISIBLE STICKY BOTTOM ACTION BAR (ESPECIALLY FOR MOBILE) */}
        <div className="shrink-0 bg-slate-950 border-t border-slate-800 p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xl z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">{activePreviewData.icon}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {activePreviewData.name}
              </span>
              <span className="text-[10px] font-bold font-mono-numbers text-amber-400 truncate">
                {isPreviewEquipped
                  ? 'Đang sử dụng'
                  : isPreviewUnlocked
                  ? 'Đã sở hữu'
                  : `${activePreviewData.price.toLocaleString('vi-VN')} Xu`}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {isPreviewEquipped ? (
              <div className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-extrabold text-xs flex items-center gap-1.5 shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ĐANG DÙNG</span>
              </div>
            ) : isPreviewUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onEquipSkin(selectedPreviewSkin);
                }}
                className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <span>TRANG BỊ NGAY</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAffordPreview}
                onClick={() => {
                  if (canAffordPreview) {
                    sounds.playClaimReward();
                    onBuySkin(activePreviewData);
                  } else {
                    sounds.playErrorBeep();
                  }
                }}
                className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm transition-all active:scale-95 shadow-xl shadow-amber-500/30 cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {canAffordPreview
                    ? `MỞ KHÓA (${activePreviewData.price.toLocaleString('vi-VN')} XU)`
                    : 'KHÔNG ĐỦ XU'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
