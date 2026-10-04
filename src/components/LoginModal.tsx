import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, ShieldAlert, KeyRound, Clock, X } from 'lucide-react';
import {
  verifyCredentials,
  recordFailedLogin,
  saveCurrentSession,
  recordEmployeeLogin,
} from '../utils/authStorage';
import { AuthSession, EmployeeLoginLog } from '../types/inventory';

interface Props {
  isOpen: boolean;
  onLoginSuccess: (session: AuthSession, loginLog: EmployeeLoginLog) => void;
  onAlertGenerated?: () => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onLoginSuccess, onAlertGenerated, onClose }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPass = password.trim();

    if (!cleanName || !cleanPass) {
      setErrorMsg('يرجى إدخال الاسم والرمز السري.');
      setIsSubmitting(false);
      return;
    }

    const res = verifyCredentials(cleanName, cleanPass);

    if (res.success && res.session) {
      saveCurrentSession(res.session);
      const loginLog = recordEmployeeLogin(res.session);
      onLoginSuccess(res.session, loginLog);
    } else {
      const reason = res.errorReason || 'الاسم أو الرمز السري غير مطابق';
      setErrorMsg(reason);
      recordFailedLogin(cleanName, cleanPass, reason);
      if (onAlertGenerated) onAlertGenerated();
    }

    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1b1034] to-[#120822] border-2 border-purple-600/60 p-6 sm:p-7 shadow-2xl shadow-purple-950/90 text-white text-right"
          dir="rtl"
        >
          {/* Logo / Header */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-full bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-700 to-fuchsia-600 border border-purple-400/40 shadow-xl shadow-purple-600/40">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Iavenda</span>
            </h2>
            <p className="text-xs text-purple-300/70 mt-1">
              يرجى إدخال الاسم والرمز الخاص للدخول إلى المستودع
            </p>

            {/* 12-hour session notice */}
            <div className="inline-flex items-center gap-1.5 mt-2 bg-purple-950/70 border border-purple-800/60 px-3 py-1 rounded-full text-[11px] text-purple-300">
              <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>مدة تسجيل الدخول 12 ساعة ويلزم بعدها إعادة الدخول</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-purple-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل الاسم"
                  className="w-full bg-[#1e123a] text-white placeholder-purple-300/60 text-sm rounded-xl pr-10 pl-3 py-3 border border-purple-800 focus:outline-none focus:border-purple-400 font-bold"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-purple-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل الرمز"
                  className="w-full bg-[#1e123a] text-white placeholder-purple-300/60 text-sm rounded-xl pr-10 pl-3 py-3 border border-purple-800 focus:outline-none focus:border-purple-400 font-bold"
                />
              </div>
            </div>

            {/* Error Message with alert warning */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/70 text-rose-200 text-xs flex items-start gap-2 shadow-inner"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <div className="font-bold">{errorMsg}</div>
                  <div className="text-[10px] text-rose-300/80 mt-0.5">
                    تم إرسال إشعار أمني فوري إلى المشرف بمحاولة الدخول هذه.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-black text-white bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 active:scale-98 transition shadow-lg shadow-purple-600/40 border border-purple-400/50 cursor-pointer"
            >
              تسجيل الدخول للمستودع
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
