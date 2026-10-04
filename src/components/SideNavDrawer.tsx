import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Clock,
  Sparkles,
  ChevronLeft,
  Lock,
  ShoppingBag,
  AlertTriangle,
  StickyNote,
  UserCheck,
} from 'lucide-react';
import { AuthSession, OrderPost, SecurityAlert } from '../types/inventory';
import { SESSION_DURATION_MS } from '../utils/authStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSession: AuthSession;
  orders: OrderPost[];
  securityAlerts: SecurityAlert[];
  lowStockModelsCount?: number;
  lowStockSizesCount?: number;
  unreadLoginsCount?: number;
  totalLoginsCount?: number;
  onOpenOrdersGroup: () => void;
  onOpenLavendaNotes?: () => void;
  onOpenDeductionsTracker: () => void;
  onOpenDailySalesReport?: () => void;
  onOpenLowStockAlerts?: () => void;
  onOpenEmployeeLogins?: () => void;
  onOpenSecurityAlerts: () => void;
  onLogout: () => void;
}

export const SideNavDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSession,
  orders,
  securityAlerts,
  lowStockModelsCount = 0,
  lowStockSizesCount = 0,
  unreadLoginsCount = 0,
  totalLoginsCount = 0,
  onOpenOrdersGroup,
  onOpenLavendaNotes,
  onOpenDeductionsTracker,
  onOpenDailySalesReport,
  onOpenLowStockAlerts,
  onOpenEmployeeLogins,
  onOpenSecurityAlerts,
  onLogout,
}) => {
  const [remainingText, setRemainingText] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - currentSession.loginTime;
      const remaining = Math.max(0, SESSION_DURATION_MS - elapsed);
      const hrs = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setRemainingText(`${hrs} ساعة و ${mins} دقيقة`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [currentSession.loginTime]);

  if (!isOpen) return null;

  const ordersRoomList = orders.filter((o) => (!o.roomId || o.roomId === 'orders') && !o.isDeleted);
  const notesRoomList = orders.filter((o) => o.roomId === 'notes' && !o.isDeleted);
  const unconfirmedOrdersCount = ordersRoomList.filter((o) => !o.isConfirmed).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Slide-in Drawer from Right (RTL) */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative z-10 w-80 sm:w-96 max-w-[88vw] h-full bg-gradient-to-b from-[#170e2e] via-[#120a24] to-[#0c0618] border-l border-purple-700/50 shadow-2xl shadow-purple-950/90 flex flex-col justify-between p-5 text-white mr-auto"
          dir="rtl"
        >
          {/* Top Section */}
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-700 flex items-center justify-center shadow-lg border border-purple-400/30">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">قائمة إدارة Iavenda</h2>
                  <p className="text-[11px] text-purple-300/70">غرف الدردشة، الطلبات، التقارير، والحماية</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-purple-900/50 hover:bg-purple-800 text-purple-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Admin Session Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/60 to-[#190e30] border border-purple-600/40 shadow-inner space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs text-purple-300">المسؤول المتصل حالياً:</div>
                    <div className="text-base font-black text-white tracking-wide">
                      {currentSession.displayName || currentSession.adminId}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    currentSession.isSupervisor
                      ? 'bg-amber-950/90 text-amber-300 border-amber-600/50'
                      : 'bg-purple-950 text-purple-300 border-purple-700'
                  }`}
                >
                  {currentSession.isSupervisor ? '👑 المشرف العام' : '👤 موظف المستودع'}
                </span>
              </div>

              <div className="pt-2 border-t border-purple-800/40 flex items-center justify-between text-[11px] text-purple-300">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>الوقت المتبقي للجلسة:</span>
                </span>
                <span className="font-bold text-emerald-300">{remainingText}</span>
              </div>
            </div>

            {/* Navigation Menu Items */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-purple-400 px-1">
                غرف الدردشة المشتركة لجميع الموظفين:
              </div>

              {/* Chat Room 1: Orders Confirmation Group ("كروب تثبيت الطلبات") */}
              <button
                onClick={() => {
                  onClose();
                  onOpenOrdersGroup();
                }}
                className="w-full p-3.5 rounded-2xl bg-[#1d1136] hover:bg-purple-900/60 border border-purple-700/50 hover:border-purple-500 transition flex items-center justify-between group text-right cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 group-hover:bg-fuchsia-600 group-hover:text-white transition">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                      <span>💬 كروب تثبيت الطلبات</span>
                      {unconfirmedOrdersCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-black">
                          {unconfirmedOrdersCount} غير مثبت
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-purple-300/70 mt-0.5">
                      رفع صورة سكرين للطلب، التعديل الفوري، والحذف مع إظهار اسم الحاذف
                    </p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-purple-400 group-hover:translate-x-[-4px] transition-transform" />
              </button>

              {/* Chat Room 2: Lavenda Notes ("ملاحظات لافيندا") */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenLavendaNotes) {
                    onOpenLavendaNotes();
                  } else {
                    onOpenOrdersGroup();
                  }
                }}
                className="w-full p-3.5 rounded-2xl bg-[#1d1136] hover:bg-purple-900/60 border border-fuchsia-700/50 hover:border-fuchsia-500 transition flex items-center justify-between group text-right cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                      <span>📝 ملاحظات لافيندا</span>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-purple-900 text-fuchsia-300 border border-purple-700">
                        {notesRoomList.length} ملاحظة
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/70 mt-0.5">
                      غرفة دردشة الملاحظات العامة والترتيبات بين موظفي لافيندا
                    </p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-purple-400 group-hover:translate-x-[-4px] transition-transform" />
              </button>

              {/* 2. SUPERVISOR-ONLY SECTIONS (تظهر فقط للمشرف حذيفة ومخفية عن الموظف أحمد) */}
              {currentSession.isSupervisor ? (
                <>
                  <div className="pt-2 text-xs font-bold text-amber-400 px-1 flex items-center gap-1.5">
                    <span>👑 صلاحيات المشرف (حذيفة فقط):</span>
                  </div>

                  {/* Employee Logins Tracker ("تسجيل دخول الموظفين" بالوقت واليوم والشهر - للمشرف حذيفة فقط) */}
                  {onOpenEmployeeLogins && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenEmployeeLogins();
                      }}
                      className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 to-[#1a0e2e] hover:from-cyan-900/70 hover:to-purple-900/60 border-2 border-cyan-500/60 hover:border-cyan-400 transition flex items-center justify-between group text-right cursor-pointer shadow-lg shadow-cyan-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 group-hover:bg-cyan-500 group-hover:text-black transition">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-cyan-200 flex items-center gap-1.5 flex-wrap">
                            <span>تسجيل دخول الموظفين</span>
                            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700/60">
                              {totalLoginsCount} سجل
                            </span>
                            {unreadLoginsCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse">
                                🔔 +{unreadLoginsCount} جديد
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-purple-200/80 mt-0.5">
                            كل الموظفين الذين سجلوا الدخول مقسمين بالوقت واليوم والشهر
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-cyan-400 group-hover:translate-x-[-4px] transition-transform" />
                    </button>
                  )}

                  {/* Daily Sales Report ("تقرير المبيعات اليومي" - للمشرف فقط مع التوقيت بالساعة والدقائق والثواني 12 ساعة) */}
                  {onOpenDailySalesReport && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenDailySalesReport();
                      }}
                      className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#26143d] to-[#1a0e2e] hover:from-emerald-950/60 hover:to-purple-900/60 border-2 border-emerald-500/60 hover:border-emerald-400 transition flex items-center justify-between group text-right cursor-pointer shadow-lg shadow-emerald-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 group-hover:bg-emerald-500 group-hover:text-black transition">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-emerald-200 flex items-center gap-1.5">
                            <span>تقرير المبيعات اليومي</span>
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/60">
                              12 ساعة بالثواني
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-200/80 mt-0.5">
                            إجمالي الأزواج المبيعة، الفلترة بالتاريخ، ووقت سحب كل موظف (ساعة:دقيقة:ثانية)
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-emerald-400 group-hover:translate-x-[-4px] transition-transform" />
                    </button>
                  )}

                  {/* Low Stock Alerts & Reorder List ("تنبيهات المخزون المنخفض ≤ 5 وقائمة إعادة الطلب" - للمشرف فقط) */}
                  {onOpenLowStockAlerts && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenLowStockAlerts();
                      }}
                      className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#2b1728] to-[#1a0e2e] hover:from-amber-950/70 hover:to-rose-950/50 border-2 border-amber-500/70 hover:border-amber-400 transition flex items-center justify-between group text-right cursor-pointer shadow-lg shadow-amber-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 group-hover:bg-amber-500 group-hover:text-black transition">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-amber-200 flex items-center gap-1.5 flex-wrap">
                            <span>تنبيهات المخزون المنخفض (≤ 5)</span>
                            {lowStockModelsCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse">
                                {lowStockModelsCount} موديل ({lowStockSizesCount} قياس)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-purple-200/80 mt-0.5">
                            الألوان والقياسات التي وصلت إلى 5 أو أقل وقائمة إعادة الطلب من المستودع
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:translate-x-[-4px] transition-transform" />
                    </button>
                  )}

                  {/* Stock Deductions & Additions Log ("حذيفه يستطيع رويا كل شيء منو ضاف قطعه ومنو سحب قطعه") */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenDeductionsTracker();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#26143d] to-[#1d1136] hover:from-purple-900/70 hover:to-purple-800/50 border border-amber-500/50 hover:border-amber-400 transition flex items-center justify-between group text-right cursor-pointer shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/40 group-hover:bg-amber-500 group-hover:text-black transition">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-amber-200">
                          سجل الموظفين: منو سحب قطعة ومنو ضاف قطعة
                        </div>
                        <p className="text-[11px] text-purple-300/80 mt-0.5">
                          رؤية كل شيء لجميع الموظفين (القطع المسحوبة والقطع المضافة بالتوقيت)
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-amber-400 group-hover:translate-x-[-4px] transition-transform" />
                  </button>

                  {/* Security Alerts Log ("في حال شخص غلط في ادخال الاسم والرمز يصل اشعار على المشرفين") */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSecurityAlerts();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-[#1d1136] hover:bg-purple-900/60 border border-purple-700/50 hover:border-rose-500/60 transition flex items-center justify-between group text-right cursor-pointer shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 group-hover:bg-rose-600 group-hover:text-white transition">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white flex items-center gap-2">
                          <span>إشعارات الأمان ومحاولات الدخول</span>
                          {securityAlerts.length > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse">
                              {securityAlerts.length} تنبيه
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-purple-300/70 mt-0.5">
                          سجل الأشخاص الذين أدخلوا الاسم أو الرمز بشكل خاطئ
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-purple-400 group-hover:translate-x-[-4px] transition-transform" />
                  </button>
                </>
              ) : (
                <>
                  <div className="pt-2 text-xs font-bold text-purple-300 px-1 flex items-center gap-1.5">
                    <span>👤 سجل الموظف الشخصي:</span>
                  </div>

                  {/* Employee Personal Withdrawals Button ("زر كل موضف يكدر يشوف القطع الهوا سحبها فقط") */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenDeductionsTracker();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#26143d] to-[#1d1136] hover:from-purple-900/70 hover:to-purple-800/50 border border-fuchsia-500/50 hover:border-fuchsia-400 transition flex items-center justify-between group text-right cursor-pointer shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40 group-hover:bg-fuchsia-500 group-hover:text-white transition">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">
                          📦 القطع التي سحبتها ({currentSession.adminId})
                        </div>
                        <p className="text-[11px] text-purple-300/80 mt-0.5">
                          عرض القطع والأكواد التي قمت أنت بسحبها من المستودع فقط
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-fuchsia-400 group-hover:translate-x-[-4px] transition-transform" />
                  </button>

                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-300/80 flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      تقارير جميع الموظفين الشاملة وتنبيهات المخزون متاحة فقط لحساب المشرف العام (حذيفة).
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Logout Button */}
          <div className="pt-4 border-t border-purple-800/50">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-3 px-4 rounded-xl bg-rose-950/70 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-700/50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج وتبديل المسؤول</span>
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
};
