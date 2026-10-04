import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Trash2, CheckCheck, Clock, UserX, KeyRound } from 'lucide-react';
import { SecurityAlert } from '../types/inventory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alerts: SecurityAlert[];
  onClearAlerts: () => void;
}

export const SecurityAlertsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  alerts,
  onClearAlerts,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl my-auto rounded-3xl bg-[#140b25] border-2 border-rose-600/60 shadow-2xl shadow-rose-950/80 flex flex-col max-h-[85vh] overflow-hidden text-white"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#320f1e] via-[#230b19] to-[#140b25] border-b border-rose-900/50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-inner">
                <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-100 flex items-center gap-2">
                  <span>إشعارات الأمان للمشرفين</span>
                  <span className="text-xs bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-700/60 text-rose-300">
                    {alerts.length} محاولة
                  </span>
                </h3>
                <p className="text-xs text-rose-300/70">
                  تنبيه فوري بمحاولات الدخول الخاطئة للاسم أو الرمز
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-rose-300 hover:text-white rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh] scrollbar-thin scrollbar-thumb-purple-700">
            {alerts.length === 0 ? (
              <div className="text-center py-10 bg-purple-950/20 rounded-2xl border border-purple-900/40 p-4">
                <CheckCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-purple-200 font-bold text-sm">
                  لا توجد محاولات دخول خاطئة مسجلة حالياً
                </p>
                <p className="text-xs text-purple-400/70 mt-1">
                  نظام الأمان نشط، وسيصلك إشعار فوري عند إدخال اسم أو رمز غير صحيح.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-2xl bg-[#200b19] border border-rose-900/60 hover:border-rose-600/60 transition shadow-md"
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-rose-950 mb-2">
                    <span className="font-black text-rose-300 flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                      <span>محاولة دخول فاشلة</span>
                    </span>
                    <span className="text-[11px] text-purple-300/70 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{new Date(alert.timestamp).toLocaleString('ar-IQ')}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300/80">الاسم المدخل:</span>
                      <strong className="text-white bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                        {alert.attemptedName || '(فارغ)'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-purple-300/80">الرمز المدخل:</span>
                      <code className="text-rose-200 font-mono bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900">
                        {alert.attemptedCode}
                      </code>
                    </div>

                    <div className="text-[11px] text-rose-300/80 pt-1">
                      السبب: {alert.reason}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 bg-[#190d30] border-t border-purple-900/50 flex items-center justify-between text-xs">
            {alerts.length > 0 ? (
              <button
                onClick={onClearAlerts}
                className="flex items-center gap-1.5 text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 px-3 py-1.5 rounded-xl border border-rose-800/60 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح سجل الإشعارات</span>
              </button>
            ) : (
              <span className="text-purple-400/60">الحماية مفعلة على مدار الساعة</span>
            )}

            <button
              onClick={onClose}
              className="bg-purple-800/70 hover:bg-purple-700 text-white font-bold px-5 py-1.5 rounded-xl border border-purple-600/40 transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
