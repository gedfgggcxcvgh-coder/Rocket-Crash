import React from 'react';
import { RocketSkin, RocketSkinId } from '../types/game';
import { ROCKET_SKINS } from '../utils/skins';
import { X, Check, Lock, Sparkles, Coins } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                GARA TÊN LỬA VŨ TRỤ
              </h2>
              <p className="text-xs text-slate-400">Mở khóa trang phục & vệt khói lửa độc quyền</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Balance Capsule */}
        <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3">
          <span className="text-xs text-slate-400 font-medium">Số dư khả dụng:</span>
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-extrabold text-amber-400 font-mono-numbers">
              {balance.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-bold text-amber-500">Xu</span>
          </div>
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROCKET_SKINS.map(skin => {
            const isUnlocked = unlockedSkins.includes(skin.id) || skin.price === 0;
            const isEquipped = equippedSkin === skin.id;

            return (
              <div
                key={skin.id}
                className={`relative rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  isEquipped
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : isUnlocked
                    ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-800/60 opacity-85'
                }`}
              >
                {/* Skin Icon & Name */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-2xl shrink-0 shadow-inner"
                    style={{
                      boxShadow: `0 0 15px ${skin.trailColorHex[0]}33`,
                    }}
                  >
                    {skin.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm truncate">{skin.name}</h3>
                      {isEquipped && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                          Đang dùng
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-1">{skin.description}</p>
                  </div>
                </div>

                {/* Trail colors preview */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-medium">Vệt lửa:</span>
                  <div className="flex items-center gap-1">
                    {skin.trailColorHex.map((c, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2">
                  {isEquipped ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 cursor-default"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đang Trang Bị</span>
                    </button>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onEquipSkin(skin.id);
                      }}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-indigo-600/25"
                    >
                      Trang Bị Vệt Lửa
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (balance >= skin.price) {
                          sounds.playClaimReward();
                          onBuySkin(skin);
                        } else {
                          sounds.playErrorBeep();
                        }
                      }}
                      disabled={balance < skin.price}
                      className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Mở Khóa ({skin.price.toLocaleString('vi-VN')} Xu)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
