import React from 'react';
import { Search, X, Heart, Filter, Check } from 'lucide-react';
import { PRESET_COLORS } from '../types/inventory';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onlyFavorites: boolean;
  onToggleFavorites: () => void;
}

export const SearchBar: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  selectedColor,
  onColorSelect,
  onlyFavorites,
  onToggleFavorites,
}) => {
  return (
    <div className="bg-[#180e29]/90 border border-purple-800/40 rounded-2xl p-3 sm:p-4 shadow-xl shadow-purple-950/40 space-y-3">
      {/* Top Row: Search Box + Favorites Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-purple-400">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بالتفاصيل (مثل: كعب 5 سم)، اللون، كود الحذاء، أو الاسم..."
            className="w-full bg-[#11091f] text-white placeholder-purple-400/50 text-xs sm:text-sm rounded-xl pr-10 pl-9 py-2.5 sm:py-3 border border-purple-800/60 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 left-0 flex items-center pl-3 text-purple-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Favorites Toggle Button ("القلب يصعد بل اول حته يصير بل بدايه") */}
        <button
          onClick={onToggleFavorites}
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer shrink-0 ${
            onlyFavorites
              ? 'bg-rose-600/90 border-rose-400 text-white shadow-lg shadow-rose-600/30'
              : 'bg-[#11091f] border-purple-800/60 text-purple-200 hover:bg-purple-900/40'
          }`}
        >
          <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-white text-white' : 'text-rose-400'}`} />
          <span>المفضلة فقط</span>
        </button>
      </div>

      {/* Bottom Row: Color Filter Pills (أبيض، أسود، وردي، نيلي، جوزي، بيج) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1 text-xs text-purple-300 shrink-0 ml-1">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>تصفية باللون:</span>
        </div>

        <button
          onClick={() => onColorSelect('')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition shrink-0 border cursor-pointer ${
            selectedColor === ''
              ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
              : 'bg-purple-950/60 text-purple-300 border-purple-800/50 hover:bg-purple-900/50'
          }`}
        >
          جميع الألوان
        </button>

        {PRESET_COLORS.map((color) => {
          const isSelected = selectedColor === color.name;
          return (
            <button
              key={color.name}
              onClick={() => onColorSelect(isSelected ? '' : color.name)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shrink-0 border cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-600/30 scale-105'
                  : 'bg-[#11091f] text-purple-200 border-purple-800/50 hover:border-purple-600'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <span>{color.name}</span>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
