import React from 'react';
import { Plus, Sparkles, Menu } from 'lucide-react';
import { ShoeItem, AuthSession } from '../types/inventory';
import { calculateTotalPairs } from '../utils/storage';

interface Props {
  shoes: ShoeItem[];
  currentSession: AuthSession | null;
  unconfirmedOrdersCount: number;
  securityAlertsCount: number;
  onOpenDrawer: () => void;
  onOpenAddModal: () => void;
}

export const Header: React.FC<Props> = ({
  shoes,
  currentSession,
  unconfirmedOrdersCount,
  securityAlertsCount,
  onOpenDrawer,
  onOpenAddModal,
}) => {
  const totalPairs = shoes.reduce((acc, shoe) => acc + calculateTotalPairs(shoe), 0);
  const isSupervisor = Boolean(
    currentSession?.isSupervisor || currentSession?.adminId === 'حذيفة'
  );

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#130b24]/90 border-b border-purple-800/40 shadow-lg shadow-purple-950/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Right Side: 3-Bars Hamburger Button ("زر بي ٣ شخطات") + Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* 3-Bars Menu Button */}
          <button
            onClick={onOpenDrawer}
            title="القائمة الجانبية والطلبات وسجل النواقص"
            className="relative flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-purple-900/70 hover:bg-purple-800 border border-purple-600/60 text-white shadow-md shadow-purple-950/60 transition active:scale-95 cursor-pointer group"
          >
            <Menu className="w-6 h-6 text-purple-200 group-hover:text-white transition" />
            {/* Notification badge if unconfirmed orders or security alerts */}
            {(unconfirmedOrdersCount > 0 || securityAlertsCount > 0) && (
              <span
                className={`absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white border border-[#130b24] shadow ${
                  securityAlertsCount > 0 ? 'bg-rose-600 animate-bounce' : 'bg-amber-500 text-black'
                }`}
              >
                {securityAlertsCount > 0 ? securityAlertsCount : unconfirmedOrdersCount}
              </span>
            )}
          </button>

          <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800 shadow-lg shadow-purple-600/30 border border-purple-400/30">
            <Sparkles className="w-6 h-6 text-purple-100" />
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#130b24]"
              title="مزامنة فورية متصلة"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-purple-200 to-fuchsia-300 bg-clip-text text-transparent">
                Iavenda
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/70 text-purple-200 border border-purple-700/50">
                المستودع الرئيسي
              </span>
              {currentSession && (
                <span
                  className={`hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isSupervisor
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                      : 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50'
                  }`}
                >
                  <span>{isSupervisor ? '👑' : '👤'}</span>
                  <span>{currentSession.displayName || currentSession.adminId}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-purple-300/70 hidden sm:block">
              نظام إدارة وجرد مخزون الأحذية الشامل – شركة إيافيندا
            </p>
          </div>
        </div>

        {/* Center Supervisor-Only Total Pairs Indicator */}
        {isSupervisor && (
          <div className="hidden lg:flex items-center gap-2 bg-purple-950/60 border border-purple-800/40 px-4 py-2 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-purple-300">مجموع الأزواج بالمخزن (حذيفة فقط):</span>
            <span className="text-sm font-extrabold text-emerald-300">{totalPairs} زوج</span>
          </div>
        )}

        {/* Left Side Actions: ONLY Add New Shoe Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 border border-purple-400/40 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>إضافة كود حذاء</span>
          </button>
        </div>
      </div>
    </header>
  );
};
