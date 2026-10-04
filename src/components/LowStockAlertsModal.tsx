import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  AlertTriangle,
  PackageOpen,
  ShoppingCart,
  Search,
  Printer,
  FileCheck,
  Check,
  Plus,
  Layers,
  Eye,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { ShoeItem, ColorVariant, AuthSession } from '../types/inventory';
import { calculateTotalPairs } from '../utils/storage';

export interface LowStockSizeItem {
  shoeId: string;
  shoeCode: string;
  shoeName?: string;
  primaryImage: string;
  additionalInfo: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  size: number | string;
  quantity: number;
  colorTotalQuantity: number;
}

export interface LowStockModelReorder {
  shoe: ShoeItem;
  totalShoePairs: number;
  lowColors: {
    color: ColorVariant;
    colorTotal: number;
    isWholeColorLow: boolean;
    lowSizes: { size: number | string; quantity: number }[];
  }[];
  totalLowSizesCount: number;
  outOfStockSizesCount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shoes: ShoeItem[];
  currentSession: AuthSession;
  threshold?: number; // Default 5 as requested ("اله ٥")
  onThresholdChange?: (newThreshold: number) => void;
  onSelectShoe: (shoe: ShoeItem) => void;
  onQuickRestockSize?: (
    shoeId: string,
    colorId: string,
    size: number | string,
    addedQty: number
  ) => void;
}

