import React from 'react';
import { HelpCircle, X, Rocket, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Hướng Dẫn & Luật Chơi Rocket Crash</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="flex items-start gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">1. Đặt cược trước khi bay</h4>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Khi đồng hồ đếm ngược (5.0s), chọn số tiền cược và bấm nút <strong>"Đặt cược"</strong>. Bạn cũng có thể cài đặt <strong>Tự động chốt lời</strong> (ví dụ 2.00x).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">2. Tên lửa cất cánh & Hệ số nhân</h4>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Tên lửa bay càng cao thì hệ số nhân càng tăng nhanh (1.00x &rarr; 2x &rarr; 10x &rarr; 50x...). Số tiền thưởng tiềm năng sẽ bằng <code>Tiền Cược × Hệ Số</code>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">3. Dừng lại đúng lúc để nhận tiền</h4>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Tên lửa có thể <strong>phát nổ bất kỳ lúc nào</strong>! Nếu bạn bấm <strong>"DỪNG LẠI & CHỐT LỜI (Cash Out)"</strong> trước khi nổ, bạn nhận toàn bộ tiền thắng. Nếu tên lửa nổ trước khi dừng, bạn mất số tiền cược đó.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">4. Minh bạch & Không dùng tiền thật</h4>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Đây là minigame giải trí mô phỏng. Sử dụng hệ số ngẫu nhiên thuật toán Provably Fair mã hoá SHA-256 hoàn toàn minh bạch. Hết Xu có thể bấm nhận thêm +5.000 Xu miễn phí bất kỳ lúc nào.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors"
          >
            Đã Hiểu, Chơi Ngay!
          </button>
        </div>
      </div>
    </div>
  );
};
