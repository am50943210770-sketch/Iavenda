import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  TrendingDown,
  PlusCircle,
  User,
  Users,
  Layers,
  Clock,
  Printer,
  FileCheck,
  Check,
  ArrowRight,
  Package,
  Calendar,
  ShoppingBag,
} from 'lucide-react';
import { StockDeductionLog, AuthSession } from '../types/inventory';
import { formatTime12HourWithSeconds, REGISTERED_ADMINS } from '../utils/authStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deductions: StockDeductionLog[];
  currentSession: AuthSession;
  onOpenDailySalesReport?: () => void;
}

export const DeductionsTrackerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  deductions,
  currentSession,
  onOpenDailySalesReport,
}) => {
  const isSupervisor =
    currentSession.isSupervisor || currentSession.adminId === 'حذيفة';

  const [codeQuery, setCodeQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<'all' | 'deduct' | 'add'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'employees' | 'summary' | 'logs'>('employees');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(
    isSupervisor ? 'Safa' : currentSession.adminId
  );
  const [copySuccess, setCopySuccess] = useState(false);

  // Normalize employee ID from log entry
  const resolveAdminKey = (d: StockDeductionLog): string => {
    if (d.adminId.includes('حذيفة') || d.adminName.includes('حذيفة')) return 'حذيفة';
    if (
      d.adminId.includes('احمد') ||
      d.adminName.includes('احمد') ||
      d.adminId.includes('أحمد') ||
      d.adminName.includes('أحمد')
    ) {
      return 'احمد';
    }
    const matched = REGISTERED_ADMINS.find(
      (a) => a.id.toLowerCase() === d.adminId.trim().toLowerCase()
    );
    return matched ? matched.id : d.adminId;
  };

  // Base logs accessible to the current user:
  // - Supervisor (Huthaifa) sees EVERYTHING (who added a piece & who pulled a piece for ALL employees)
  // - Regular employee sees ONLY the pieces THEY personally pulled ("كل موضف يكدر يشوف القطع الهوا سحبها فقط")
  const accessibleLogs = useMemo(() => {
    if (isSupervisor) {
      return deductions;
    }
    const myKey = currentSession.adminId.trim().toLowerCase();
    return deductions.filter((d) => {
      const logKey = resolveAdminKey(d).toLowerCase();
      const isMine =
        logKey === myKey ||
        d.adminId.trim().toLowerCase() === myKey ||
        d.adminName.toLowerCase().includes(myKey);
      const isWithdrawal = d.operationCategory !== 'add';
      return isMine && isWithdrawal;
    });
  }, [deductions, isSupervisor, currentSession.adminId]);

  // Filter logs by employee (for supervisor), operation type (add vs deduct), code query, and date
  const filteredDeductions = useMemo(() => {
    return accessibleLogs.filter((item) => {
      const itemAdminKey = resolveAdminKey(item);
      const matchesEmployee =
        !isSupervisor ||
        employeeFilter === 'all' ||
        itemAdminKey.toLowerCase() === employeeFilter.toLowerCase() ||
        item.adminName.toLowerCase().includes(employeeFilter.toLowerCase());

      const itemCategory = item.operationCategory === 'add' ? 'add' : 'deduct';
      const matchesOperation =
        !isSupervisor || operationFilter === 'all' || itemCategory === operationFilter;

      const cleanCode = codeQuery.trim().toLowerCase();
      const matchesCode =
        !cleanCode ||
        item.shoeCode.toLowerCase().includes(cleanCode) ||
        (item.shoeName && item.shoeName.toLowerCase().includes(cleanCode)) ||
        item.colorName.toLowerCase().includes(cleanCode);

      const matchesDate =
        !dateFilter || formatTime12HourWithSeconds(item.timestamp).dateKey === dateFilter;

      return matchesEmployee && matchesOperation && matchesCode && matchesDate;
    });
  }, [accessibleLogs, isSupervisor, employeeFilter, operationFilter, codeQuery, dateFilter]);

  // Aggregate statistics by Employee
  const employeeSummaries = useMemo(() => {
    const empMap = new Map<
      string,
      {
        id: string;
        name: string;
        roleTitle: string;
        isSupervisor: boolean;
        totalPiecesWithdrawn: number;
        withdrawOperationCount: number;
        totalPiecesAdded: number;
        addOperationCount: number;
        items: StockDeductionLog[];
        shoesWithdrawnMap: Record<
          string,
          { code: string; name?: string; count: number; colors: Record<string, number> }
        >;
        shoesAddedMap: Record<
          string,
          { code: string; name?: string; count: number; colors: Record<string, number> }
        >;
      }
    >();

    if (isSupervisor) {
      REGISTERED_ADMINS.forEach((adm) => {
        empMap.set(adm.id, {
          id: adm.id,
          name: adm.id,
          roleTitle: adm.isSupervisor ? 'مشرف عام (صلاحيات كاملة)' : 'رتبة: موظف',
          isSupervisor: adm.isSupervisor,
          totalPiecesWithdrawn: 0,
          withdrawOperationCount: 0,
          totalPiecesAdded: 0,
          addOperationCount: 0,
          items: [],
          shoesWithdrawnMap: {},
          shoesAddedMap: {},
        });
      });
    } else {
      empMap.set(currentSession.adminId, {
        id: currentSession.adminId,
        name: currentSession.adminId,
        roleTitle: 'موظف',
        isSupervisor: false,
        totalPiecesWithdrawn: 0,
        withdrawOperationCount: 0,
        totalPiecesAdded: 0,
        addOperationCount: 0,
        items: [],
        shoesWithdrawnMap: {},
        shoesAddedMap: {},
      });
    }

    const sourceLogs = accessibleLogs.filter((d) => {
      const matchesDate =
        !dateFilter || formatTime12HourWithSeconds(d.timestamp).dateKey === dateFilter;
      const itemCategory = d.operationCategory === 'add' ? 'add' : 'deduct';
      const matchesOp =
        !isSupervisor || operationFilter === 'all' || itemCategory === operationFilter;
      return matchesDate && matchesOp;
    });

    sourceLogs.forEach((d) => {
      const adminKey = isSupervisor ? resolveAdminKey(d) : currentSession.adminId;

      if (!empMap.has(adminKey)) {
        empMap.set(adminKey, {
          id: adminKey,
          name: d.adminName || adminKey,
          roleTitle: 'موظف',
          isSupervisor: false,
          totalPiecesWithdrawn: 0,
          withdrawOperationCount: 0,
          totalPiecesAdded: 0,
          addOperationCount: 0,
          items: [],
          shoesWithdrawnMap: {},
          shoesAddedMap: {},
        });
      }

      const emp = empMap.get(adminKey)!;
      const isAdd = d.operationCategory === 'add';

      if (isAdd) {
        emp.totalPiecesAdded += d.quantityDecreased;
        emp.addOperationCount += 1;
        if (!emp.shoesAddedMap[d.shoeCode]) {
          emp.shoesAddedMap[d.shoeCode] = {
            code: d.shoeCode,
            name: d.shoeName,
            count: 0,
            colors: {},
          };
        }
        emp.shoesAddedMap[d.shoeCode].count += d.quantityDecreased;
        emp.shoesAddedMap[d.shoeCode].colors[d.colorName] =
          (emp.shoesAddedMap[d.shoeCode].colors[d.colorName] || 0) + d.quantityDecreased;
      } else {
        emp.totalPiecesWithdrawn += d.quantityDecreased;
        emp.withdrawOperationCount += 1;
        if (!emp.shoesWithdrawnMap[d.shoeCode]) {
          emp.shoesWithdrawnMap[d.shoeCode] = {
            code: d.shoeCode,
            name: d.shoeName,
            count: 0,
            colors: {},
          };
        }
        emp.shoesWithdrawnMap[d.shoeCode].count += d.quantityDecreased;
        emp.shoesWithdrawnMap[d.shoeCode].colors[d.colorName] =
          (emp.shoesWithdrawnMap[d.shoeCode].colors[d.colorName] || 0) + d.quantityDecreased;
      }

      emp.items.push(d);
    });

    return Array.from(empMap.values());
  }, [accessibleLogs, isSupervisor, currentSession.adminId, dateFilter, operationFilter]);

  // Aggregate statistics by Shoe Code
  const codeSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        name?: string;
        totalDecreased: number;
        totalAdded: number;
        colorBreakdown: Record<string, number>;
        sizeBreakdown: Record<string, number>;
        adminWithdrawnBreakdown: Record<string, number>;
        adminAddedBreakdown: Record<string, number>;
      }
    >();

    filteredDeductions.forEach((d) => {
      const key = d.shoeCode.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          code: d.shoeCode,
          name: d.shoeName,
          totalDecreased: 0,
          totalAdded: 0,
          colorBreakdown: {},
          sizeBreakdown: {},
          adminWithdrawnBreakdown: {},
          adminAddedBreakdown: {},
        });
      }
      const item = map.get(key)!;
      const isAdd = d.operationCategory === 'add';
      const empLabel = resolveAdminKey(d);

      if (isAdd) {
        item.totalAdded += d.quantityDecreased;
        item.adminAddedBreakdown[empLabel] =
          (item.adminAddedBreakdown[empLabel] || 0) + d.quantityDecreased;
      } else {
        item.totalDecreased += d.quantityDecreased;
        item.adminWithdrawnBreakdown[empLabel] =
          (item.adminWithdrawnBreakdown[empLabel] || 0) + d.quantityDecreased;
      }

      item.colorBreakdown[d.colorName] =
        (item.colorBreakdown[d.colorName] || 0) + d.quantityDecreased;
      const sizeKey = `${d.size}`;
      item.sizeBreakdown[sizeKey] = (item.sizeBreakdown[sizeKey] || 0) + d.quantityDecreased;
    });

    return Array.from(map.values());
  }, [filteredDeductions]);

  const overallTotalWithdrawn = useMemo(() => {
    return accessibleLogs
      .filter((d) => d.operationCategory !== 'add')
      .reduce((sum, d) => sum + d.quantityDecreased, 0);
  }, [accessibleLogs]);

  const overallTotalAdded = useMemo(() => {
    return accessibleLogs
      .filter((d) => d.operationCategory === 'add')
      .reduce((sum, d) => sum + d.quantityDecreased, 0);
  }, [accessibleLogs]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = employeeSummaries
      .map((emp) => {
        if (isSupervisor) {
          return `الموظف: ${emp.name} (${emp.roleTitle})\n- إجمالي ما سحبه: ${emp.totalPiecesWithdrawn} قطعة (${emp.withdrawOperationCount} عملية سحب)\n- إجمالي ما أضافه: ${emp.totalPiecesAdded} قطعة (${emp.addOperationCount} عملية إضافة)\n---------------------`;
        }
        return `الموظف: ${emp.name}\n- إجمالي القطع التي سحبتها: ${emp.totalPiecesWithdrawn} قطعة (${emp.withdrawOperationCount} عملية سحب)`;
      })
      .join('\n');

    const headerTitle = isSupervisor
      ? `تقرير المشرف العام (حذيفة) الشامل — من سحب قطعة ومن أضاف قطعة\nإجمالي المسحوبات: ${overallTotalWithdrawn} قطعة | إجمالي الإضافات: ${overallTotalAdded} قطعة`
      : `سجل القطع التي سحبها الموظف: ${currentSession.adminId}\nإجمالي القطع المسحوبة: ${overallTotalWithdrawn} قطعة`;

    const fullReport = `${headerTitle}\nتاريخ التقرير: ${new Date().toLocaleDateString('ar-IQ')}\n\n${summaryText}`;

    navigator.clipboard.writeText(fullReport).then(() => {
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
          className="relative w-full max-w-5xl my-auto rounded-3xl bg-[#140a25] border-2 border-fuchsia-600/60 shadow-2xl shadow-purple-950/90 flex flex-col max-h-[94vh] overflow-hidden text-white"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#290d3d] via-[#1f0b34] to-[#140b25] border-b border-purple-800/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white border border-fuchsia-400/40 shadow-lg shadow-fuchsia-600/30">
                {isSupervisor ? <Users className="w-6 h-6 text-white" /> : <Package className="w-6 h-6 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {isSupervisor
                      ? 'سجل الرقابة الشامل: منو سحب قطعة ومنو ضاف قطعة'
                      : `القطع التي سحبتها (${currentSession.adminId})`}
                  </h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      isSupervisor
                        ? 'text-amber-300 bg-amber-950/90 border-amber-500/60'
                        : 'text-purple-200 bg-purple-950/90 border-purple-500/60'
                    }`}
                  >
                    {isSupervisor ? (
                      <>
                        <span>👑 المشرف: حذيفة</span>
                        <span className="text-[10px] text-amber-200">(يرى جميع الموظفين: السحب والإضافة)</span>
                      </>
                    ) : (
                      <span>👤 مسحوباتك الشخصية فقط</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  {isSupervisor
                    ? 'يظهر للمشرف حذيفة جميع الموظفين والقطع التي سحبها أو أضافها كل موظف بالتوقيت الدقيق'
                    : 'يعرض هذا السجل القطع والأزواج التي قمت أنت بسحبها من المستودع فقط'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSupervisor && onOpenDailySalesReport && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenDailySalesReport();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black transition cursor-pointer shadow-md"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>تقرير المبيعات اليومي</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                title="طباعة السجل"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800 border border-purple-700/50 text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">طباعة</span>
              </button>

              <button
                onClick={handleCopySummary}
                title="نسخ التقرير"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fuchsia-950/60 hover:bg-fuchsia-900/70 border border-fuchsia-700/50 text-xs font-bold text-fuchsia-200 hover:text-white transition cursor-pointer"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">نسخ السجل</span>
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

          {/* Top Overview Strip */}
          <div className="p-4 bg-gradient-to-b from-[#1b0d34] to-[#16092b] border-b border-purple-900/60 space-y-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-purple-200">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-fuchsia-400" />
                <span>
                  {isSupervisor
                    ? 'إحصائيات جميع الموظفين (اضغط على أي موظف لعرض القطع التي سحبها أو أضافها):'
                    : `ملخص القطع التي سحبتها (${currentSession.adminId}):`}
                </span>
              </span>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="bg-rose-950/80 text-rose-200 px-2.5 py-1 rounded-lg border border-rose-700/50">
                  {isSupervisor ? 'إجمالي المسحوبات (منو سحب): ' : 'إجمالي ما سحبته: '}
                  <strong className="text-white text-xs font-mono">{overallTotalWithdrawn}</strong> قطعة
                </span>
                {isSupervisor && (
                  <span className="bg-emerald-950/80 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                    إجمالي الإضافات (منو ضاف):{' '}
                    <strong className="text-white text-xs font-mono">{overallTotalAdded}</strong> قطعة
                  </span>
                )}
              </div>
            </div>

            {/* Cards Grid: All employees for Huthaifa, or Single Personal Card for Employee */}
            <div
              className={`grid gap-2.5 ${
                isSupervisor
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-h-48 overflow-y-auto pr-1'
                  : 'grid-cols-1'
              }`}
            >
              {employeeSummaries.map((emp) => {
                const isHuthaifa = emp.id === 'حذيفة';
                const isSelected = isSupervisor && employeeFilter === emp.id;

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      if (!isSupervisor) return;
                      setEmployeeFilter(isSelected ? 'all' : emp.id);
                      setActiveTab('employees');
                    }}
                    className={`relative p-3 rounded-2xl border transition-all ${
                      isSupervisor ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-gradient-to-br from-fuchsia-900/50 via-[#271045] to-[#1c0b32] border-fuchsia-400 shadow-lg ring-2 ring-fuchsia-400/40'
                        : isHuthaifa
                        ? 'bg-[#1e0f38] border-amber-600/50 hover:border-amber-400'
                        : 'bg-[#180c2f] border-purple-700/50 hover:border-purple-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border shrink-0 ${
                            isHuthaifa
                              ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 text-black border-amber-300'
                              : 'bg-gradient-to-tr from-purple-700 to-fuchsia-600 text-white border-purple-400'
                          }`}
                        >
                          {isHuthaifa ? '👑' : '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-black text-white">{emp.name}</h4>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                isHuthaifa
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                  : 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                              }`}
                            >
                              {isHuthaifa ? 'مشرف' : 'موظف'}
                            </span>
                          </div>
                          <div className="text-[10px] text-purple-300/80 mt-0.5">
                            {emp.withdrawOperationCount} سحب
                            {isSupervisor ? ` • ${emp.addOperationCount} إضافة` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0 space-y-1">
                        <div className="bg-rose-950/80 border border-rose-700/50 px-2 py-0.5 rounded-lg text-[11px] font-black text-rose-200">
                          سحب: <span className="text-white font-mono">{emp.totalPiecesWithdrawn}</span>
                        </div>
                        {isSupervisor && (
                          <div className="bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-lg text-[11px] font-black text-emerald-200">
                            ضاف: <span className="text-white font-mono">{emp.totalPiecesAdded}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search, Operation Filter (for Supervisor), & Navigation Tabs */}
          <div className="p-3.5 bg-[#170c2c] border-b border-purple-900/50 space-y-2.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-purple-950/90 p-1 rounded-xl border border-purple-800/60">
                <button
                  onClick={() => setActiveTab('employees')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'employees'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>
                    {isSupervisor ? 'القطع حسب كل موظف' : 'القطع والأكواد التي سحبتها'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'logs'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isSupervisor
                      ? 'السجل المباشر (منو ضاف ومنو سحب)'
                      : 'سجل أوقات سحبي للقطع'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'summary'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ملخص الأكواد</span>
                </button>
              </div>

              {/* Operation Filter for Supervisor: All vs Who Pulled vs Who Added */}
              {isSupervisor && (
                <div className="flex items-center gap-1 bg-purple-950/90 p-1 rounded-xl border border-purple-800/60">
                  <button
                    onClick={() => setOperationFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      operationFilter === 'all'
                        ? 'bg-fuchsia-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    الكل (سحب وإضافة)
                  </button>
                  <button
                    onClick={() => setOperationFilter('deduct')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      operationFilter === 'deduct'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-rose-300 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>منو سحب قطعة</span>
                  </button>
                  <button
                    onClick={() => setOperationFilter('add')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      operationFilter === 'add'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>منو ضاف قطعة</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick employee filter pills (Supervisor only) */}
            {isSupervisor && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-purple-400">تصفية حسب الموظف:</span>
                <button
                  onClick={() => setEmployeeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    employeeFilter === 'all'
                      ? 'bg-fuchsia-600 text-white shadow'
                      : 'bg-purple-900/40 text-purple-300 hover:text-white border border-purple-800/40'
                  }`}
                >
                  جميع الموظفين
                </button>
                {REGISTERED_ADMINS.map((adm) => (
                  <button
                    key={adm.id}
                    onClick={() => setEmployeeFilter(adm.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      employeeFilter === adm.id
                        ? adm.isSupervisor
                          ? 'bg-amber-600 text-black font-black shadow'
                          : 'bg-purple-600 text-white shadow'
                        : 'bg-purple-900/40 text-purple-300 hover:text-white border border-purple-800/40'
                    }`}
                  >
                    {adm.isSupervisor ? '👑' : '👤'} {adm.id}
                  </button>
                ))}
              </div>
            )}

            {/* Search Input & Date Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-purple-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value)}
                  placeholder="ابحث بكود الحذاء (مثال: IAV-101) أو اسم الموديل أو اللون..."
                  className="w-full bg-[#11071e] text-white placeholder-purple-400/40 text-xs sm:text-sm rounded-xl pr-10 pl-4 py-2 border border-purple-700/70 focus:outline-none focus:border-fuchsia-400 font-bold"
                />
                {codeQuery && (
                  <button
                    onClick={() => setCodeQuery('')}
                    className="absolute inset-y-0 left-0 flex items-center pl-3 text-purple-400 hover:text-white text-xs"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-[#11071e] px-3 py-2 rounded-xl border border-purple-700/70 text-xs">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-purple-300 font-bold whitespace-nowrap">فلترة بالتاريخ:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="text-rose-300 hover:text-white font-bold text-[11px]"
                  >
                    الكل
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Body Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[52vh] scrollbar-thin scrollbar-thumb-purple-700">
            {/* Tab 1: Detailed Breakdown per Employee */}
            {activeTab === 'employees' && (
              <div className="space-y-4">
                {employeeSummaries
                  .filter(
                    (emp) =>
                      !isSupervisor || employeeFilter === 'all' || emp.id === employeeFilter
                  )
                  .map((emp) => {
                    const isHuthaifa = emp.id === 'حذيفة';
                    const shoesWithdrawnList = Object.values(emp.shoesWithdrawnMap);
                    const shoesAddedList = Object.values(emp.shoesAddedMap);

                    return (
                      <div
                        key={emp.id}
                        className="rounded-2xl bg-[#190d30] border-2 border-purple-800/60 p-4 sm:p-5 shadow-xl shadow-purple-950/60 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-purple-900/60 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{isHuthaifa ? '👑' : '👤'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base sm:text-lg font-black text-white">
                                  {isSupervisor
                                    ? `سجل الموظف: ${emp.name}`
                                    : `القطع التي قمت بسحبها (${emp.name})`}
                                </h4>
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                                    isHuthaifa
                                      ? 'bg-amber-950 text-amber-300 border-amber-700/50'
                                      : 'bg-purple-950 text-purple-300 border-purple-700/50'
                                  }`}
                                >
                                  {emp.roleTitle}
                                </span>
                              </div>
                              <p className="text-xs text-purple-300/70 mt-0.5">
                                سحب{' '}
                                <strong className="text-rose-300 font-bold">
                                  {emp.totalPiecesWithdrawn} قطعة
                                </strong>{' '}
                                ({emp.withdrawOperationCount} عملية)
                                {isSupervisor && (
                                  <>
                                    {' '}
                                    • وأضاف{' '}
                                    <strong className="text-emerald-300 font-bold">
                                      {emp.totalPiecesAdded} قطعة
                                    </strong>{' '}
                                    ({emp.addOperationCount} عملية)
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="bg-rose-950/70 border border-rose-700/60 px-3 py-1.5 rounded-xl text-center">
                              <div className="text-[10px] text-rose-300">إجمالي المسحوبات:</div>
                              <div className="text-base font-black text-white font-mono">
                                {emp.totalPiecesWithdrawn} قطعة
                              </div>
                            </div>
                            {isSupervisor && (
                              <div className="bg-emerald-950/70 border border-emerald-700/60 px-3 py-1.5 rounded-xl text-center">
                                <div className="text-[10px] text-emerald-300">إجمالي الإضافات:</div>
                                <div className="text-base font-black text-white font-mono">
                                  {emp.totalPiecesAdded} قطعة
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Section A: Models & Pieces Pulled (القطع التي سحبها) */}
                        {operationFilter !== 'add' && (
                          <div>
                            <div className="text-xs font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                              <span>
                                {isSupervisor
                                  ? `القطع والأكواد التي سحبها (${emp.name}):`
                                  : 'القطع والأكواد التي قمت بسحبها:'}
                              </span>
                            </div>

                            {shoesWithdrawnList.length === 0 ? (
                              <div className="p-3 rounded-xl bg-purple-950/30 text-center text-xs text-purple-400 border border-purple-900/40">
                                {isSupervisor
                                  ? `لم يقم ${emp.name} بسحب أي قطعة حتى الآن.`
                                  : 'لم تقم بسحب أي قطعة من المستودع حتى الآن.'}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {shoesWithdrawnList.map((shoe) => (
                                  <div
                                    key={`withdrawn-${shoe.code}`}
                                    className="p-3 rounded-xl bg-[#140827] border border-rose-800/50 space-y-1.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-white bg-purple-950 px-2 py-0.5 rounded border border-purple-700 text-xs">
                                          {shoe.code}
                                        </span>
                                        {shoe.name && (
                                          <span className="text-purple-200 font-bold truncate max-w-[140px]">
                                            {shoe.name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-black text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 text-xs">
                                        سحب {shoe.count} قطعة
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-purple-900/40">
                                      {Object.entries(shoe.colors).map(([color, cnt]) => (
                                        <span
                                          key={color}
                                          className="text-[10px] bg-purple-900/40 text-purple-200 px-2 py-0.5 rounded-md border border-purple-800/40"
                                        >
                                          {color}: <strong className="text-white">{cnt}</strong>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Section B: Models & Pieces Added (القطع التي أضافها - يظهر للمشرف حذيفة فقط) */}
                        {isSupervisor && operationFilter !== 'deduct' && shoesAddedList.length > 0 && (
                          <div className="pt-2">
                            <div className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>القطع والأكواد التي أضافها ({emp.name}):</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {shoesAddedList.map((shoe) => (
                                <div
                                  key={`added-${shoe.code}`}
                                  className="p-3 rounded-xl bg-[#0e221d] border border-emerald-700/50 space-y-1.5 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-black text-white bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 text-xs">
                                        {shoe.code}
                                      </span>
                                      {shoe.name && (
                                        <span className="text-emerald-100 font-bold truncate max-w-[140px]">
                                          {shoe.name}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-black text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700/60 text-xs">
                                      +{shoe.count} قطعة مضافة
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-emerald-900/40">
                                    {Object.entries(shoe.colors).map(([color, cnt]) => (
                                      <span
                                        key={color}
                                        className="text-[10px] bg-emerald-900/40 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-800/40"
                                      >
                                        {color}: <strong className="text-white">+{cnt}</strong>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detailed timestamped operations for this employee */}
                        {emp.items.length > 0 && (
                          <div className="pt-2">
                            <button
                              onClick={() =>
                                setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)
                              }
                              className="text-xs text-purple-300 hover:text-white flex items-center gap-1 font-bold transition cursor-pointer"
                            >
                              <span>
                                {expandedEmployee === emp.id
                                  ? 'إخفاء السجل التفصيلي بالوقت والتاريخ'
                                  : `عرض السجل التفصيلي بالوقت والتاريخ (${emp.items.length} عملية)`}
                              </span>
                              <ArrowRight
                                className={`w-3.5 h-3.5 transition-transform ${
                                  expandedEmployee === emp.id ? 'rotate-90' : ''
                                }`}
                              />
                            </button>

                            {expandedEmployee === emp.id && (
                              <div className="mt-2 space-y-1.5 pl-2 border-r-2 border-purple-600/40 pr-2">
                                {emp.items.map((log) => {
                                  const t12 = formatTime12HourWithSeconds(log.timestamp);
                                  const isAdd = log.operationCategory === 'add';
                                  return (
                                    <div
                                      key={log.id}
                                      className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
                                        isAdd
                                          ? 'bg-[#0d211d] border-emerald-800/50'
                                          : 'bg-[#120722] border-purple-900/40'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`font-black px-2 py-0.5 rounded border text-[11px] ${
                                            isAdd
                                              ? 'text-emerald-300 bg-emerald-950/80 border-emerald-700/60'
                                              : 'text-amber-300 bg-amber-950/70 border-amber-700/50'
                                          }`}
                                        >
                                          {isAdd
                                            ? `➕ ${emp.name} ضاف قطعة`
                                            : `🔻 ${emp.name} سحب قطعة`}
                                        </span>
                                        <span className="font-mono text-white font-bold bg-purple-950 px-1.5 py-0.5 rounded border border-purple-700">
                                          {log.shoeCode}
                                        </span>
                                        {log.shoeName && (
                                          <span className="text-purple-200 font-bold">
                                            {log.shoeName}
                                          </span>
                                        )}
                                        <span className="text-purple-300 font-bold">
                                          لون {log.colorName}
                                        </span>
                                        <span className="bg-purple-900/50 text-purple-200 text-[10px] px-1.5 py-0.5 rounded">
                                          {String(log.size).includes('كامل') ||
                                          String(log.size).includes('مقاسات') ||
                                          String(log.size).includes('جديد')
                                            ? log.size
                                            : `مقاس ${log.size}`}
                                        </span>
                                        {log.actionLabel && (
                                          <span className="text-[10px] text-fuchsia-300 bg-fuchsia-950/70 px-1.5 py-0.5 rounded border border-fuchsia-800/50">
                                            {log.actionLabel}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/50">
                                          {t12.dateAr}
                                        </span>
                                        <span className="text-[11px] font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50">
                                          الساعة {t12.hours12}:{t12.minutes}:{t12.seconds}{' '}
                                          {t12.periodAr}
                                        </span>
                                        <span
                                          className={`font-black px-2 py-0.5 rounded text-[11px] border ${
                                            isAdd
                                              ? 'text-emerald-300 bg-emerald-950 border-emerald-800/60'
                                              : 'text-rose-300 bg-rose-950 border-rose-800/50'
                                          }`}
                                        >
                                          {isAdd ? `+${log.quantityDecreased}` : `-${log.quantityDecreased}`} قطعة
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Tab 2: Summary by Code */}
            {activeTab === 'summary' && (
              <div className="space-y-3">
                {codeSummaries.length === 0 ? (
                  <div className="text-center py-12 bg-purple-950/20 rounded-2xl border border-purple-900/40 p-4">
                    <TrendingDown className="w-10 h-10 text-purple-400/50 mx-auto mb-2" />
                    <p className="text-purple-200 font-bold text-sm">
                      لا توجد سجلات تطابق البحث الحالي
                    </p>
                  </div>
                ) : (
                  codeSummaries.map((item) => (
                    <div
                      key={item.code}
                      className="p-4 rounded-2xl bg-[#190d30] border border-purple-800/70 hover:border-fuchsia-500/60 transition shadow-lg shadow-purple-950/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-purple-900/50 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base font-mono bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-700">
                            {item.code}
                          </span>
                          {item.name && (
                            <span className="text-xs text-purple-200 font-bold">{item.name}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.totalDecreased > 0 && (
                            <div className="flex items-center gap-1.5 bg-rose-950/60 px-3 py-1 rounded-xl border border-rose-800/60 text-rose-200 text-xs">
                              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                              <span>مسحوب:</span>
                              <strong className="text-white font-black text-sm">
                                {item.totalDecreased} قطعة
                              </strong>
                            </div>
                          )}
                          {isSupervisor && item.totalAdded > 0 && (
                            <div className="flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800/60 text-emerald-200 text-xs">
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>مضاف:</span>
                              <strong className="text-white font-black text-sm">
                                +{item.totalAdded} قطعة
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Color breakdown */}
                      <div>
                        <div className="text-[11px] font-bold text-purple-300 mb-1.5 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-fuchsia-400" />
                          <span>الألوان:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(item.colorBreakdown).map(([color, count]) => (
                            <div
                              key={color}
                              className="flex items-center gap-1.5 bg-purple-950/70 border border-purple-800/60 px-2.5 py-1 rounded-lg text-xs"
                            >
                              <span className="font-bold text-white">{color}:</span>
                              <span className="font-black text-fuchsia-300 bg-fuchsia-950/80 px-1.5 py-0.2 rounded border border-fuchsia-800/40">
                                {count} قطعة
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sizes & Admins */}
                      <div className="pt-2 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-purple-400">التفاصيل:</span>
                          {Object.entries(item.sizeBreakdown).map(([sz, qty]) => (
                            <span
                              key={sz}
                              className="bg-purple-900/30 text-purple-200 text-[11px] px-2 py-0.5 rounded-md border border-purple-800/50"
                            >
                              {sz}: ({qty})
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          {Object.entries(item.adminWithdrawnBreakdown).map(([admin, qty]) => (
                            <span
                              key={`w-${admin}`}
                              className="text-rose-200 font-bold bg-rose-950/70 px-2 py-0.5 rounded border border-rose-800/50"
                            >
                              🔻 سحب {admin}: {qty} قطعة
                            </span>
                          ))}
                          {isSupervisor &&
                            Object.entries(item.adminAddedBreakdown).map(([admin, qty]) => (
                              <span
                                key={`a-${admin}`}
                                className="text-emerald-200 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/50"
                              >
                                ➕ ضاف {admin}: +{qty} قطعة
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Chronological Log */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {filteredDeductions.length === 0 ? (
                  <div className="text-center py-12 bg-purple-950/20 rounded-2xl border border-purple-900/40 p-4">
                    <Clock className="w-10 h-10 text-purple-400/50 mx-auto mb-2" />
                    <p className="text-purple-200 font-bold text-sm">لا توجد عمليات مسجلة</p>
                  </div>
                ) : (
                  filteredDeductions.map((d) => {
                    const empDisplay = resolveAdminKey(d);
                    const t12 = formatTime12HourWithSeconds(d.timestamp);
                    const isAdd = d.operationCategory === 'add';
                    return (
                      <div
                        key={d.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                          isAdd
                            ? 'bg-[#0e221d] border-emerald-800/60 hover:bg-[#122b25]'
                            : 'bg-[#180d2d] border-purple-900/60 hover:bg-[#1f1038]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg border ${
                              isAdd
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50'
                                : 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                            }`}
                          >
                            {isAdd ? (
                              <PlusCircle className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`font-black px-2 py-0.5 rounded border ${
                                  isAdd
                                    ? 'text-emerald-300 bg-emerald-950/90 border-emerald-600/60'
                                    : 'text-amber-300 bg-amber-950/80 border-amber-700/50'
                                }`}
                              >
                                {isAdd
                                  ? `➕ الموظف ${empDisplay} ضاف قطعة`
                                  : `🔻 الموظف ${empDisplay} سحب قطعة`}
                              </span>
                              <span className="font-bold text-white font-mono bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                                {d.shoeCode}
                              </span>
                              {d.shoeName && (
                                <span className="text-purple-200 font-bold">{d.shoeName}</span>
                              )}
                              <span className="text-purple-300 font-bold">لون {d.colorName}</span>
                              <span className="text-[11px] text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded">
                                {String(d.size).includes('كامل') ||
                                String(d.size).includes('مقاسات') ||
                                String(d.size).includes('جديد')
                                  ? d.size
                                  : `مقاس ${d.size}`}
                              </span>
                              {d.actionLabel && (
                                <span className="text-[10px] text-fuchsia-300 bg-fuchsia-950/70 px-1.5 py-0.5 rounded border border-fuchsia-800/50">
                                  {d.actionLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-purple-300 mt-1.5 flex flex-wrap items-center gap-2">
                              <span>
                                المنفذ:{' '}
                                <strong className="text-amber-300">
                                  {d.adminName || d.adminId}
                                </strong>
                              </span>
                              <span>•</span>
                              <span className="font-mono text-purple-200">
                                التاريخ: {t12.dateAr}
                              </span>
                              <span>•</span>
                              <span className="font-mono font-black text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-700/50">
                                الساعة {t12.hours12}:{t12.minutes}:{t12.seconds} {t12.periodAr}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`font-black text-sm px-2.5 py-1 rounded-lg border shrink-0 ${
                            isAdd
                              ? 'text-emerald-300 bg-emerald-950/90 border-emerald-700/60'
                              : 'text-rose-300 bg-rose-950/80 border-rose-800/60'
                          }`}
                        >
                          {isAdd ? `+${d.quantityDecreased}` : `-${d.quantityDecreased}`} قطعة
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 bg-[#190d30] border-t border-purple-900/50 flex items-center justify-between text-xs shrink-0">
            <span className="text-purple-300/70">
              {isSupervisor
                ? 'صلاحية المشرف العام (حذيفة): اطلاع كامل على من سحب قطعة ومن أضاف قطعة من جميع الموظفين'
                : `سجل مسحوباتك الشخصية فقط (${currentSession.adminId})`}
            </span>
            <button
              onClick={onClose}
              className="bg-purple-800/70 hover:bg-purple-700 text-white font-bold px-6 py-1.5 rounded-xl border border-purple-600/40 transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
