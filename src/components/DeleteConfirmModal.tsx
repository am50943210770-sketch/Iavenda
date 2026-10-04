import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check, X, Trash2 } from 'lucide-react';
import { DeleteConfirmTarget } from '../types/inventory';

interface Props {
  target: DeleteConfirmTarget | null;
  adminName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<Props> = ({
  target,
  adminName,
  onConfirm,
  onCancel,
}) => {
  if (!target) return null;

  const isColor = target.type === 'color';
  const isSize = target.type === 'size';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-[#1e1035] to-[#120822] border-2 border-rose-500/60 p-6 text-center shadow-2xl shadow-purple-950/90"
          dir="rtl"
        >
          {/* Close button top corner */}
          <button
            onClick={onCancel}
            className="absolute top-3.5 left-3.5 p-1.5 text-purple-300 hover:text-white rounded-full bg-purple-900/40 hover:bg-purple-800 transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Warning Icon */}
          <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-950/50">
            <AlertTriangle className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>

          {/* Main Question ("اجعل تاكيد عند حذف قطعه") */}
          <h3 className="text-xl font-black text-white mb-1.5">
            {isSize
              ? 'تأكيد حذف هذا القياس من القطعة'
              : isColor
              ? 'تأكيد حذف هذا اللون من القطعة'
              : 'تأكيد حذف القطعة من المستودع'}
          </h3>
          <p className="text-xs text-purple-300/80 mb-4">
            هل أنت متأكد من الحذف؟ سيتم تحديث المخزون فوراً عند جميع المستخدمين
          </p>

          {/* Centered Details Box */}
          <div className="mx-auto my-4 rounded-2xl bg-[#160b29] border border-purple-700/50 p-4 text-right space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
              <span className="text-purple-300">كود القطعة:</span>
              <span className="text-sm font-black font-mono text-white bg-purple-900/80 px-2.5 py-0.5 rounded-lg border border-purple-500/40">
                {target.code}
              </span>
            </div>

            {target.shoeName && (
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                <span className="text-purple-300">اسم الموديل:</span>
                <span className="font-bold text-purple-100">{target.shoeName}</span>
              </div>
            )}

            {target.colorName && (
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                <span className="text-purple-300">اللون:</span>
                <span className="text-fuchsia-300 font-black">{target.colorName}</span>
              </div>
            )}

            {target.size !== undefined && (
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                <span className="text-purple-300">المقاس المراد حذفه:</span>
                <span className="text-amber-300 font-black">قياس {target.size}</span>
              </div>
            )}

            {target.sizesSummary && (
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-purple-300">الكمية / القياسات:</span>
                <span className="text-rose-300 font-bold">{target.sizesSummary}</span>
              </div>
            )}

            {adminName && (
              <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between text-[11px] text-purple-300/70">
                <span>الموظف المنفذ:</span>
                <strong className="text-amber-300">{adminName}</strong>
              </div>
            )}
          </div>

          <p className="text-[11px] text-purple-300/75 mb-5">
            {isSize
              ? 'سيتم حذف هذا القياس من اللون المحدد وتسجيل العملية.'
              : isColor
              ? 'سيتم إزالة هذا اللون وجميع قياساته من الكود وإشعار المشرف.'
              : 'سيتم حذف القطعة بالكامل بجميع ألوانها وقياساتها من المستودع وإشعار المشرف.'}
          </p>

          {/* Action Buttons: YES (Confirm Delete) and NO (Cancel) */}
          <div className="grid grid-cols-2 gap-3.5 mt-2">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3 px-4 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:scale-95 transition-all shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-1.5 border border-emerald-400/50 cursor-pointer text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>نعم، تأكيد الحذف</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-xl font-black text-white bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 active:scale-95 transition-all shadow-lg shadow-rose-950/60 flex items-center justify-center gap-1.5 border border-rose-400/40 cursor-pointer text-sm"
            >
              <X className="w-4 h-4" />
              <span>لا، إلغاء</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
