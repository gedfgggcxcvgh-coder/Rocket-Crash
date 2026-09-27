import React, { useState } from 'react';
import { RoundHistory } from '../types/game';
import { calculateMultiplier } from '../utils/provablyFair';
import { ShieldCheck, X, Copy, Check } from 'lucide-react';

interface ProvablyFairModalProps {
  round: RoundHistory | null;
  onClose: () => void;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({ round, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [verifySeed, setVerifySeed] = useState(round?.seed || '');
  const [calculatedResult, setCalculatedResult] = useState<number | null>(
    round ? round.multiplier : null
  );

  if (!round) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestVerify = () => {
    if (!verifySeed) return;
    const res = calculateMultiplier(verifySeed, round.mode || 'HIGH_FLYER');
    setCalculatedResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Kiểm tra tính minh bạch (Provably Fair)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs">
          <p className="text-slate-400">
            Hệ số phát nổ của mỗi ván đấu được xác định trước bởi thuật toán mã hóa SHA-256 ngẫu nhiên và không thể bị can thiệp sau khi vòng bắt đầu.
          </p>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Mã vòng đấu:</span>
              <span className="font-mono-numbers font-bold text-white">#{round.id.slice(-6)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Hệ số nổ thực tế:</span>
              <span className="font-mono-numbers font-bold text-amber-400 text-sm">
                {round.multiplier.toFixed(2)}x
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mã băm SHA-256 (Hash):</span>
                <button
                  onClick={() => handleCopy(round.hash)}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                {round.hash}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-slate-400">Chuỗi hạt giống ngẫu nhiên (Seed):</span>
              <p className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                {round.seed}
              </p>
            </div>
          </div>

          {/* Interactive verifier */}
          <div className="pt-2">
            <span className="font-semibold text-slate-300 block mb-1">
              Tự nhập Seed để đối chiếu kết quả:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={verifySeed}
                onChange={e => setVerifySeed(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-xs text-white"
                placeholder="Dán seed vào đây"
              />
              <button
                onClick={handleTestVerify}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs whitespace-nowrap"
              >
                Kiểm tra
              </button>
            </div>
            {calculatedResult !== null && (
              <div className="mt-2 p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-emerald-300 text-xs flex items-center justify-between">
                <span>Hệ số tính toán từ seed:</span>
                <span className="font-mono-numbers font-bold text-sm">
                  {calculatedResult.toFixed(2)}x
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
