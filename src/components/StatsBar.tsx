import React from 'react';
import { ShoeItem } from '../types/inventory';
import { calculateTotalPairs } from '../utils/storage';
import { PackageCheck, AlertTriangle, Heart } from 'lucide-react';

interface Props {
  shoes: ShoeItem[];
  isSupervisor?: boolean;
}

export const StatsBar: React.FC<Props> = ({ shoes, isSupervisor = false }) => {
  const totalModels = shoes.length;
  const totalPairs = shoes.reduce((acc, s) => acc + calculateTotalPairs(s), 0);
  const favoritesCount = shoes.filter((s) => s.isFavorite).length;
  const lowStockCount = shoes.filter((s) => {
    const pairs = calculateTotalPairs(s);
    return pairs > 0 && pairs < 8;
  }).length;

  return (
    <div
      className={`grid grid-cols-1 ${
        isSupervisor ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
      } gap-2 sm:gap-3`}
    >
      <div className="bg-[#180e29]/80 border border-purple-800/40 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-700/40">
          <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs text-purple-300/80">
            {isSupervisor ? 'إجمالي المخزون (للإدارة)' : 'الأكواد المتوفرة بالمستودع'}
          </p>
          {isSupervisor ? (
            <p className="text-xs sm:text-sm font-black text-white">
              {totalPairs} زوج{' '}
              <span className="text-[10px] font-normal text-purple-300">
                ({totalModels} كود)
              </span>
            </p>
          ) : (
            <p className="text-xs sm:text-sm font-black text-white">
              {totalModels} كود مسجل
            </p>
          )}
        </div>
      </div>

      <div className="bg-[#180e29]/80 border border-purple-800/40 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-rose-950/70 text-rose-400 border border-rose-800/40">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-rose-500/30" />
        </div>
        <div>
          <p className="text-[10px] sm:text-xs text-purple-300/80">المثبتة بالمفضلة</p>
          <p className="text-xs sm:text-sm font-black text-rose-300">
            {favoritesCount} موديل بالأعلى
          </p>
        </div>
      </div>

      {isSupervisor && (
        <div className="bg-[#180e29]/80 border border-purple-800/40 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-950/70 text-amber-400 border border-amber-800/40">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-purple-300/80">تنبيه نقص المقاسات</p>
            <p className="text-xs sm:text-sm font-black text-amber-300">
              {lowStockCount} كود قليل الكمية
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
