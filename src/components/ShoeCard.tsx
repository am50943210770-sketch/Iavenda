import React from 'react';
import { Heart, Trash2, Layers, Eye, Edit2, Image as ImageIcon, Download, Sparkles } from 'lucide-react';
import { ShoeItem } from '../types/inventory';
import { calculateTotalPairs, formatPrice, downloadUploadedImage } from '../utils/storage';
import { normalizeSearchText, compactUnits } from '../utils/searchHelper';

interface Props {
  shoe: ShoeItem;
  isSupervisor?: boolean;
  searchQuery?: string;
  onSelect: (shoe: ShoeItem) => void;
  onToggleFavorite: (e: React.MouseEvent, shoeId: string) => void;
  onDeleteRequest: (e: React.MouseEvent, shoe: ShoeItem) => void;
  onEditRequest?: (e: React.MouseEvent, shoe: ShoeItem) => void;
}

export const ShoeCard: React.FC<Props> = ({
  shoe,
  isSupervisor = false,
  searchQuery = '',
  onSelect,
  onToggleFavorite,
  onDeleteRequest,
  onEditRequest,
}) => {
  const totalPairs = calculateTotalPairs(shoe);
  const colorsCount = shoe.colors.length;

  // Search query details matching
  const cleanQ = searchQuery ? normalizeSearchText(searchQuery) : '';
  const compactedQ = searchQuery ? compactUnits(cleanQ) : '';

  // Check if additionalInfo (details like heel height "كعب 5 سم") matched the query
  const infoNorm = normalizeSearchText(shoe.additionalInfo || '');
  const compactedInfo = compactUnits(infoNorm);
  const isDetailMatched = Boolean(
    cleanQ &&
      cleanQ.length >= 2 &&
      (infoNorm.includes(cleanQ) ||
        compactedInfo.includes(compactedQ) ||
        cleanQ.split(' ').some((word) => word.length >= 2 && infoNorm.includes(word)))
  );

  // Check which colors matched the search query
  const matchedColors = cleanQ
    ? shoe.colors.filter((c) => {
        const cNorm = normalizeSearchText(c.colorName);
        const cNotesNorm = normalizeSearchText(c.additionalNotes || '');
        return (
          cNorm.includes(cleanQ) ||
          cleanQ.includes(cNorm) ||
          cNotesNorm.includes(cleanQ) ||
          cleanQ.split(' ').some((w) => w.length >= 2 && (cNorm.includes(w) || cNotesNorm.includes(w)))
        );
      })
    : [];

  // Gather all uploaded images across colors, preferring the color that matched the search query
  const totalImages = shoe.colors.reduce((acc, c) => acc + c.images.length, 0);
  const matchedColorWithImg = matchedColors.find((c) => c.images && c.images.length > 0);
  const firstColorWithImg = shoe.colors.find((c) => c.images && c.images.length > 0);
  const displayImage =
    matchedColorWithImg?.images[0] ||
    firstColorWithImg?.images[0] ||
    shoe.primaryImage ||
    '';

  return (
    <div
      onClick={() => onSelect(shoe)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer select-none ${
        shoe.isFavorite
          ? 'bg-gradient-to-b from-[#271545] to-[#170c2b] border-2 border-rose-500/70 shadow-lg shadow-rose-950/50'
          : 'bg-gradient-to-b from-[#1e1136] to-[#140b24] border border-purple-800/50 hover:border-purple-500/80 shadow-md shadow-purple-950/50'
      } hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/30`}
    >
      {/* Top Image Container (compact card ratio suitable for 16x4 / grid layout) */}
      <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-[#0e071b]">
        {displayImage ? (
          <img
            src={displayImage}
            alt={shoe.name || shoe.code}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a0e30] to-[#0e071b] text-purple-400/70 p-3 text-center">
            <ImageIcon className="w-8 h-8 mb-1 opacity-60" />
            <span className="text-[10px] font-bold text-purple-300/80">
              اضغط لرفع وحفظ صورة القطعة
            </span>
          </div>
        )}

        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#140b24] via-transparent to-black/40 pointer-events-none" />

        {/* Top Right: Favorite Heart Button ("حط علامه القلب من اضغط عليه يصعد بل اول حته يصير بل بدايه") */}
        <button
          type="button"
          onClick={(e) => onToggleFavorite(e, shoe.id)}
          title={shoe.isFavorite ? 'إزالة من المفضلة' : 'تثبيت في المقدمة (المفضلة)'}
          className={`absolute top-2 right-2 z-10 p-2 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer ${
            shoe.isFavorite
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/50 scale-110'
              : 'bg-black/50 text-white/80 hover:bg-rose-600/80 hover:text-white border border-white/15'
          }`}
        >
          <Heart
            className={`w-4 h-4 transition-transform active:scale-125 ${
              shoe.isFavorite ? 'fill-white' : ''
            }`}
          />
        </button>

        {/* Top Left: Quick Edit + Delete Shoe Item Buttons */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          {displayImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadUploadedImage(displayImage, `iavenda_${shoe.code}`);
              }}
              title="حفظ الصورة المرفوعة إلى الجهاز"
              className="p-2 rounded-full bg-black/55 text-emerald-300 hover:bg-emerald-600 hover:text-white backdrop-blur-md border border-white/15 transition-all duration-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditRequest && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditRequest(e, shoe);
              }}
              title="تحرير سريع للموديل"
              className="p-2 rounded-full bg-black/55 text-amber-300 hover:bg-amber-500 hover:text-black backdrop-blur-md border border-white/15 transition-all duration-200 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => onDeleteRequest(e, shoe)}
            title="حذف هذا الموديل من المخزن"
            className="p-2 rounded-full bg-black/50 text-rose-300 hover:bg-rose-600 hover:text-white backdrop-blur-md border border-white/15 opacity-85 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pinned Badge if Favorited */}
        {shoe.isFavorite && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-sm text-[10px] font-bold text-white flex items-center gap-1 shadow">
            <span>مثبت بالمقدمة</span>
          </div>
        )}

        {/* Photos & Colors Counter Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-[10px] font-medium text-purple-200 border border-purple-500/30">
          <Layers className="w-3 h-3 text-fuchsia-400" />
          <span>{colorsCount} لون</span>
          {totalImages > 1 && <span className="text-purple-400">• {totalImages} صور</span>}
        </div>
      </div>

      {/* Card Body: Code, Name, Price, Colors */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          {/* Code and Stock Pill */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs sm:text-sm font-black tracking-wider text-white bg-purple-900/80 px-2.5 py-0.5 rounded-lg border border-purple-600/50">
              {shoe.code}
            </span>

            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                totalPairs > 10
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/50'
                  : totalPairs > 0
                  ? 'bg-amber-950/90 text-amber-300 border border-amber-700/50'
                  : 'bg-rose-950/90 text-rose-300 border border-rose-700/50'
              }`}
            >
              {totalPairs > 0 ? `${totalPairs} قطعة` : 'نفذت الكمية (0)'}
            </span>
          </div>

          {/* Model Name */}
          <h3 className="text-xs sm:text-sm font-bold text-purple-100 line-clamp-1 mt-1">
            {shoe.name || `حذاء كود ${shoe.code}`}
          </h3>

          {/* Additional Info snippet (High-visibility when matched with search query) */}
          {shoe.additionalInfo && (
            <div className="mt-1">
              {isDetailMatched ? (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/50 shadow-sm">
                  <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="line-clamp-1">{shoe.additionalInfo}</span>
                </div>
              ) : (
                <p className="text-[11px] text-purple-300/70 line-clamp-1">
                  {shoe.additionalInfo}
                </p>
              )}
            </div>
          )}

          {/* Matched Color Tag if search query matched a specific color */}
          {matchedColors.length > 0 && cleanQ && (
            <div className="flex flex-wrap gap-1 mt-1">
              {matchedColors.map((mc) => (
                <span
                  key={mc.id}
                  className="text-[10px] font-bold text-fuchsia-200 bg-fuchsia-950/80 border border-fuchsia-500/60 px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                    style={{ backgroundColor: mc.colorHex }}
                  />
                  <span>اللون: {mc.colorName}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Color Dots & Price Footer */}
        <div className="pt-2 border-t border-purple-800/40 flex items-center justify-between gap-1">
          {/* Available Color Swatches */}
          <div className="flex items-center -space-x-1.5 space-x-reverse overflow-hidden">
            {shoe.colors.slice(0, 6).map((c) => (
              <span
                key={c.id}
                title={c.colorName}
                className="w-4 h-4 rounded-full border border-purple-300/60 shadow-sm shrink-0"
                style={{ backgroundColor: c.colorHex }}
              />
            ))}
            {shoe.colors.length > 6 && (
              <span className="w-4 h-4 rounded-full bg-purple-800 text-[9px] font-bold text-white flex items-center justify-center border border-purple-400">
                +{shoe.colors.length - 6}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="text-left">
            <span className="text-xs sm:text-sm font-black text-fuchsia-300">
              {formatPrice(shoe.price, shoe.currency)}
            </span>
          </div>
        </div>

        {/* Click Hint */}
        <div className="w-full py-1.5 rounded-xl bg-purple-900/40 group-hover:bg-purple-600 text-purple-200 group-hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors">
          <Eye className="w-3.5 h-3.5" />
          <span>عرض المقاسات والألوان</span>
        </div>
      </div>
    </div>
  );
};
