import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check, X } from 'lucide-react';

export interface DeductPairTarget {
  shoeId: string;
  colorId: string;
  shoeCode: string;
  shoeName?: string;
  colorName: string;
  size: number | string;
  currentQuantity: number;
  quantityToDeduct?: number;
}

interface Props {
  target: DeductPairTarget | null;
  adminName: string;
  isSupervisor?: boolean;
  onConfirm: (target: DeductPairTarget) => void;
  onCancel: () => void;
}

export const ConfirmDeductPairModal: React.FC<Props> = ({
  target,
  adminName,
  isSupervisor = false,
  onConfirm,
  onCancel,
}) => {
  if (!target) return null;

  const deductAmount = target.quantityToDeduct && target.quantityToDeduct > 0 ? target.quantityToDeduct : 1;
  const newQuantity = Math.max(0, target.currentQuantity - deductAmount);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1e0f35] to-[#120822] border-2 border-fuchsia-500/70 p-5 sm:p-6 shadow-2xl shadow-purple-950 text-white text-right"
          dir="rtl"
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-3.5 left-3.5 p-1.5 text-purple-300 hover:text-white rounded-full bg-purple-900/40 hover:bg-purple-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon & Title */}
          <div className="text-center mb-4">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-fuchsia-600 border border-fuchsia-400/40 shadow-xl shadow-rose-600/40">
              <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white">
              تأكيد حذف / سحب قطعة من المخزون
            </h3>
            <p className="text-xs text-purple-300/80 mt-1">
              {deductAmount === 1
                ? 'هل أنت متأكد من حذف / سحب قطعة واحدة (زوج واحد) من هذا القياس؟'
                : `هل أنت متأكد من حذف / سحب (${deductAmount} قطع) من هذا القياس؟`}
            </p>
          </div>

          {/* Details Card */}
          <div className="my-4 p-4 rounded-2xl bg-[#180c2e] border border-purple-800/70 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
              <span className="text-purple-300">كود القطعة:</span>
              <strong className="font-mono text-sm text-white bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-700">
                {target.shoeCode}
              </strong>
            </div>

            {target.shoeName && (
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                <span className="text-purple-300">اسم الحذاء:</span>
                <strong className="text-purple-100">{target.shoeName}</strong>
              </div>
            )}

            <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
              <span className="text-purple-300">اللون:</span>
              <strong className="text-fuchsia-300 font-bold">{target.colorName}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
              <span className="text-purple-300">المقاس:</span>
              <strong className="text-amber-300 font-black text-sm">مقاس {target.size}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
              <span className="text-purple-300">العدد المراد سحبه / حذفه:</span>
              <strong className="text-rose-300 font-black text-sm">{deductAmount} قطعة</strong>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-purple-300">الكمية المتبقية بعد السحب:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 line-through">{target.currentQuantity} قطعة</span>
                <span className="text-purple-300">←</span>
                <strong className="text-emerald-300 font-black text-sm">
                  {newQuantity} قطعة
                </strong>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-purple-300/70 border-t border-purple-900/40 flex items-center justify-between">
              <span>الموظف المنفذ:</span>
              <span className="font-mono text-amber-300 font-bold">{adminName}</span>
            </div>
          </div>

          {/* Action Buttons: Green for Confirm, Red for Cancel */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              onClick={() => onConfirm(target)}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-98 shadow-lg shadow-emerald-700/40 border border-emerald-400/50 transition cursor-pointer text-sm"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>نعم (تأكيد الحذف)</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-black text-white bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 active:scale-98 shadow-lg shadow-rose-900/50 border border-rose-400/40 transition cursor-pointer text-sm"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>لا (إلغاء)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