export const LowStockAlertsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shoes,
  currentSession,
  threshold = 5,
  onThresholdChange,
  onSelectShoe,
  onQuickRestockSize,
}) => {
  const [activeTab, setActiveTab] = useState<'reorder_models' | 'all_low_sizes'>('reorder_models');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'out_of_stock' | 'critical_2' | 'up_to_5'>('all');
  const [copySuccess, setCopySuccess] = useState(false);
  const [restockedFeedback, setRestockedFeedback] = useState<string | null>(null);

  // Build list of Models needing reorder and individual low-stock sizes/colors (quantity <= threshold, default 5)
  const { reorderModels, lowSizeItems } = useMemo(() => {
    const models: LowStockModelReorder[] = [];
    const sizesList: LowStockSizeItem[] = [];

    shoes.forEach((shoe) => {
      const lowColorsForShoe: LowStockModelReorder['lowColors'] = [];
      let shoeLowSizesCount = 0;
      let shoeOutOfStockCount = 0;

      shoe.colors.forEach((color) => {
        const colorTotal = color.sizes.reduce((sum, s) => sum + s.quantity, 0);
        const isWholeColorLow = colorTotal <= threshold;

        const matchingLowSizes = color.sizes.filter((sz) => {
          const isLow = sz.quantity <= threshold || isWholeColorLow;
          if (!isLow) return false;

          if (severityFilter === 'out_of_stock') return sz.quantity === 0;
          if (severityFilter === 'critical_2') return sz.quantity <= 2;
          return sz.quantity <= threshold;
        });

        if (matchingLowSizes.length > 0 || (isWholeColorLow && severityFilter === 'all')) {
          lowColorsForShoe.push({
            color,
            colorTotal,
            isWholeColorLow,
            lowSizes: matchingLowSizes.map((s) => ({ size: s.size, quantity: s.quantity })),
          });

          matchingLowSizes.forEach((sz) => {
            shoeLowSizesCount += 1;
            if (sz.quantity === 0) shoeOutOfStockCount += 1;

            sizesList.push({
              shoeId: shoe.id,
              shoeCode: shoe.code,
              shoeName: shoe.name,
              primaryImage: color.images[0] || shoe.primaryImage,
              additionalInfo: shoe.additionalInfo,
              colorId: color.id,
              colorName: color.colorName,
              colorHex: color.colorHex,
              size: sz.size,
              quantity: sz.quantity,
              colorTotalQuantity: colorTotal,
            });
          });
        }
      });

      if (lowColorsForShoe.length > 0) {
        models.push({
          shoe,
          totalShoePairs: calculateTotalPairs(shoe),
          lowColors: lowColorsForShoe,
          totalLowSizesCount: shoeLowSizesCount,
          outOfStockSizesCount: shoeOutOfStockCount,
        });
      }
    });

    // Sort models by most urgent (lowest stock / most out-of-stock sizes first)
    models.sort((a, b) => {
      if (b.outOfStockSizesCount !== a.outOfStockSizesCount) {
        return b.outOfStockSizesCount - a.outOfStockSizesCount;
      }
      return b.totalLowSizesCount - a.totalLowSizesCount;
    });

    sizesList.sort((a, b) => a.quantity - b.quantity);

    return { reorderModels: models, lowSizeItems: sizesList };
  }, [shoes, threshold, severityFilter]);

  // Apply search query
  const filteredReorderModels = useMemo(() => {
    if (!searchQuery.trim()) return reorderModels;
    const q = searchQuery.trim().toLowerCase();
    return reorderModels.filter(
      (m) =>
        m.shoe.code.toLowerCase().includes(q) ||
        (m.shoe.name && m.shoe.name.toLowerCase().includes(q)) ||
        m.lowColors.some((c) => c.color.colorName.toLowerCase().includes(q))
    );
  }, [reorderModels, searchQuery]);

  const filteredLowSizeItems = useMemo(() => {
    if (!searchQuery.trim()) return lowSizeItems;
    const q = searchQuery.trim().toLowerCase();
    return lowSizeItems.filter(
      (item) =>
        item.shoeCode.toLowerCase().includes(q) ||
        (item.shoeName && item.shoeName.toLowerCase().includes(q)) ||
        item.colorName.toLowerCase().includes(q) ||
        String(item.size).toLowerCase().includes(q)
    );
  }, [lowSizeItems, searchQuery]);

  if (!isOpen) return null;

  const isSupervisor =
    currentSession.isSupervisor ||
    currentSession.adminId === 'حذيفة' ||
    currentSession.adminId === 'admin 1';

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
              تنبيهات المخزون المنخفض وإعادة الطلب خاصة بالمشرف فقط
            </h3>
            <p className="my-4 text-xs text-rose-200/90 leading-relaxed">
              عذراً، هذه القائمة مخصصة للمشرف العام <strong>(حذيفة)</strong> فقط لمتابعة نواقص القياسات والألوان التي وصلت إلى {threshold} أو أقل وإعادة طلبها.
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

  const handleCopyReorderList = () => {
    const lines = filteredReorderModels.map((item, idx) => {
      const colorsDetails = item.lowColors
        .map((c) => {
          const sizesStr = c.lowSizes
            .map((s) => `مقاس ${s.size} (متبقي: ${s.quantity})`)
            .join(' ، ');
          return `   • اللون ${c.color.colorName} [إجمالي اللون: ${c.colorTotal} زوج]: ${sizesStr}`;
        })
        .join('\n');

      return `${idx + 1}. كود الموديل: ${item.shoe.code} ${
        item.shoe.name ? `(${item.shoe.name})` : ''
      }\n${colorsDetails}`;
    });

    const reportText = [
      `⚠️ قائمة الموديلات التي تحتاج إعادة طلب من المستودع (الكمية ${threshold} أو أقل)`,
      `👑 المشرف العام: حذيفة | شركة Iavenda للأحذية`,
      `📅 تاريخ الجرد: ${new Date().toLocaleDateString('ar-IQ')}`,
      `📦 عدد الموديلات المحتاجة لإعادة طلب: ${filteredReorderModels.length} موديل`,
      `👟 إجمالي القياسات المنخفضة (≤ ${threshold}): ${filteredLowSizeItems.length} قياس`,
      `----------------------------------------`,
      ...lines,
    ].join('\n\n');

    navigator.clipboard.writeText(reportText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  const handleTriggerQuickRestock = (
    shoeId: string,
    colorId: string,
    size: number | string,
    addedQty: number
  ) => {
    if (!onQuickRestockSize) return;
    onQuickRestockSize(shoeId, colorId, size, addedQty);
    const key = `${shoeId}-${colorId}-${size}`;
    setRestockedFeedback(key);
    setTimeout(() => {
      setRestockedFeedback((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  const outOfStockCount = lowSizeItems.filter((i) => i.quantity === 0).length;
  const criticalTwoOrLessCount = lowSizeItems.filter((i) => i.quantity > 0 && i.quantity <= 2).length;
  const threeToFiveCount = lowSizeItems.filter((i) => i.quantity >= 3 && i.quantity <= 5).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl my-auto rounded-3xl bg-[#140923] border-2 border-amber-500/70 shadow-2xl shadow-purple-950/95 flex flex-col max-h-[95vh] overflow-hidden text-white"
          dir="rtl"
        >
          {/* ================= HEADER ================= */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/80 via-[#250f39] to-[#150924] border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-black border border-amber-300/60 shadow-lg shadow-amber-500/30">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black text-white">
                    تنبيهات المخزون المنخفض وقائمة إعادة الطلب
                  </h2>
                  <span className="text-xs font-black text-black bg-amber-400 px-3 py-0.5 rounded-full border border-amber-200">
                    👑 للمشرف حذيفة فقط • حد التنبيه: {threshold} أو أقل
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1">
                  رصد فوري لأي قياس أو لون وصلت كميته إلى <strong>{threshold} أزواج أو أقل</strong> مع قائمة الموديلات التي تحتاج إعادة طلب من المستودع
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/50 hover:bg-purple-800 border border-purple-700/50 text-xs font-bold text-purple-200 hover:text-white transition cursor-pointer"
                title="طباعة قائمة إعادة الطلب"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">طباعة القائمة</span>
              </button>

              <button
                onClick={handleCopyReorderList}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition cursor-pointer shadow-md"
                title="نسخ قائمة الموديلات التي تحتاج إعادة طلب"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-900" />
                    <span>تم نسخ طلبية المستودع</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>نسخ قائمة إعادة الطلب</span>
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
            {/* 1. SUMMARY KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-600/25 to-[#1c0c30] border-2 border-amber-500/60">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>موديلات تحتاج إعادة طلب</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                  {reorderModels.length} <span className="text-xs font-bold text-amber-300">موديل</span>
                </div>
                <div className="text-[10px] text-purple-300 mt-1">
                  تحتوي على ألوان أو قياسات ≤ {threshold}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1a0d2e] border border-purple-700/60">
                <div className="text-[11px] font-bold text-purple-300">
                  إجمالي القياسات المنخفضة (≤ {threshold})
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-1">
                  {lowSizeItems.length} <span className="text-xs font-bold text-purple-300">قياس</span>
                </div>
                <div className="text-[10px] text-purple-400 mt-1">
                  منها {threeToFiveCount} قياس بكمية (3 إلى 5)
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#220d26] border border-rose-700/60">
                <div className="text-[11px] font-bold text-rose-300">
                  قياسات حرجة جداً (1 إلى 2 زوج)
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-300 font-mono mt-1">
                  {criticalTwoOrLessCount}{' '}
                  <span className="text-xs font-bold text-rose-200/80">قياس</span>
                </div>
                <div className="text-[10px] text-rose-300/70 mt-1">توشك على النفاد تماماً</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/50 border-2 border-rose-600/70">
                <div className="text-[11px] font-black text-rose-200">
                  قياسات نافذة تماماً (0 زوج)
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                  {outOfStockCount} <span className="text-xs font-bold text-rose-300">قياس</span>
                </div>
                <div className="text-[10px] text-rose-200/80 mt-1">تحتاج تعبئة فورية من المستودع</div>
              </div>
            </div>

            {/* 2. FILTER & VIEW CONTROLS */}
            <div className="p-3.5 rounded-2xl bg-[#190d2e] border border-purple-800/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Main View Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-purple-950/90 p-1 rounded-xl border border-purple-800/60">
                  <button
                    onClick={() => setActiveTab('reorder_models')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'reorder_models'
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>قائمة الموديلات التي تحتاج إعادة طلب ({filteredReorderModels.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('all_low_sizes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'all_low_sizes'
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>جدول جميع القياسات المنخفضة ({filteredLowSizeItems.length})</span>
                  </button>
                </div>

                {/* Severity Filter Pills & Threshold Selector */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-purple-300 text-[11px] font-bold">تصفية المستوى:</span>
                  <button
                    onClick={() => setSeverityFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      severityFilter === 'all'
                        ? 'bg-amber-500 text-black font-black'
                        : 'bg-purple-900/40 text-purple-300 hover:text-white'
                    }`}
                  >
                    الكل (≤ {threshold})
                  </button>
                  <button
                    onClick={() => setSeverityFilter('critical_2')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      severityFilter === 'critical_2'
                        ? 'bg-rose-600 text-white font-black'
                        : 'bg-purple-900/40 text-purple-300 hover:text-white'
                    }`}
                  >
                    حرج (≤ 2)
                  </button>
                  <button
                    onClick={() => setSeverityFilter('out_of_stock')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                      severityFilter === 'out_of_stock'
                        ? 'bg-red-700 text-white font-black'
                        : 'bg-purple-900/40 text-purple-300 hover:text-white'
                    }`}
                  >
                    نافذ (0)
                  </button>

                  {onThresholdChange && (
                    <div className="flex items-center gap-1 bg-[#110620] px-2.5 py-1 rounded-lg border border-purple-700/70 mr-1">
                      <span className="text-[10px] text-amber-300 font-bold">حد التنبيه:</span>
                      {[5, 3, 2].map((val) => (
                        <button
                          key={val}
                          onClick={() => onThresholdChange(val)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-black cursor-pointer transition ${
                            threshold === val
                              ? 'bg-amber-400 text-black'
                              : 'text-purple-300 hover:text-white'
                          }`}
                        >
                          ≤{val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بكود الموديل (مثال IAV-101) أو اسم الحذاء أو اللون أو رقم القياس..."
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

            {/* 3. TAB 1: MODELS NEEDING REORDER ("قائمة الموديلات التي تحتاج إعادة طلب من المستودع") */}
            {activeTab === 'reorder_models' && (
              <div className="space-y-3">
                {filteredReorderModels.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl bg-[#180c2c]/60 border border-purple-900/50 space-y-2">
                    <PackageOpen className="w-12 h-12 text-emerald-400/60 mx-auto" />
                    <div className="text-base font-black text-white">
                      جميع الموديلات متوفرة بكميات ممتازة (أعلى من {threshold})!
                    </div>
                    <p className="text-xs text-purple-300/70">
                      لا توجد حالياً قياسات أو ألوان تحتاج إعادة طلب وفق الفلتر المحدد.
                    </p>
                  </div>
                ) : (
                  filteredReorderModels.map((item) => (
                    <div
                      key={item.shoe.id}
                      className="p-4 rounded-2xl bg-[#190d30] border-2 border-amber-500/40 hover:border-amber-400/80 transition shadow-lg space-y-3"
                    >
                      {/* Model Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/60">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.shoe.primaryImage}
                            alt={item.shoe.code}
                            className="w-14 h-14 rounded-xl object-cover border border-purple-600/50 shrink-0 bg-purple-950"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-base text-white bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-600">
                                {item.shoe.code}
                              </span>
                              {item.shoe.name && (
                                <h4 className="text-sm sm:text-base font-black text-white">
                                  {item.shoe.name}
                                </h4>
                              )}
                              <span className="text-[11px] font-black bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                                يحتاج إعادة طلب ({item.totalLowSizesCount} قياس ≤ {threshold})
                              </span>
                              {item.outOfStockSizesCount > 0 && (
                                <span className="text-[11px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                  {item.outOfStockSizesCount} مقاس نافذ (0)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-purple-300/80 mt-1 line-clamp-1">
                              {item.shoe.additionalInfo}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-left bg-purple-950/80 px-3 py-1.5 rounded-xl border border-purple-800/60 text-xs">
                            <div className="text-[10px] text-purple-300">إجمالي الموديل حالياً:</div>
                            <div className="font-black text-white font-mono">
                              {item.totalShoePairs} زوج
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              onClose();
                              onSelectShoe(item.shoe);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-black transition cursor-pointer shadow-md"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>فتح الموديل وتعديل المخزون</span>
                          </button>
                        </div>
                      </div>

                      {/* Low Colors & Sizes Breakdown for this Model */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {item.lowColors.map((lowCol) => (
                          <div
                            key={lowCol.color.id}
                            className={`p-3 rounded-xl border space-y-2 ${
                              lowCol.isWholeColorLow
                                ? 'bg-rose-950/30 border-rose-500/60'
                                : 'bg-[#120722] border-purple-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                                  style={{ backgroundColor: lowCol.color.colorHex }}
                                />
                                <span className="text-xs font-black text-white">
                                  اللون: {lowCol.color.colorName}
                                </span>
                                {lowCol.isWholeColorLow && (
                                  <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.2 rounded-full">
                                    إجمالي اللون منخفض جداً ({lowCol.colorTotal} زوج)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-purple-300 font-mono">
                                مجموع اللون: <strong className="text-white">{lowCol.colorTotal}</strong> زوج
                              </span>
                            </div>

                            {/* Low Sizes Pills with Quick Restock (+5) button */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {lowCol.lowSizes.map((sz) => {
                                const isZero = sz.quantity === 0;
                                const isCritical2 = sz.quantity > 0 && sz.quantity <= 2;
                                const feedbackKey = `${item.shoe.id}-${lowCol.color.id}-${sz.size}`;
                                const justRestocked = restockedFeedback === feedbackKey;

                                return (
                                  <div
                                    key={String(sz.size)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs ${
                                      isZero
                                        ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                                        : isCritical2
                                        ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
                                        : 'bg-purple-950/90 border-amber-500/40 text-purple-100'
                                    }`}
                                  >
                                    <span className="font-bold">مقاس {sz.size}:</span>
                                    <span
                                      className={`font-mono font-black px-1.5 py-0.2 rounded text-[11px] ${
                                        isZero
                                          ? 'bg-rose-600 text-white'
                                          : isCritical2
                                          ? 'bg-amber-500 text-black'
                                          : 'bg-amber-500/25 text-amber-300'
                                      }`}
                                    >
                                      {sz.quantity} زوج
                                    </span>

                                    {onQuickRestockSize && (
                                      <button
                                        onClick={() =>
                                          handleTriggerQuickRestock(
                                            item.shoe.id,
                                            lowCol.color.id,
                                            sz.size,
                                            5
                                          )
                                        }
                                        title="إعادة تعبئة سريعة (+5 أزواج لهذا القياس)"
                                        className="mr-1 px-1.5 py-0.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-black transition cursor-pointer flex items-center gap-0.5"
                                      >
                                        {justRestocked ? (
                                          <Check className="w-3 h-3" />
                                        ) : (
                                          <>
                                            <Plus className="w-2.5 h-2.5" />
                                            <span>5</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. TAB 2: TABLE OF ALL LOW STOCK SIZES */}
            {activeTab === 'all_low_sizes' && (
              <div className="space-y-2">
                {filteredLowSizeItems.length === 0 ? (
                  <div className="text-center py-10 text-xs text-purple-300">
                    لا توجد قياسات منخفضة تطابق البحث.
                  </div>
                ) : (
                  filteredLowSizeItems.map((entry) => {
                    const isZero = entry.quantity === 0;
                    const isCritical2 = entry.quantity > 0 && entry.quantity <= 2;

                    return (
                      <div
                        key={`${entry.shoeId}-${entry.colorId}-${entry.size}`}
                        className="p-3 rounded-xl bg-[#190d30] border border-purple-800/70 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-black text-sm text-white bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-700">
                            {entry.shoeCode}
                          </span>
                          {entry.shoeName && (
                            <span className="font-bold text-purple-200">{entry.shoeName}</span>
                          )}
                          <span className="flex items-center gap-1.5 bg-purple-950/80 px-2.5 py-0.5 rounded-lg border border-purple-800">
                            <span
                              className="w-3 h-3 rounded-full border border-white/40"
                              style={{ backgroundColor: entry.colorHex }}
                            />
                            <span className="font-bold text-fuchsia-300">
                              اللون: {entry.colorName}
                            </span>
                          </span>
                          <span className="font-black text-white bg-purple-900/60 px-2.5 py-0.5 rounded-lg border border-purple-700">
                            مقاس: {entry.size}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-xl font-mono font-black text-xs border ${
                              isZero
                                ? 'bg-rose-600 text-white border-rose-400'
                                : isCritical2
                                ? 'bg-amber-500 text-black border-amber-300'
                                : 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                            }`}
                          >
                            المتبقي: {entry.quantity} زوج {isZero ? '(نافذ)' : `(≤ ${threshold})`}
                          </span>

                          {onQuickRestockSize && (
                            <button
                              onClick={() =>
                                handleTriggerQuickRestock(
                                  entry.shoeId,
                                  entry.colorId,
                                  entry.size,
                                  5
                                )
                              }
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>تزويد +5</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ================= FOOTER ================= */}
          <div className="p-3.5 sm:p-4 bg-[#180c2d] border-t border-purple-900/60 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="text-purple-300/80 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>
                يتم إرسال هذا التنبيه تلقائياً للمشرف (حذيفة) عند وصول أي قياس أو لون إلى {threshold} أزواج أو أقل.
              </span>
            </div>
            <button
              onClick={onClose}
              className="bg-purple-800 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-xl border border-purple-600/50 transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
