import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  UserCheck,
  Users,
  Clock,
  Calendar,
  BellRing,
  Check,
  Printer,
  FileCheck,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { EmployeeLoginLog, AuthSession } from '../types/inventory';
import {
  formatTime12HourWithSeconds,
  getLocalDateKey,
  REGISTERED_ADMINS,
} from '../utils/authStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loginLogs: EmployeeLoginLog[];
  currentSession: AuthSession;
  onMarkAllRead?: () => void;
}

export const EmployeeLoginsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  loginLogs,
  currentSession,
  onMarkAllRead,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');
  const [selectedDateKey, setSelectedDateKey] = useState<string>('ALL');
  const [groupMode, setGroupMode] = useState<'by_date' | 'by_employee'>('by_date');
  const [copySuccess, setCopySuccess] = useState(false);

  const isSupervisor = Boolean(
    currentSession.isSupervisor || currentSession.adminId === 'حذيفة'
  );

  // Normalize employee key
  const getEmpKey = (log: EmployeeLoginLog): string => {
    if (log.adminId.includes('حذيفة') || log.adminName.includes('حذيفة')) return 'حذيفة';
    if (
      log.adminId.includes('احمد') ||
      log.adminName.includes('احمد') ||
      log.adminId === 'admin 3'
    ) {
      return 'احمد';
    }
    const matched = REGISTERED_ADMINS.find(
      (a) =>
        a.id.toLowerCase() === log.adminId.trim().toLowerCase() ||
        log.adminName.toLowerCase().includes(a.id.toLowerCase())
    );
    return matched ? matched.id : log.adminId;
  };

  // Enrich logs with formatted 12-hour time, day, and month
  const enrichedLogs = useMemo(() => {
    return loginLogs.map((log) => {
      const t = formatTime12HourWithSeconds(log.timestamp);
      const empKey = getEmpKey(log);
      return {
        ...log,
        empKey,
        t,
      };
    });
  }, [loginLogs]);

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const map = new Map<
      string,
      { monthKey: string; monthNumber: string; monthNameAr: string; year: string; count: number }
    >();
    enrichedLogs.forEach((item) => {
      const existing = map.get(item.t.monthKey);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.t.monthKey, {
          monthKey: item.t.monthKey,
          monthNumber: item.t.monthNumber,
          monthNameAr: item.t.monthNameAr,
          year: item.t.year,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [enrichedLogs]);

  // Available days for filtering
  const availableDays = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        dateAr: string;
        dayNumber: string;
        dayOfWeekAr: string;
        monthNumber: string;
        monthNameAr: string;
        year: string;
        count: number;
      }
    >();
    enrichedLogs.forEach((item) => {
      if (selectedMonthKey !== 'ALL' && item.t.monthKey !== selectedMonthKey) return;
      const existing = map.get(item.t.dateKey);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.t.dateKey, {
          dateKey: item.t.dateKey,
          dateAr: item.t.dateAr,
          dayNumber: item.t.dayNumber,
          dayOfWeekAr: item.t.dayOfWeekAr,
          monthNumber: item.t.monthNumber,
          monthNameAr: item.t.monthNameAr,
          year: item.t.year,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [enrichedLogs, selectedMonthKey]);

  // Employee breakdown summary cards ("وقسمها")
  const employeeSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        empKey: string;
        roleTitle: string;
        isSupervisor: boolean;
        loginCount: number;
        unreadCount: number;
        latestTimestamp: number;
      }
    >();

    // Initialize all registered accounts so Huthaifa sees every employee clearly divided
    REGISTERED_ADMINS.forEach((adm) => {
      map.set(adm.id, {
        empKey: adm.id,
        roleTitle: adm.roleTitle,
        isSupervisor: adm.isSupervisor,
        loginCount: 0,
        unreadCount: 0,
        latestTimestamp: 0,
      });
    });

    enrichedLogs.forEach((item) => {
      const existing = map.get(item.empKey);
      if (existing) {
        existing.loginCount += 1;
        if (!item.isReadBySupervisor && !item.isSupervisor) {
          existing.unreadCount += 1;
        }
        if (item.timestamp > existing.latestTimestamp) {
          existing.latestTimestamp = item.timestamp;
        }
      } else {
        map.set(item.empKey, {
          empKey: item.empKey,
          roleTitle: item.roleTitle || 'موظف',
          isSupervisor: item.isSupervisor,
          loginCount: 1,
          unreadCount: !item.isReadBySupervisor && !item.isSupervisor ? 1 : 0,
          latestTimestamp: item.timestamp,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.latestTimestamp !== a.latestTimestamp) {
        return b.latestTimestamp - a.latestTimestamp;
      }
      return b.loginCount - a.loginCount;
    });
  }, [enrichedLogs]);

  // Filtered login records
  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter((item) => {
      if (selectedEmployee !== 'ALL' && item.empKey !== selectedEmployee) {
        return false;
      }
      if (selectedMonthKey !== 'ALL' && item.t.monthKey !== selectedMonthKey) {
        return false;
      }
      if (selectedDateKey !== 'ALL' && item.t.dateKey !== selectedDateKey) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchEmp =
          item.empKey.toLowerCase().includes(q) ||
          item.adminName.toLowerCase().includes(q);
        const matchDate =
          item.t.dateAr.includes(q) ||
          item.t.dayOfWeekAr.includes(q) ||
          item.t.monthNameAr.includes(q) ||
          item.t.fullTime12.includes(q);
        if (!matchEmp && !matchDate) return false;
      }
      return true;
    });
  }, [enrichedLogs, selectedEmployee, selectedMonthKey, selectedDateKey, searchQuery]);

  // Group filtered logs by Date (Day & Month)
  const groupedByDayAndMonth = useMemo(() => {
    const groups = new Map<
      string,
      {
        dateKey: string;
        dayNumber: string;
        dayOfWeekAr: string;
        monthNumber: string;
        monthNameAr: string;
        year: string;
        dateAr: string;
        items: typeof filteredLogs;
      }
    >();

    filteredLogs.forEach((item) => {
      const existing = groups.get(item.t.dateKey);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(item.t.dateKey, {
          dateKey: item.t.dateKey,
          dayNumber: item.t.dayNumber,
          dayOfWeekAr: item.t.dayOfWeekAr,
          monthNumber: item.t.monthNumber,
          monthNameAr: item.t.monthNameAr,
          year: item.t.year,
          dateAr: item.t.dateAr,
          items: [item],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredLogs]);

  // Group filtered logs by Employee
  const groupedByEmployee = useMemo(() => {
    const groups = new Map<
      string,
      {
        empKey: string;
        roleTitle: string;
        isSupervisor: boolean;
        items: typeof filteredLogs;
      }
    >();

    filteredLogs.forEach((item) => {
      const existing = groups.get(item.empKey);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(item.empKey, {
          empKey: item.empKey,
          roleTitle: item.roleTitle || 'موظف',
          isSupervisor: item.isSupervisor,
          items: [item],
        });
      }
    });

    return Array.from(groups.values());
  }, [filteredLogs]);

  if (!isOpen) return null;

  if (!isSupervisor) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1c0d2a] to-[#12081d] border-2 border-rose-500/70 p-6 shadow-2xl text-white text-center"
            dir="rtl"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/30 border border-rose-500/50 text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-rose-300">
              سجل تسجيل دخول الموظفين خاص بالمشرف (حذيفة) فقط
            </h3>
            <p className="my-4 text-xs text-rose-200/90 leading-relaxed">
              عذراً، هذه القائمة مخصصة للمشرف العام <strong>(حذيفة)</strong> فقط لمتابعة أوقات وأيام وأشهر تسجيل دخول الموظفين.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-purple-900/60 hover:bg-purple-800 text-white border border-purple-700/50 transition cursor-pointer"
            >
              إغلاق
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const todayKey = getLocalDateKey(Date.now());
  const todayLoginsCount = enrichedLogs.filter((l) => l.t.dateKey === todayKey).length;
  const unreadLoginsCount = enrichedLogs.filter(
    (l) => !l.isReadBySupervisor && !l.isSupervisor
  ).length;
  const activeLoggedEmployeesCount = employeeSummary.filter((e) => e.loginCount > 0).length;

  const handleCopyReport = () => {
    const lines = filteredLogs.map((l, idx) => {
      return `${idx + 1}. الموظف: ${l.empKey} (${l.roleTitle}) | الوقت: الساعة ${l.t.hours12}:${l.t.minutes}:${l.t.seconds} ${l.t.periodAr} | اليوم: ${l.t.dayNumber} (${l.t.dayOfWeekAr}) | الشهر: ${l.t.monthNumber} - ${l.t.monthNameAr} ${l.t.year}`;
    });

    const text = [
      `🔑 تقرير وسجل تسجيل دخول الموظفين — مستودع Iavenda`,
      `👑 المشرف العام: حذيفة`,
      `📊 إجمالي عمليات الدخول المعروضة: ${filteredLogs.length}`,
      `----------------------------------------`,
      ...lines,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl my-auto rounded-3xl bg-gradient-to-b from-[#1a0f30] via-[#130a24] to-[#0d0619] border-2 border-cyan-500/60 shadow-2xl shadow-purple-950/90 text-white overflow-hidden max-h-[93vh] flex flex-col"
          dir="rtl"
        >
          {/* Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-[#120824] border-b border-purple-800/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/30 border border-cyan-300/40">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-white">
                    تسجيل دخول الموظفين
                  </h2>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    👑 خاص بالمشرف حذيفة فقط
                  </span>
                  {unreadLoginsCount > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                      🔔 {unreadLoginsCount} إشعار دخول جديد
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  سجل مقسم ومفصل لكل الموظفين الذين سجلوا الدخول بالوقت (ساعة:دقيقة:ثانية) واليوم والشهر
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadLoginsCount > 0 && onMarkAllRead && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد الاطلاع على الإشعارات ({unreadLoginsCount})</span>
                </button>
              )}

              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-purple-100 border border-purple-700 text-xs font-bold transition cursor-pointer"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">تم نسخ السجل</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline">نسخ التقرير</span>
                  </>
                )}
              </button>

              <button
                onClick={() => window.print()}
                className="p-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 transition cursor-pointer"
                title="طباعة سجل دخول الموظفين"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-purple-950 hover:bg-rose-600 text-purple-300 hover:text-white border border-purple-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* 1. Top Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/70 to-[#170d2b] border border-cyan-500/40">
                <span className="text-[11px] text-cyan-300 block">إجمالي تسجيلات الدخول</span>
                <div className="text-xl sm:text-2xl font-black text-white mt-1">
                  {enrichedLogs.length}{' '}
                  <span className="text-xs font-normal text-cyan-300">عملية دخول</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-[#170d2b] border border-emerald-500/40">
                <span className="text-[11px] text-emerald-300 block">تسجيلات دخول اليوم</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">
                  {todayLoginsCount}{' '}
                  <span className="text-xs font-normal text-emerald-200">دخول اليوم</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/80 to-[#170d2b] border border-purple-600/40">
                <span className="text-[11px] text-purple-300 block">الموظفون المسجلون</span>
                <div className="text-xl sm:text-2xl font-black text-fuchsia-300 mt-1">
                  {activeLoggedEmployeesCount}{' '}
                  <span className="text-xs font-normal text-purple-300">
                    من أصل {REGISTERED_ADMINS.length} حسابات
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/70 to-[#170d2b] border border-amber-500/40">
                <span className="text-[11px] text-amber-300 block">إشعارات الدخول الجديدة</span>
                <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1 flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-amber-400" />
                  <span>{unreadLoginsCount}</span>
                  <span className="text-xs font-normal text-amber-200">إشعار جديد</span>
                </div>
              </div>
            </div>

            {/* 2. Divided Employee Cards ("وقسمها" - تقسيم كل موظف مع عدد مرات دخوله وآخر وقت وزر الفلترة) */}
            <div className="rounded-2xl bg-[#150b28] border border-purple-800/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-black text-cyan-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>تقسيم الموظفين (اضغط على اسم أي موظف لعرض سجل دخوله بالتفصيل):</span>
                </h3>
                {selectedEmployee !== 'ALL' && (
                  <button
                    onClick={() => setSelectedEmployee('ALL')}
                    className="text-xs font-bold text-amber-300 hover:text-white bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-600/50 cursor-pointer"
                  >
                    عرض جميع الموظفين ({enrichedLogs.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {employeeSummary.map((emp) => {
                  const isSelected = selectedEmployee === emp.empKey;
                  const latestTime =
                    emp.latestTimestamp > 0
                      ? formatTime12HourWithSeconds(emp.latestTimestamp)
                      : null;

                  return (
                    <button
                      key={emp.empKey}
                      onClick={() =>
                        setSelectedEmployee(isSelected ? 'ALL' : emp.empKey)
                      }
                      className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-900/80 to-purple-900/80 border-2 border-cyan-400 shadow-lg shadow-cyan-950/60'
                          : 'bg-[#1b0f33] hover:bg-purple-900/50 border-purple-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{emp.isSupervisor ? '👑' : '👤'}</span>
                          <span className="text-xs sm:text-sm font-black text-white">
                            {emp.empKey}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            emp.loginCount > 0
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/50'
                              : 'bg-purple-950 text-purple-400 border border-purple-800'
                          }`}
                        >
                          {emp.loginCount} دخول
                        </span>
                      </div>

                      {latestTime ? (
                        <div className="text-[10px] text-purple-200/90 space-y-0.5 border-t border-purple-800/50 pt-1.5">
                          <div className="text-emerald-300 font-bold font-mono">
                            🕒 {latestTime.hours12}:{latestTime.minutes}:{latestTime.seconds}{' '}
                            {latestTime.periodAr}
                          </div>
                          <div className="text-purple-300">
                            📅 يوم {latestTime.dayNumber} / شهر {latestTime.monthNumber} ({latestTime.dayOfWeekAr})
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-purple-400/60 border-t border-purple-800/40 pt-1.5">
                          لم يسجل دخول بعد
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Filter & Grouping Controls (الشهر، اليوم، وطريقة التقسيم) */}
            <div className="rounded-2xl bg-[#150b28] border border-purple-800/60 p-3.5 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم الموظف (Safa, Reem, Zaeenab, احمد...) أو باليوم أو الشهر أو الساعة..."
                    className="w-full bg-[#0e071c] text-white placeholder-purple-400/50 text-xs rounded-xl pr-9 pl-3 py-2.5 border border-purple-800/70 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Grouping Mode Switcher */}
                <div className="flex items-center gap-1 bg-[#0e071c] p-1 rounded-xl border border-purple-800/70 shrink-0">
                  <button
                    onClick={() => setGroupMode('by_date')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      groupMode === 'by_date'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>تقسيم باليوم والشهر والوقت</span>
                  </button>
                  <button
                    onClick={() => setGroupMode('by_employee')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      groupMode === 'by_employee'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>تقسيم حسب كل موظف</span>
                  </button>
                </div>
              </div>

              {/* Month & Day Quick Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-900/50 text-xs">
                <span className="text-purple-300 font-bold">تصفية بالشهر:</span>
                <button
                  onClick={() => {
                    setSelectedMonthKey('ALL');
                    setSelectedDateKey('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedMonthKey === 'ALL'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-950/60 text-purple-300 hover:bg-purple-900'
                  }`}
                >
                  كل الأشهر
                </button>
                {availableMonths.map((m) => (
                  <button
                    key={m.monthKey}
                    onClick={() => {
                      setSelectedMonthKey(m.monthKey);
                      setSelectedDateKey('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      selectedMonthKey === m.monthKey
                        ? 'bg-cyan-600 text-white'
                        : 'bg-purple-950/60 text-purple-200 hover:bg-purple-900'
                    }`}
                  >
                    شهر {m.monthNumber} - {m.monthNameAr} {m.year} ({m.count})
                  </button>
                ))}
              </div>

              {availableDays.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-purple-300 font-bold">تصفية باليوم:</span>
                  <button
                    onClick={() => setSelectedDateKey('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      selectedDateKey === 'ALL'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-950/60 text-purple-300 hover:bg-purple-900'
                    }`}
                  >
                    كل الأيام
                  </button>
                  {availableDays.map((d) => (
                    <button
                      key={d.dateKey}
                      onClick={() => setSelectedDateKey(d.dateKey)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        selectedDateKey === d.dateKey
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-950/60 text-purple-200 hover:bg-purple-900'
                      }`}
                    >
                      {d.dayOfWeekAr} - يوم {d.dayNumber} / شهر {d.monthNumber} ({d.count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Login Records Display (Grouped by Day & Month OR by Employee) */}
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-[#140b26] border border-purple-800/40">
                <Clock className="w-10 h-10 text-purple-400 mx-auto mb-2 opacity-70" />
                <p className="text-sm font-bold text-white">
                  لا توجد سجلات تسجيل دخول مطابقة للفلتر المحدد
                </p>
                <p className="text-xs text-purple-300/70 mt-1">
                  بمجرد قيام أي موظف بتسجيل الدخول سيظهر هنا فوراً مع الوقت واليوم والشهر.
                </p>
              </div>
            ) : groupMode === 'by_date' ? (
              <div className="space-y-4">
                {groupedByDayAndMonth.map((dayGroup) => (
                  <div
                    key={dayGroup.dateKey}
                    className="rounded-2xl bg-[#160c2b] border border-cyan-500/40 overflow-hidden shadow-lg"
                  >
                    {/* Day & Month Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-[#160c2b] border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs sm:text-sm font-black text-white">
                          اليوم: {dayGroup.dayOfWeekAr} ({dayGroup.dayNumber})
                        </span>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-cyan-900/70 text-cyan-200 border border-cyan-500/40">
                          الشهر: {dayGroup.monthNumber} — {dayGroup.monthNameAr} {dayGroup.year}
                        </span>
                        <span className="text-xs font-mono text-purple-300">
                          ({dayGroup.dateAr})
                        </span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                        عدد عمليات الدخول في هذا اليوم: {dayGroup.items.length}
                      </span>
                    </div>

                    {/* Logins List for this Day */}
                    <div className="divide-y divide-purple-800/40">
                      {dayGroup.items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                            !item.isReadBySupervisor && !item.isSupervisor
                              ? 'bg-amber-950/25 hover:bg-amber-950/35'
                              : 'hover:bg-purple-900/25'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                                item.isSupervisor
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                                  : 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                              }`}
                            >
                              {item.isSupervisor ? '👑' : '👤'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-white">
                                  الموظف: {item.empKey}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    item.isSupervisor
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                                      : 'bg-purple-900/80 text-purple-200 border-purple-600/50'
                                  }`}
                                >
                                  الرتبة: {item.roleTitle}
                                </span>
                                {!item.isReadBySupervisor && !item.isSupervisor && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white">
                                    🔔 دخول جديد
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-purple-300 mt-1 flex flex-wrap items-center gap-2">
                                <span>
                                  📆 <strong>اليوم:</strong> {item.t.dayNumber} ({item.t.dayOfWeekAr})
                                </span>
                                <span>•</span>
                                <span>
                                  🗓️ <strong>الشهر:</strong> {item.t.monthNumber} ({item.t.monthNameAr}) {item.t.year}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Exact Login Time Badge */}
                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-mono text-xs font-black flex items-center gap-1.5 shadow">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                الوقت: الساعة {item.t.hours12}:{item.t.minutes}:{item.t.seconds}{' '}
                                {item.t.periodAr}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grouped by Employee View */
              <div className="space-y-4">
                {groupedByEmployee.map((empGroup) => (
                  <div
                    key={empGroup.empKey}
                    className="rounded-2xl bg-[#160c2b] border border-purple-700/60 overflow-hidden shadow-lg"
                  >
                    <div className="px-4 py-3 bg-gradient-to-r from-purple-950 via-[#1f103d] to-[#160c2b] border-b border-purple-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{empGroup.isSupervisor ? '👑' : '👤'}</span>
                        <span className="text-sm sm:text-base font-black text-white">
                          الموظف: {empGroup.empKey}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-purple-900 text-purple-200 border border-purple-600/50 font-bold">
                          {empGroup.roleTitle}
                        </span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-600/50">
                        إجمالي مرات الدخول: {empGroup.items.length}
                      </span>
                    </div>

                    <div className="divide-y divide-purple-800/40">
                      {empGroup.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 px-4 flex flex-wrap items-center justify-between gap-2 hover:bg-purple-900/20 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-bold text-cyan-300">
                              📆 اليوم: {item.t.dayNumber} ({item.t.dayOfWeekAr})
                            </span>
                            <span className="font-bold text-purple-200">
                              🗓️ الشهر: {item.t.monthNumber} — {item.t.monthNameAr} {item.t.year}
                            </span>
                            <span className="font-mono text-purple-400">({item.t.dateAr})</span>
                          </div>
                          <div className="px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-mono font-black">
                            🕒 الوقت: الساعة {item.t.hours12}:{item.t.minutes}:{item.t.seconds}{' '}
                            {item.t.periodAr}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
