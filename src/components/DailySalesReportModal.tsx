import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  User,
  Users,
  Search,
  Printer,
  FileCheck,
  Check,
  ShieldAlert,
  Layers,
  Filter,
  RotateCcw,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { StockDeductionLog, AuthSession } from '../types/inventory';
import {
  formatTime12HourWithSeconds,
  getLocalDateKey,
  REGISTERED_ADMINS,
} from '../utils/authStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deductions: StockDeductionLog[];
  currentSession: AuthSession;
}

type DateFilterMode = 'all' | 'today' | 'yesterday' | 'custom_date' | 'date_range';

// Custom Tooltip for Recharts Bar Chart
const ChartCustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-[#190b2e] border-2 border-amber-500/60 rounded-xl p-3 shadow-2xl text-xs text-white z-50 min-w-[170px]"
        dir="rtl"
      >
        <div className="font-black text-amber-300 pb-1 mb-1.5 border-b border-purple-800/60 flex items-center justify-between gap-3">
          <span>{label}</span>
          <span className="text-[10px] text-purple-300 font-normal">مبيعات المستودع</span>
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={`entry-${index}`}
              className="flex items-center justify-between gap-3 text-[11px]"
            >
              <span
                className="flex items-center gap-1.5 font-bold"
                style={{ color: entry.color }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-black text-white">{entry.value} زوج</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const DailySalesReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deductions,
  currentSession,
}) => {
  const todayKey = useMemo(() => getLocalDateKey(Date.now()), []);
  const yesterdayKey = useMemo(
    () => getLocalDateKey(Date.now() - 24 * 60 * 60 * 1000),
    []
  );

  // Default to 'today' if there are sales today, otherwise 'all'
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>(() => {
    const hasToday = deductions.some(
      (d) => formatTime12HourWithSeconds(d.timestamp).dateKey === getLocalDateKey(Date.now())
    );
    return hasToday ? 'today' : 'all';
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateKey(Date.now()));
  const [rangeStartDate, setRangeStartDate] = useState<string>(() =>
    getLocalDateKey(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => getLocalDateKey(Date.now()));
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'timeline' | 'by_employee' | 'by_model'>('timeline');
  const [copySuccess, setCopySuccess] = useState(false);
  const [chartMode, setChartMode] = useState<'daily' | 'hourly' | 'models'>('daily');
  const [isChartExpanded, setIsChartExpanded] = useState(true);

  // Only sales/withdrawal records (exclude 'add' operations)
  const salesOnlyDeductions = useMemo(
    () => deductions.filter((d) => d.operationCategory !== 'add'),
    [deductions]
  );

  // Compute all unique dates present in deductions with their total pairs sold
  const availableDatesSummary = useMemo(() => {
    const map = new Map<string, { dateKey: string; dateAr: string; totalPairs: number; count: number }>();
    salesOnlyDeductions.forEach((d) => {
      const t = formatTime12HourWithSeconds(d.timestamp);
      const existing = map.get(t.dateKey);
      if (existing) {
        existing.totalPairs += d.quantityDecreased;
        existing.count += 1;
      } else {
        map.set(t.dateKey, {
          dateKey: t.dateKey,
          dateAr: t.dateAr,
          totalPairs: d.quantityDecreased,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [deductions]);

  // Helper to normalize employee key
  const getEmployeeKey = (d: StockDeductionLog): string => {
    if (d.adminId.includes('حذيفة') || d.adminName.includes('حذيفة')) {
      return 'حذيفة';
    }
    if (
      d.adminId.includes('احمد') ||
      d.adminName.includes('احمد') ||
      d.adminId.includes('أحمد') ||
      d.adminName.includes('أحمد') ||
      d.adminId === 'admin 3'
    ) {
      return 'احمد';
    }
    return d.adminId;
  };

  // Filtered deductions by Date + Employee + Search Query
  const filteredSalesLogs = useMemo(() => {
    return salesOnlyDeductions.filter((d) => {
      const timeInfo = formatTime12HourWithSeconds(d.timestamp);

      // 1. Date Filter
      if (dateFilterMode === 'today' && timeInfo.dateKey !== todayKey) {
        return false;
      }
      if (dateFilterMode === 'yesterday' && timeInfo.dateKey !== yesterdayKey) {
        return false;
      }
      if (dateFilterMode === 'custom_date' && selectedDate && timeInfo.dateKey !== selectedDate) {
        return false;
      }
      if (dateFilterMode === 'date_range') {
        if (rangeStartDate && timeInfo.dateKey < rangeStartDate) return false;
        if (rangeEndDate && timeInfo.dateKey > rangeEndDate) return false;
      }

      // 2. Employee Filter
      if (employeeFilter !== 'all') {
        const empKey = getEmployeeKey(d);
        if (empKey !== employeeFilter) return false;
      }

      // 3. Search Query (Shoe code, shoe name, color, size)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = d.shoeCode.toLowerCase().includes(q);
        const nameMatch = d.shoeName?.toLowerCase().includes(q) || false;
        const colorMatch = d.colorName.toLowerCase().includes(q);
        const sizeMatch = String(d.size).toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !colorMatch && !sizeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    deductions,
    dateFilterMode,
    todayKey,
    yesterdayKey,
    selectedDate,
    rangeStartDate,
    rangeEndDate,
    employeeFilter,
    searchQuery,
  ]);

  // Total Sold Pairs from filtered deduction records ("تجمع إجمالي عدد الأزواج المبيعة من سجلات الخصم")
  const totalSoldPairs = useMemo(() => {
    return filteredSalesLogs.reduce((sum, item) => sum + item.quantityDecreased, 0);
  }, [filteredSalesLogs]);

  // Breakdown by Employee for the selected date filter
  const employeeBreakdown = useMemo(() => {
    const groups: Record<
      string,
      {
        id: string;
        displayName: string;
        roleLabel: string;
        isSupervisor: boolean;
        totalPairs: number;
        operationsCount: number;
        logs: StockDeductionLog[];
      }
    > = {};

    REGISTERED_ADMINS.forEach((adm) => {
      groups[adm.id] = {
        id: adm.id,
        displayName: adm.name,
        roleLabel: adm.isSupervisor ? 'مشرف عام' : `رتبة: ${adm.roleTitle}`,
        isSupervisor: adm.isSupervisor,
        totalPairs: 0,
        operationsCount: 0,
        logs: [],
      };
    });

    filteredSalesLogs.forEach((log) => {
      const key = getEmployeeKey(log);
      if (!groups[key]) {
        groups[key] = {
          id: key,
          displayName: log.adminName || key,
          roleLabel: 'موظف',
          isSupervisor: false,
          totalPairs: 0,
          operationsCount: 0,
          logs: [],
        };
      }
      groups[key].totalPairs += log.quantityDecreased;
      groups[key].operationsCount += 1;
      groups[key].logs.push(log);
    });

    return Object.values(groups);
  }, [filteredSalesLogs]);

  // Breakdown by Shoe Model for the selected date filter
  const modelSalesBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        name?: string;
        totalPairs: number;
        operationsCount: number;
        colors: Record<string, number>;
        sizes: Record<string, number>;
        employees: Record<string, number>;
        latestTimestamp: number;
      }
    >();

    filteredSalesLogs.forEach((d) => {
      const key = d.shoeCode.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          code: d.shoeCode,
          name: d.shoeName,
          totalPairs: 0,
          operationsCount: 0,
          colors: {},
          sizes: {},
          employees: {},
          latestTimestamp: d.timestamp,
        });
      }
      const entry = map.get(key)!;
      entry.totalPairs += d.quantityDecreased;
      entry.operationsCount += 1;
      entry.colors[d.colorName] = (entry.colors[d.colorName] || 0) + d.quantityDecreased;
      entry.sizes[String(d.size)] = (entry.sizes[String(d.size)] || 0) + d.quantityDecreased;
      const empKey = getEmployeeKey(d);
      entry.employees[empKey] = (entry.employees[empKey] || 0) + d.quantityDecreased;
      if (d.timestamp > entry.latestTimestamp) {
        entry.latestTimestamp = d.timestamp;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalPairs - a.totalPairs);
  }, [filteredSalesLogs]);

  // Recharts Chart Series Calculations
  // 1. Daily Trend (up to the last 10 dates recorded)
  const dailyChartData = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        dateLabel: string;
        totalPairs: number;
        huthaifaPairs: number;
        ahmedPairs: number;
        operations: number;
      }
    >();

    salesOnlyDeductions.forEach((d) => {
      const t = formatTime12HourWithSeconds(d.timestamp);
      const key = t.dateKey;
      const emp = getEmployeeKey(d);
      const isHuthaifa = emp === 'حذيفة';

      if (!map.has(key)) {
        let label = t.dateAr;
        if (key === todayKey) label = 'اليوم';
        else if (key === yesterdayKey) label = 'أمس';
        else {
          const parts = key.split('-');
          if (parts.length === 3) {
            label = `${parts[2]}/${parts[1]}`;
          }
        }
        map.set(key, {
          dateKey: key,
          dateLabel: label,
          totalPairs: 0,
          huthaifaPairs: 0,
          ahmedPairs: 0,
          operations: 0,
        });
      }

      const item = map.get(key)!;
      item.totalPairs += d.quantityDecreased;
      item.operations += 1;
      if (isHuthaifa) {
        item.huthaifaPairs += d.quantityDecreased;
      } else {
        item.ahmedPairs += d.quantityDecreased;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-10);
  }, [salesOnlyDeductions, todayKey, yesterdayKey]);

  // 2. Hourly Activity (based on the currently filtered sales records)
  const hourlyChartData = useMemo(() => {
    const hourMap = new Map<
      number,
      {
        hour: number;
        hourLabel: string;
        totalPairs: number;
        huthaifaPairs: number;
        ahmedPairs: number;
        operations: number;
      }
    >();

    filteredSalesLogs.forEach((d) => {
      const date = new Date(d.timestamp);
      const hour = date.getHours();
      const emp = getEmployeeKey(d);
      const isHuthaifa = emp === 'حذيفة';

      if (!hourMap.has(hour)) {
        const h12 = hour % 12 === 0 ? 12 : hour % 12;
        const period = hour >= 12 ? 'م' : 'ص';
        hourMap.set(hour, {
          hour,
          hourLabel: `${h12} ${period}`,
          totalPairs: 0,
          huthaifaPairs: 0,
          ahmedPairs: 0,
          operations: 0,
        });
      }

      const item = hourMap.get(hour)!;
      item.totalPairs += d.quantityDecreased;
      item.operations += 1;
      if (isHuthaifa) {
        item.huthaifaPairs += d.quantityDecreased;
      } else {
        item.ahmedPairs += d.quantityDecreased;
      }
    });

    return Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
  }, [filteredSalesLogs]);

  // 3. Top-selling Shoe Models
  const modelsChartData = useMemo(() => {
    return modelSalesBreakdown.slice(0, 8).map((m) => ({
      modelCode: m.code,
      name: m.name ? `${m.code} (${m.name})` : m.code,
      totalPairs: m.totalPairs,
      operations: m.operationsCount,
    }));
  }, [modelSalesBreakdown]);

  if (!isOpen) return null;

  // Supervisor-only authorization guard ("تظهر للمشرف فقط")
  const isSupervisor =
    currentSession.isSupervisor ||
    currentSession.adminId === 'حذيفة';

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
              تقرير المبيعات اليومي مخصص للمشرف فقط
            </h3>
            <p className="my-4 text-xs text-rose-200/90 leading-relaxed">
              عذراً، هذه الصفحة تظهر للمشرف العام <strong>(حذيفة)</strong> فقط للاطلاع على إجمالي الأزواج المبيعة وتوقيت سحب كل موظف بالساعة والدقائق والثواني.
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

  // Active Date Filter Label
  const activeDateDescription = (() => {
    if (dateFilterMode === 'today') return `مبيعات اليوم (${todayKey.replace(/-/g, '/')})`;
    if (dateFilterMode === 'yesterday') return `مبيعات أمس (${yesterdayKey.replace(/-/g, '/')})`;
    if (dateFilterMode === 'custom_date')
      return `تاريخ محدد (${selectedDate.replace(/-/g, '/')})`;
    if (dateFilterMode === 'date_range')
      return `من ${rangeStartDate.replace(/-/g, '/')} إلى ${rangeEndDate.replace(/-/g, '/')}`;
    return 'جميع التواريخ المسجلة';
  })();

  const handleCopyDailyReport = () => {
    const lines = filteredSalesLogs.map((log, idx) => {
      const t = formatTime12HourWithSeconds(log.timestamp);
      const emp = getEmployeeKey(log);
      return `${idx + 1}. الموظف: ${emp} | الكود: ${log.shoeCode} (${log.colorName} - مقاس ${log.size}) | الكمية: ${log.quantityDecreased} زوج | التاريخ: ${t.dateAr} | وقت السحب (12 ساعة): ${t.fullTime12} [الساعة ${t.hours12} : الدقائق ${t.minutes} : الثواني ${t.seconds} ${t.periodAr}]`;
    });

    const reportText = [
      `📊 تقرير المبيعات اليومي - مستودع شركة Iavenda للأحذية`,
      `👑 المشرف العام: حذيفة`,
      `📅 الفلترة الزمنية: ${activeDateDescription}`,
      `👟 إجمالي عدد الأزواج المبيعة (من سجلات الخصم): ${totalSoldPairs} زوج`,
      `🔢 عدد عمليات البيع/السحب: ${filteredSalesLogs.length} عملية`,
      `----------------------------------------`,
      ...lines,
    ].join('\n');

    navigator.clipboard.writeText(reportText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl my-auto rounded-3xl bg-[#130924] border-2 border-amber-500/60 shadow-2xl shadow-purple-950/95 flex flex-col max-h-[95vh] overflow-hidden text-white"
          dir="rtl"
        >
          {/* ================= HEADER ================= */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2c1242] via-[#1f0c35] to-[#150926] border-b border-purple-800/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-fuchsia-600 text-black border border-amber-300/60 shadow-lg shadow-amber-500/20">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black text-white">
                    تقرير المبيعات اليومي
                  </h2>
                  <span className="text-xs font-black text-black bg-gradient-to-r from-amber-400 to-yellow-300 px-3 py-0.5 rounded-full border border-amber-200 shadow-sm flex items-center gap-1">
                    <span>👑 يظهر للمشرف حذيفة فقط</span>
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 mt-1">
                  يجمع إجمالي عدد الأزواج المبيعة من سجلات الخصم مع فلترة بالتاريخ وتوقيت سحب كل موظف بالساعة والدقائق والثواني (نظام 12 ساعة)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/50 hover:bg-purple-800 border border-purple-700/50 text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer"
                title="طباعة تقرير المبيعات اليومي"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">طباعة</span>
              </button>

              <button
                onClick={handleCopyDailyReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-xs font-bold text-amber-200 hover:text-white transition cursor-pointer"
                title="نسخ تقرير المبيعات اليومي بالتوقيت الدقيق"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 text-amber-300" />
                    <span className="hidden sm:inline">نسخ التقرير</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-purple-300 hover:text-white rounded-full bg-purple-900/40 hover:bg-purple-800 border border-purple-700/40 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ================= SCROLLABLE CONTENT ================= */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-purple-700">
            {/* 1. DATE FILTER PANEL ("مع إمكانية الفلترة حسب التاريخ") */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1d0f36] to-[#160b29] border border-purple-800/70 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-amber-300">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>فلترة المبيعات حسب التاريخ:</span>
                  <span className="text-xs font-bold text-white bg-purple-950/90 px-2.5 py-0.5 rounded-lg border border-purple-700">
                    {activeDateDescription}
                  </span>
                </div>

                {(dateFilterMode !== 'all' || employeeFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setDateFilterMode('all');
                      setEmployeeFilter('all');
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 px-2.5 py-1 rounded-lg border border-rose-800/50 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إظهار كل التواريخ والسجلات</span>
                  </button>
                )}
              </div>

              {/* Date Filter Mode Buttons & Date Input */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setDateFilterMode('today');
                    setSelectedDate(todayKey);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${
                    dateFilterMode === 'today'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-300 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 hover:text-white border-purple-800/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>مبيعات اليوم ({todayKey.replace(/-/g, '/')})</span>
                </button>

                <button
                  onClick={() => {
                    setDateFilterMode('yesterday');
                    setSelectedDate(yesterdayKey);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                    dateFilterMode === 'yesterday'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-300 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 hover:text-white border-purple-800/60'
                  }`}
                >
                  <span>مبيعات أمس</span>
                </button>

                <button
                  onClick={() => setDateFilterMode('custom_date')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                    dateFilterMode === 'custom_date'
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-fuchsia-400 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 hover:text-white border-purple-800/60'
                  }`}
                >
                  <span>اختيار تاريخ محدد</span>
                </button>

                <button
                  onClick={() => setDateFilterMode('date_range')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                    dateFilterMode === 'date_range'
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-fuchsia-400 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 hover:text-white border-purple-800/60'
                  }`}
                >
                  <span>فترة بين تاريخين</span>
                </button>

                <button
                  onClick={() => setDateFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                    dateFilterMode === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-purple-400 shadow-md'
                      : 'bg-purple-950/70 text-purple-200 hover:text-white border-purple-800/60'
                  }`}
                >
                  <span>كل التواريخ ({deductions.length} عملية)</span>
                </button>

                {/* Native Date Picker always accessible */}
                <div className="flex items-center gap-2 bg-[#11071f] px-3 py-1 rounded-xl border border-purple-700/70 mr-auto">
                  <span className="text-[11px] text-purple-300 font-bold">التاريخ:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setDateFilterMode('custom_date');
                    }}
                    className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Date Range Pickers if 'date_range' is active */}
              {dateFilterMode === 'date_range' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-purple-900/50 text-xs">
                  <div className="flex items-center gap-2 bg-[#11071f] px-3 py-1.5 rounded-xl border border-purple-700/70">
                    <span className="text-purple-300 font-bold">من تاريخ:</span>
                    <input
                      type="date"
                      value={rangeStartDate}
                      onChange={(e) => setRangeStartDate(e.target.value)}
                      className="bg-transparent text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-[#11071f] px-3 py-1.5 rounded-xl border border-purple-700/70">
                    <span className="text-purple-300 font-bold">إلى تاريخ:</span>
                    <input
                      type="date"
                      value={rangeEndDate}
                      onChange={(e) => setRangeEndDate(e.target.value)}
                      className="bg-transparent text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Quick Clickable Dates with Recorded Sales */}
              {availableDatesSummary.length > 0 && (
                <div className="pt-2 border-t border-purple-900/50 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-purple-300/80 font-bold ml-1">
                    تواريخ مسجلة فيها مبيعات:
                  </span>
                  {availableDatesSummary.map((dItem) => {
                    const isSelectedDate =
                      (dateFilterMode === 'custom_date' && selectedDate === dItem.dateKey) ||
                      (dateFilterMode === 'today' && dItem.dateKey === todayKey) ||
                      (dateFilterMode === 'yesterday' && dItem.dateKey === yesterdayKey);
                    return (
                      <button
                        key={dItem.dateKey}
                        onClick={() => {
                          setSelectedDate(dItem.dateKey);
                          if (dItem.dateKey === todayKey) {
                            setDateFilterMode('today');
                          } else if (dItem.dateKey === yesterdayKey) {
                            setDateFilterMode('yesterday');
                          } else {
                            setDateFilterMode('custom_date');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                          isSelectedDate
                            ? 'bg-fuchsia-700 text-white border-fuchsia-400 shadow'
                            : 'bg-purple-950/60 text-purple-300 hover:text-white border-purple-800/50'
                        }`}
                      >
                        <span className="font-mono">{dItem.dateAr}</span>
                        {dItem.dateKey === todayKey && (
                          <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 rounded">
                            اليوم
                          </span>
                        )}
                        <span className="text-amber-300 font-black">({dItem.totalPairs} زوج)</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. TOTAL SOLD PAIRS & EMPLOYEE SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Main Total Sold Pairs Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600/25 via-[#26113c] to-[#190b2b] border-2 border-amber-500/70 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>إجمالي عدد الأزواج المبيعة</span>
                  </span>
                  <span className="text-[10px] font-bold bg-amber-950/90 text-amber-200 px-2 py-0.5 rounded-full border border-amber-600/50">
                    من سجلات الخصم
                  </span>
                </div>
                <div className="my-2 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    {totalSoldPairs}
                  </span>
                  <span className="text-sm font-black text-amber-300">زوج مبيع / مسحوب</span>
                </div>
                <div className="text-[11px] text-purple-200/80 flex items-center justify-between pt-2 border-t border-amber-500/20">
                  <span>عدد عمليات السحب والبيع:</span>
                  <strong className="text-white font-mono">{filteredSalesLogs.length} عملية</strong>
                </div>
              </div>

              {/* Employee Cards */}
              {employeeBreakdown.slice(0, 2).map((emp) => {
                const latestLog = emp.logs[0];
                const latestTime = latestLog
                  ? formatTime12HourWithSeconds(latestLog.timestamp)
                  : null;
                const isSelectedEmp = employeeFilter === emp.id;

                return (
                  <div
                    key={emp.id}
                    onClick={() =>
                      setEmployeeFilter(isSelectedEmp ? 'all' : emp.id)
                    }
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelectedEmp
                        ? 'bg-gradient-to-br from-fuchsia-900/50 to-[#1d0c33] border-fuchsia-400 ring-2 ring-fuchsia-400/40'
                        : emp.isSupervisor
                        ? 'bg-[#1c0f34] border-amber-600/40 hover:border-amber-400'
                        : 'bg-[#1a0d30] border-purple-700/50 hover:border-fuchsia-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{emp.isSupervisor ? '👑' : '👤'}</span>
                        <div>
                          <div className="text-sm font-black text-white">{emp.displayName}</div>
                          <div className="text-[10px] text-purple-300/70">{emp.roleLabel}</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-black text-fuchsia-300 font-mono">
                          {emp.totalPairs}
                        </div>
                        <div className="text-[10px] text-purple-300">زوج مبيع</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-purple-900/50 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-purple-300">
                        <span>عدد عمليات السحب:</span>
                        <strong className="text-white">{emp.operationsCount} عملية</strong>
                      </div>
                      {latestTime ? (
                        <div className="flex items-center justify-between text-amber-200 bg-black/30 px-2 py-1 rounded-lg border border-amber-500/20">
                          <span className="text-[10px] text-purple-300">آخر سحب (12س):</span>
                          <span className="font-mono font-black text-amber-300 text-[11px]" dir="ltr">
                            {latestTime.fullTime12}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-purple-400/70 text-center py-0.5">
                          لا توجد مسحوبات في هذا التاريخ
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2.5 VISUAL ANALYTICS - RECHARTS BAR CHART ("استخدم مكتبة Recharts لإضافة رسم بياني Bar Chart يوضح حركة المبيعات والسحب") */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1c0e35] via-[#160a2c] to-[#120723] border-2 border-amber-500/50 shadow-xl space-y-3">
              {/* Chart Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-fuchsia-600 text-black shadow-lg shadow-amber-500/20">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-white">
                        التحليل البصري لحركة المبيعات والسحب (Recharts)
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        <span>مخطط بياني تفاعلي</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80 mt-0.5">
                      رسم بياني يوضح أعداد الأزواج المسحوبة والمبيعة ومقارنة الموظفين لتسهيل القراءة والمراقبة
                    </p>
                  </div>
                </div>

                {/* Chart Controls & Mode Toggles */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-[#10061e] p-1 rounded-xl border border-purple-700/60 text-xs">
                    <button
                      onClick={() => setChartMode('daily')}
                      className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer flex items-center gap-1.5 ${
                        chartMode === 'daily'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                          : 'text-purple-300 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>حركة آخر الأيام</span>
                    </button>
                    <button
                      onClick={() => setChartMode('hourly')}
                      className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer flex items-center gap-1.5 ${
                        chartMode === 'hourly'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                          : 'text-purple-300 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>ساعات السحب</span>
                    </button>
                    <button
                      onClick={() => setChartMode('models')}
                      className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer flex items-center gap-1.5 ${
                        chartMode === 'models'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                          : 'text-purple-300 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>أعلى الموديلات</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                    className="p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-300 hover:text-white transition cursor-pointer"
                    title={isChartExpanded ? 'طي الرسم البياني' : 'توسيع الرسم البياني'}
                  >
                    {isChartExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chart Content Body */}
              {isChartExpanded && (
                <div className="pt-1">
                  {chartMode === 'daily' && (
                    <>
                      {dailyChartData.length === 0 ? (
                        <div className="py-12 text-center text-xs text-purple-400 bg-[#0e061b] rounded-xl border border-purple-900/40">
                          لا توجد بيانات مبيعات مسجلة في الأيام السابقة لعرض الرسم البياني.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-purple-300 px-1">
                            <span className="flex items-center gap-1 text-amber-300 font-bold">
                              <span>📅 حركة المبيعات اليومية للأيام المسجلة (حتى آخر 10 أيام)</span>
                            </span>
                            <span className="text-[11px] text-purple-400">
                              (الأعمدة تمثل إجمالي الأزواج المبيعة موزعة بين حذيفة وأحمد)
                            </span>
                          </div>
                          <div className="w-full h-64 sm:h-72 bg-[#0e061b] p-2.5 rounded-xl border border-purple-900/50">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={dailyChartData}
                                margin={{ top: 12, right: 10, left: -10, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d164d" vertical={false} />
                                <XAxis
                                  dataKey="dateLabel"
                                  stroke="#9333ea"
                                  tick={{ fill: '#d8b4fe', fontSize: 11, fontWeight: 'bold' }}
                                />
                                <YAxis
                                  stroke="#9333ea"
                                  tick={{ fill: '#d8b4fe', fontSize: 11 }}
                                  allowDecimals={false}
                                />
                                <Tooltip content={<ChartCustomTooltip />} />
                                <Legend
                                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                  formatter={(value) => (
                                    <span className="text-purple-200 font-bold">{value}</span>
                                  )}
                                />
                                <Bar
                                  dataKey="huthaifaPairs"
                                  name="سحب حذيفة (مشرف)"
                                  fill="#F59E0B"
                                  radius={[6, 6, 0, 0]}
                                  maxBarSize={45}
                                />
                                <Bar
                                  dataKey="ahmedPairs"
                                  name="سحب أحمد (موظف)"
                                  fill="#38BDF8"
                                  radius={[6, 6, 0, 0]}
                                  maxBarSize={45}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {chartMode === 'hourly' && (
                    <>
                      {hourlyChartData.length === 0 ? (
                        <div className="py-12 text-center text-xs text-purple-400 bg-[#0e061b] rounded-xl border border-purple-900/40">
                          لا توجد عمليات سحب في النطاق الزمني المختار لعرض توزيع الساعات.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-purple-300 px-1">
                            <span className="flex items-center gap-1 text-amber-300 font-bold">
                              <span>⏰ توزيع عمليات السحب حسب ساعات اليوم (أوقات الذروة)</span>
                            </span>
                            <span className="text-[11px] text-purple-400">
                              (يوضح الساعات التي يتركز فيها سحب الأحذية ومبيعات المستودع)
                            </span>
                          </div>
                          <div className="w-full h-64 sm:h-72 bg-[#0e061b] p-2.5 rounded-xl border border-purple-900/50">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={hourlyChartData}
                                margin={{ top: 12, right: 10, left: -10, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d164d" vertical={false} />
                                <XAxis
                                  dataKey="hourLabel"
                                  stroke="#9333ea"
                                  tick={{ fill: '#d8b4fe', fontSize: 11, fontWeight: 'bold' }}
                                />
                                <YAxis
                                  stroke="#9333ea"
                                  tick={{ fill: '#d8b4fe', fontSize: 11 }}
                                  allowDecimals={false}
                                />
                                <Tooltip content={<ChartCustomTooltip />} />
                                <Legend
                                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                  formatter={(value) => (
                                    <span className="text-purple-200 font-bold">{value}</span>
                                  )}
                                />
                                <Bar
                                  dataKey="huthaifaPairs"
                                  name="سحب حذيفة (مشرف)"
                                  fill="#F59E0B"
                                  radius={[6, 6, 0, 0]}
                                  maxBarSize={40}
                                />
                                <Bar
                                  dataKey="ahmedPairs"
                                  name="سحب أحمد (موظف)"
                                  fill="#38BDF8"
                                  radius={[6, 6, 0, 0]}
                                  maxBarSize={40}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {chartMode === 'models' && (
                    <>
                      {modelsChartData.length === 0 ? (
                        <div className="py-12 text-center text-xs text-purple-400 bg-[#0e061b] rounded-xl border border-purple-900/40">
                          لا توجد موديلات مبيعة في نطاق الفلترة المختار.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-purple-300 px-1">
                            <span className="flex items-center gap-1 text-amber-300 font-bold">
                              <span>👟 أكثر الأكواد والموديلات مبيعاً في هذا النطاق</span>
                            </span>
                            <span className="text-[11px] text-purple-400">
                              (مرتبة تنازلياً حسب إجمالي عدد الأزواج المبيعة)
                            </span>
                          </div>
                          <div className="w-full h-64 sm:h-72 bg-[#0e061b] p-2.5 rounded-xl border border-purple-900/50">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={modelsChartData}
                                margin={{ top: 12, right: 10, left: -10, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#2d164d" vertical={false} />
                                <XAxis
                                  dataKey="modelCode"
                                  stroke="#9333ea"
                                  tick={{ fill: '#d8b4fe', fontSize: 11, fontWeight: 'bold' }}
                                />
                                <YAxis
                                  stroke="#9333ea"
                                  tick={{ fill: '#d8b4fe', fontSize: 11 }}
                                  allowDecimals={false}
                                />
                                <Tooltip content={<ChartCustomTooltip />} />
                                <Legend
                                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                  formatter={(value) => (
                                    <span className="text-purple-200 font-bold">{value}</span>
                                  )}
                                />
                                <Bar
                                  dataKey="totalPairs"
                                  name="إجمالي الأزواج المبيعة"
                                  fill="#D946EF"
                                  radius={[6, 6, 0, 0]}
                                  maxBarSize={45}
                                >
                                  {modelsChartData.map((_, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        index === 0
                                          ? '#F59E0B' // Top 1 Gold
                                          : index === 1
                                          ? '#EC4899' // Top 2 Pink
                                          : index === 2
                                          ? '#8B5CF6' // Top 3 Purple
                                          : '#06B6D4' // Cyan
                                      }
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 3. VIEW TABS & SEARCH/EMPLOYEE FILTER BAR */}
            <div className="p-3 rounded-2xl bg-[#180c2c] border border-purple-800/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-purple-950/90 p-1 rounded-xl border border-purple-800/60">
                  <button
                    onClick={() => setActiveView('timeline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      activeView === 'timeline'
                        ? 'bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>سجل السحب بالساعة والدقائق والثواني (12 ساعة)</span>
                  </button>

                  <button
                    onClick={() => setActiveView('by_employee')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      activeView === 'by_employee'
                        ? 'bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>تفصيل كل موظف بـ يا ساعة سحب القطعة</span>
                  </button>

                  <button
                    onClick={() => setActiveView('by_model')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      activeView === 'by_model'
                        ? 'bg-gradient-to-r from-amber-500 to-fuchsia-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>الأكواد المبيعة ({modelSalesBreakdown.length})</span>
                  </button>
                </div>

                {/* Employee Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-purple-300 text-[11px] font-bold">الموظف:</span>
                  <button
                    onClick={() => setEmployeeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      employeeFilter === 'all'
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-purple-900/40 text-purple-300 hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  {REGISTERED_ADMINS.map((adm) => (
                    <button
                      key={adm.id}
                      onClick={() => setEmployeeFilter(adm.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        employeeFilter === adm.id
                          ? adm.isSupervisor
                            ? 'bg-amber-600 text-black font-black'
                            : 'bg-purple-600 text-white'
                          : 'bg-purple-900/40 text-purple-300 hover:text-white'
                      }`}
                    >
                      {adm.isSupervisor ? '👑' : '👤'} {adm.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بكود الحذاء (مثال IAV-101) أو اسم الموديل أو اللون أو القياس..."
                  className="w-full bg-[#11071f] text-white placeholder-purple-400/40 text-xs rounded-xl pr-9 pl-4 py-2 border border-purple-700/60 focus:outline-none focus:border-amber-400 font-bold"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-300 hover:text-white"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* 4. MAIN REPORT CONTENT */}
            {filteredSalesLogs.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-[#180c2c]/70 border border-purple-900/50 space-y-3">
                <Clock className="w-12 h-12 text-purple-400/40 mx-auto" />
                <div className="text-base font-black text-white">
                  لا توجد سجلات خصم / مبيعات في هذا التاريخ ({activeDateDescription})
                </div>
                <p className="text-xs text-purple-300/70 max-w-md mx-auto">
                  جرّب اختيار تاريخ آخر من الأعلى أو اضغط على &quot;كل التواريخ&quot; لعرض كافة عمليات السحب والمبيعات المسجلة في المستودع.
                </p>
                <button
                  onClick={() => {
                    setDateFilterMode('all');
                    setEmployeeFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition cursor-pointer"
                >
                  عرض جميع التواريخ والمبيعات
                </button>
              </div>
            ) : (
              <>
                {/* VIEW 1: TIMELINE WITH EXACT 12-HOUR (HOURS : MINUTES : SECONDS) */}
                {activeView === 'timeline' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-purple-300 px-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>
                          تفاصيل كل عملية سحب (الموظف + القطعة + الساعة والدقائق والثواني بتنسيق 12 ساعة):
                        </span>
                      </span>
                      <span className="font-bold text-amber-300">
                        المجموع: {totalSoldPairs} زوج مبيع
                      </span>
                    </div>

                    {filteredSalesLogs.map((log, index) => {
                      const time12 = formatTime12HourWithSeconds(log.timestamp);
                      const empKey = getEmployeeKey(log);
                      const isHuthaifa = empKey === 'حذيفة';

                      return (
                        <div
                          key={log.id}
                          className="p-3.5 sm:p-4 rounded-2xl bg-[#190d30] hover:bg-[#21113e] border border-purple-800/70 transition shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          {/* Right side: Employee + Shoe Details */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-mono text-purple-400 bg-purple-950/90 px-2 py-0.5 rounded border border-purple-800">
                                #{filteredSalesLogs.length - index}
                              </span>

                              {/* Employee Badge */}
                              <span
                                className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                                  isHuthaifa
                                    ? 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                                    : 'bg-fuchsia-950/90 text-fuchsia-200 border-fuchsia-600/60'
                                }`}
                              >
                                <span>{isHuthaifa ? '👑' : '👤'}</span>
                                <span>
                                  {isHuthaifa ? 'المشرف حذيفة' : `الموظف ${empKey}`} سحب قطعة
                                </span>
                              </span>

                              {/* Shoe Code */}
                              <span className="font-mono font-black text-sm text-white bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-600">
                                {log.shoeCode}
                              </span>

                              {log.shoeName && (
                                <span className="text-xs font-bold text-purple-200">
                                  {log.shoeName}
                                </span>
                              )}

                              {/* Color & Size */}
                              <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/50 px-2 py-0.5 rounded-lg border border-fuchsia-800/50">
                                اللون: {log.colorName}
                              </span>

                              <span className="text-xs font-bold text-purple-200 bg-purple-900/50 px-2 py-0.5 rounded-lg border border-purple-700/50">
                                {String(log.size).includes('كامل') || String(log.size).includes('مقاسات')
                                  ? log.size
                                  : `مقاس: ${log.size}`}
                              </span>

                              {log.actionLabel && (
                                <span className="text-[10px] font-bold text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/40">
                                  {log.actionLabel}
                                </span>
                              )}
                            </div>

                            {/* Detailed Arabic sentence of who pulled what and at what exact time */}
                            <div className="text-[11px] text-purple-200/90 bg-[#120722] px-3 py-1.5 rounded-xl border border-purple-900/60 flex flex-wrap items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>
                                سحب <strong>{isHuthaifa ? 'المشرف حذيفة' : `الموظف ${empKey}`}</strong> هذه القطعة بتاريخ{' '}
                                <strong className="text-white font-mono">{time12.dateAr}</strong> في تمام{' '}
                                <strong className="text-amber-300">{time12.detailedLabel}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Left side: Exact 12-Hour Clock (Hours : Minutes : Seconds) + Sold Pairs Count */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-purple-900/40">
                            {/* 12-Hour Digital Breakdown Box */}
                            <div className="bg-[#110620] border border-amber-500/50 rounded-2xl px-3 py-2 text-center shadow-inner">
                              <div className="text-[10px] text-amber-300/90 font-bold mb-1 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>وقت السحب (تنسيق 12 ساعة)</span>
                              </div>

                              {/* Segmented Hours : Minutes : Seconds */}
                              <div className="flex items-center justify-center gap-1.5" dir="ltr">
                                <div className="bg-purple-950 border border-purple-700/70 rounded-lg px-2 py-1 min-w-[42px]">
                                  <div className="text-sm font-black font-mono text-white leading-none">
                                    {time12.hours12}
                                  </div>
                                  <div className="text-[9px] text-purple-300 mt-0.5">ساعة</div>
                                </div>
                                <span className="font-black text-amber-400 text-sm">:</span>
                                <div className="bg-purple-950 border border-purple-700/70 rounded-lg px-2 py-1 min-w-[42px]">
                                  <div className="text-sm font-black font-mono text-amber-300 leading-none">
                                    {time12.minutes}
                                  </div>
                                  <div className="text-[9px] text-purple-300 mt-0.5">دقيقة</div>
                                </div>
                                <span className="font-black text-amber-400 text-sm">:</span>
                                <div className="bg-purple-950 border border-purple-700/70 rounded-lg px-2 py-1 min-w-[42px]">
                                  <div className="text-sm font-black font-mono text-fuchsia-300 leading-none">
                                    {time12.seconds}
                                  </div>
                                  <div className="text-[9px] text-purple-300 mt-0.5">ثانية</div>
                                </div>
                                <div
                                  className={`px-2 py-1 rounded-lg font-black text-xs border ${
                                    time12.periodAr === 'صباحاً'
                                      ? 'bg-sky-950/90 text-sky-300 border-sky-600/50'
                                      : 'bg-amber-950/90 text-amber-300 border-amber-600/50'
                                  }`}
                                >
                                  {time12.periodAr}
                                </div>
                              </div>
                            </div>

                            {/* Quantity Sold Badge */}
                            <div className="bg-rose-950/80 border border-rose-700/60 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px]">
                              <div className="text-[10px] text-rose-300 font-bold">الكمية المبيعة</div>
                              <div className="text-lg font-black text-white font-mono">
                                {log.quantityDecreased} زوج
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* VIEW 2: GROUPED BY EMPLOYEE WITH EXACT 12-HOUR TIMESTAMPS */}
                {activeView === 'by_employee' && (
                  <div className="space-y-4">
                    {employeeBreakdown
                      .filter((e) => employeeFilter === 'all' || e.id === employeeFilter)
                      .map((emp) => (
                        <div
                          key={emp.id}
                          className="p-4 rounded-2xl bg-[#190d30] border-2 border-purple-800/70 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-900/60">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{emp.isSupervisor ? '👑' : '👤'}</span>
                              <div>
                                <h4 className="text-base font-black text-white">
                                  سجل مواعيد سحب: {emp.displayName}
                                </h4>
                                <p className="text-xs text-purple-300/80">{emp.roleLabel}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="bg-purple-950 px-3 py-1.5 rounded-xl border border-purple-700 text-xs">
                                <span className="text-purple-300">عدد العمليات: </span>
                                <strong className="text-white font-mono">
                                  {emp.operationsCount}
                                </strong>
                              </div>
                              <div className="bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/50 text-xs">
                                <span className="text-amber-200">إجمالي ما سحبه: </span>
                                <strong className="text-amber-300 font-black font-mono text-sm">
                                  {emp.totalPairs} زوج
                                </strong>
                              </div>
                            </div>
                          </div>

                          {emp.logs.length === 0 ? (
                            <div className="text-center py-6 text-xs text-purple-400">
                              لم يقم {emp.displayName} بسحب أي قطعة في الفترة المحددة.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {emp.logs.map((log, i) => {
                                const t = formatTime12HourWithSeconds(log.timestamp);
                                return (
                                  <div
                                    key={log.id}
                                    className="p-3 rounded-xl bg-[#120722] border border-purple-900/60 flex flex-wrap items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-purple-400 font-mono font-bold">
                                        {i + 1}.
                                      </span>
                                      <span className="font-mono font-black text-white bg-purple-950 px-2 py-0.5 rounded border border-purple-700">
                                        {log.shoeCode}
                                      </span>
                                      {log.shoeName && (
                                        <span className="text-purple-200 font-bold">
                                          {log.shoeName}
                                        </span>
                                      )}
                                      <span className="text-fuchsia-300 font-bold">
                                        لون {log.colorName}
                                      </span>
                                      <span className="text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded">
                                        {String(log.size).includes('كامل')
                                          ? log.size
                                          : `مقاس ${log.size}`}
                                      </span>
                                      <span className="bg-rose-950 text-rose-300 font-black px-2 py-0.5 rounded border border-rose-800/50">
                                        {log.quantityDecreased} زوج
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[11px] font-mono text-purple-300 bg-purple-950/70 px-2 py-0.5 rounded">
                                        التاريخ: {t.dateAr}
                                      </span>
                                      <span className="font-mono font-black text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-600/50">
                                        الساعة {t.hours12}:{t.minutes}:{t.seconds} {t.periodAr}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* VIEW 3: SUMMARY BY MODEL SOLD ON SELECTED DATE */}
                {activeView === 'by_model' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {modelSalesBreakdown.map((m) => {
                      const lastTime = formatTime12HourWithSeconds(m.latestTimestamp);
                      return (
                        <div
                          key={m.code}
                          className="p-4 rounded-2xl bg-[#190d30] border border-purple-800/70 space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-purple-900/50">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-base text-white bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-700">
                                {m.code}
                              </span>
                              {m.name && (
                                <span className="text-xs font-bold text-purple-200">{m.name}</span>
                              )}
                            </div>
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-sm px-3 py-0.5 rounded-xl font-mono">
                              {m.totalPairs} زوج مبيع
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 text-xs">
                            {Object.entries(m.colors).map(([color, cnt]) => (
                              <span
                                key={color}
                                className="bg-purple-950/80 text-purple-200 px-2 py-0.5 rounded-lg border border-purple-800/60"
                              >
                                اللون {color}: <strong className="text-white">{cnt} زوج</strong>
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-purple-900/40 text-[11px] text-purple-300">
                            <div className="flex items-center gap-1.5">
                              <span>سحبه:</span>
                              {Object.entries(m.employees).map(([emp, cnt]) => (
                                <span
                                  key={emp}
                                  className="bg-fuchsia-950/80 text-fuchsia-200 px-2 py-0.5 rounded border border-fuchsia-800/50 font-bold"
                                >
                                  {emp}: {cnt} زوج
                                </span>
                              ))}
                            </div>
                            <span className="font-mono text-amber-300">
                              آخر سحب: {lastTime.fullTime12}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ================= FOOTER ================= */}
          <div className="p-3.5 sm:p-4 bg-[#180c2d] border-t border-purple-900/60 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="text-purple-300/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                جميع الأوقات معروضة بتنسيق الـ 12 ساعة (صباحاً / مساءً) مع الساعة والدقائق والثواني بدقة للمشرف حذيفة.
              </span>
            </div>
            <button
              onClick={onClose}
              className="bg-purple-800 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-xl border border-purple-600/50 transition cursor-pointer"
            >
              إغلاق التقرير
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
