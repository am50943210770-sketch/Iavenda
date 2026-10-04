import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Package,
  Heart,
  Edit2,
  Info,
  Layers,
  Check,
  Zap,
  Upload,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { ShoeItem, DeleteConfirmTarget } from '../types/inventory';
import {
  calculateTotalPairs,
  formatPrice,
  getColorHex,
  fileToBase64,
  downloadUploadedImage,
} from '../utils/storage';

interface Props {
  shoe: ShoeItem | null;
  isSupervisor?: boolean;
  onClose: () => void;
  onToggleFavorite: (shoeId: string) => void;
  onOpenAddColor: (shoe: ShoeItem) => void;
  onUpdateStock: (
    shoeId: string,
    colorId: string,
    size: number | string,
    delta: number
  ) => void;
  onSetExactStock?: (
    shoeId: string,
    colorId: string,
    size: number | string,
    newQuantity: number
  ) => void;
  onInlineUpdateShoe?: (updatedShoe: ShoeItem) => void;
  onRequestDeductPair: (target: {
    shoeId: string;
    shoeCode: string;
    colorId: string;
    colorName: string;
    size: number | string;
    currentQuantity: number;
    quantityToDeduct?: number;
  }) => void;
  onAddCustomSize: (shoeId: string, colorId: string, newSize: number | string, initialQty: number) => void;
  onRequestDelete: (target: DeleteConfirmTarget) => void;
  onEditShoe: (shoe: ShoeItem) => void;
}

export const ShoeDetailModal: React.FC<Props> = ({
  shoe,
  isSupervisor = false,
  onClose,
  onToggleFavorite,
  onOpenAddColor,
  onUpdateStock,
  onSetExactStock,
  onInlineUpdateShoe,
  onRequestDeductPair,
  onAddCustomSize,
  onRequestDelete,
  onEditShoe,
}) => {
  const [selectedColorId, setSelectedColorId] = useState<string>('');
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  // Smooth Inline Editing Mode State ("اجعله سلس بل تحرير")
  const [isQuickEditMode, setIsQuickEditMode] = useState<boolean>(false);
  const [editingHeaderField, setEditingHeaderField] = useState<
    'code' | 'name' | 'price' | 'info' | null
  >(null);
  const [draftCode, setDraftCode] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftInfo, setDraftInfo] = useState('');
  const [saveFlash, setSaveFlash] = useState(false);

  // State for adding extra size inside a color card
  const [addingSizeForColor, setAddingSizeForColor] = useState<string | null>(null);
  const [newSizeInput, setNewSizeInput] = useState<string>('');
  const [newSizeQty, setNewSizeQty] = useState<number>(2);

  useEffect(() => {
    if (shoe) {
      setDraftCode(shoe.code);
      setDraftName(shoe.name || '');
      setDraftPrice(String(shoe.price || 0));
      setDraftInfo(shoe.additionalInfo || '');
    }
  }, [shoe]);

  if (!shoe) return null;

  const activeColor =
    shoe.colors.find((c) => c.id === selectedColorId) || shoe.colors[0];

  const allGalleryImages =
    activeColor && activeColor.images.length > 0
      ? activeColor.images.filter(Boolean)
      : shoe.primaryImage
      ? [shoe.primaryImage]
      : [];

  const currentHeroImage =
    allGalleryImages[selectedImageIdx] || allGalleryImages[0] || '';

  const totalShoePairs = calculateTotalPairs(shoe);

  const triggerSaveFlash = () => {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  };

  const handleSaveHeaderField = () => {
    if (!onInlineUpdateShoe) return;
    const updated: ShoeItem = {
      ...shoe,
      code: draftCode.trim().toUpperCase() || shoe.code,
      name: draftName.trim() || shoe.name,
      price: Math.max(0, Number(draftPrice) || 0),
      additionalInfo: draftInfo.trim(),
      updatedAt: Date.now(),
    };
    onInlineUpdateShoe(updated);
    setEditingHeaderField(null);
    triggerSaveFlash();
  };

  const handleInlineColorNameChange = (colorId: string, newColorName: string) => {
    if (!onInlineUpdateShoe || !newColorName.trim()) return;
    const clean = newColorName.trim();
    const updated: ShoeItem = {
      ...shoe,
      colors: shoe.colors.map((c) =>
        c.id === colorId
          ? {
              ...c,
              colorName: clean,
              colorHex: getColorHex(clean),
            }
          : c
      ),
      updatedAt: Date.now(),
    };
    onInlineUpdateShoe(updated);
    triggerSaveFlash();
  };

  const handleInlineColorNotesChange = (colorId: string, newNotes: string) => {
    if (!onInlineUpdateShoe) return;
    const updated: ShoeItem = {
      ...shoe,
      colors: shoe.colors.map((c) =>
        c.id === colorId ? { ...c, additionalNotes: newNotes } : c
      ),
      updatedAt: Date.now(),
    };
    onInlineUpdateShoe(updated);
    triggerSaveFlash();
  };

  const handleDeleteSingleSize = (
    colorId: string,
    colorName: string,
    sizeToDelete: number | string,
    currentQty: number
  ) => {
    onRequestDelete({
      type: 'size',
      itemId: shoe.id,
      shoeId: shoe.id,
      colorId,
      size: sizeToDelete,
      code: shoe.code,
      shoeName: shoe.name,
      colorName,
      sizesSummary: `${currentQty} قطعة في قياس ${sizeToDelete}`,
    });
  };

  const handleUploadColorPhoto = async (
    colorId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onInlineUpdateShoe) return;
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const b64 = await fileToBase64(files[i]);
        uploaded.push(b64);
      }
      const updatedColors = shoe.colors.map((c) =>
        c.id === colorId ? { ...c, images: [...c.images, ...uploaded] } : c
      );
      const firstValidImg =
        updatedColors.find((c) => c.images.length > 0)?.images[0] ||
        shoe.primaryImage ||
        uploaded[0] ||
        '';
      const updated: ShoeItem = {
        ...shoe,
        primaryImage: firstValidImg,
        colors: updatedColors,
        updatedAt: Date.now(),
      };
      onInlineUpdateShoe(updated);
      triggerSaveFlash();
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const handleRemoveColorPhoto = (colorId: string, imgIndex: number) => {
    if (!onInlineUpdateShoe) return;
    const updatedColors = shoe.colors.map((c) =>
      c.id === colorId
        ? { ...c, images: c.images.filter((_, idx) => idx !== imgIndex) }
        : c
    );
    const firstValidImg =
      updatedColors.find((c) => c.images.length > 0)?.images[0] || '';
    const updated: ShoeItem = {
      ...shoe,
      primaryImage: firstValidImg,
      colors: updatedColors,
      updatedAt: Date.now(),
    };
    onInlineUpdateShoe(updated);
    setSelectedImageIdx(0);
    triggerSaveFlash();
  };

  const handleSaveNewSize = (colorId: string) => {
    const trimmed = newSizeInput.trim();
    if (!trimmed) return;
    const parsedSize = isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
    onAddCustomSize(shoe.id, colorId, parsedSize, Math.max(0, newSizeQty));
    setNewSizeInput('');
    setNewSizeQty(2);
    setAddingSizeForColor(null);
    triggerSaveFlash();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl my-auto rounded-3xl bg-gradient-to-b from-[#1c1033] via-[#150b28] to-[#0f071e] border-2 border-purple-600/50 shadow-2xl shadow-purple-950/90 text-white overflow-hidden max-h-[92vh] flex flex-col"
          dir="rtl"
        >
          {/* Modal Top Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 bg-[#120924]/90 border-b border-purple-800/50 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Inline Editable Code */}
              {editingHeaderField === 'code' || isQuickEditMode ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={draftCode}
                    onChange={(e) => setDraftCode(e.target.value)}
                    onBlur={handleSaveHeaderField}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveHeaderField()}
                    className="w-28 px-2.5 py-1 rounded-xl bg-[#0d061a] text-white font-black text-sm border-2 border-fuchsia-400 focus:outline-none uppercase"
                    placeholder="الكود"
                  />
                </div>
              ) : (
                <span
                  onClick={() => setEditingHeaderField('code')}
                  title="اضغط لتعديل الكود مباشرة"
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black text-sm sm:text-base tracking-wider shadow cursor-pointer hover:ring-2 hover:ring-fuchsia-300 transition flex items-center gap-1.5"
                >
                  <span>{shoe.code}</span>
                  <Edit2 className="w-3 h-3 opacity-75" />
                </span>
              )}

              {/* Inline Editable Name */}
              <div>
                {editingHeaderField === 'name' || isQuickEditMode ? (
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={handleSaveHeaderField}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveHeaderField()}
                    className="w-44 sm:w-56 px-2.5 py-1 rounded-xl bg-[#0d061a] text-white font-bold text-sm border border-purple-400 focus:outline-none"
                    placeholder="اسم الموديل..."
                  />
                ) : (
                  <h2
                    onClick={() => setEditingHeaderField('name')}
                    title="اضغط لتعديل الاسم مباشرة"
                    className="text-base sm:text-xl font-black text-white leading-tight cursor-pointer hover:text-fuchsia-300 transition flex items-center gap-1.5"
                  >
                    <span>{shoe.name || `حذاء موديل ${shoe.code}`}</span>
                    <Edit2 className="w-3.5 h-3.5 text-purple-400 opacity-70" />
                  </h2>
                )}
                <p className="text-[11px] text-purple-300/80">
                  عدد قطع الكود المتوفرة:{' '}
                  <strong className="text-emerald-300">{totalShoePairs} قطعة</strong>
                </p>
              </div>

              {/* Instant Save Indicator */}
              {saveFlash && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[11px] font-bold animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>تم الحفظ تلقائياً</span>
                </span>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Toggle Smooth Quick Edit Mode ("اجعله سلس بل تحرير") */}
              <button
                onClick={() => {
                  if (isQuickEditMode) {
                    handleSaveHeaderField();
                  }
                  setIsQuickEditMode(!isQuickEditMode);
                }}
                title="تفعيل التحرير السلس والمباشر للكميات والأسعار والألوان بدون نوافذ"
                className={`px-3 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  isQuickEditMode
                    ? 'bg-emerald-600 text-white border-emerald-300 shadow-lg shadow-emerald-600/30'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isQuickEditMode ? 'إنهاء التحرير السريع' : 'تحرير سلس مباشر'}</span>
              </button>

              {/* Pin / Favorite */}
              <button
                onClick={() => onToggleFavorite(shoe.id)}
                title={shoe.isFavorite ? 'إلغاء التثبيت' : 'تثبيت في المقدمة'}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  shoe.isFavorite
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                    : 'bg-purple-900/50 text-purple-200 border-purple-700 hover:bg-purple-800'
                }`}
              >
                <Heart className={`w-4 h-4 ${shoe.isFavorite ? 'fill-white' : ''}`} />
                <span className="hidden md:inline">
                  {shoe.isFavorite ? 'مثبت بالأول' : 'تثبيت'}
                </span>
              </button>

              {/* Full Edit Modal Button */}
              <button
                onClick={() => {
                  onClose();
                  onEditShoe(shoe);
                }}
                title="فتح نافذة التعديل الكاملة"
                className="p-2 rounded-xl bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden lg:inline">نافذة التعديل</span>
              </button>

              {/* Delete Entire Shoe Item ("اجعل تاكيد عند حذف قطعه") */}
              <button
                onClick={() =>
                  onRequestDelete({
                    type: 'item',
                    itemId: shoe.id,
                    shoeId: shoe.id,
                    code: shoe.code,
                    shoeName: shoe.name,
                    colorName: `جميع الألوان (${shoe.colors.length})`,
                    sizesSummary: `${totalShoePairs} قطعة في هذا الكود`,
                  })
                }
                title="حذف هذه القطعة بالكامل (مع نافذة تأكيد)"
                className="p-2 rounded-xl bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/60 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">حذف القطعة</span>
              </button>

              {/* Close Modal */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-purple-950 hover:bg-purple-800 text-purple-300 hover:text-white border border-purple-800 transition cursor-pointer mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Smooth Edit Helper Banner */}
          <div className="bg-[#160b2b] border-b border-purple-800/40 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-purple-300">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>تحرير سلس:</strong> يمكنك النقر مباشرة على{' '}
                <span className="text-white underline">رقم الكمية</span> لأي مقاس وكتابة العدد الجديد فوراً، أو النقر على السعر/الاسم/الكود لتعديله تلقائياً.
              </span>
            </div>
            {isQuickEditMode && (
              <span className="text-emerald-300 font-bold">
                ⚡ وضع التحرير السريع مفعل (مع ظهور تأكيد آمن عند حذف أو إنقاص أي قطعة)
              </span>
            )}
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* Top Section: Image Gallery + Price & General Info */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Right Column: Photos Gallery */}
              <div className="md:col-span-5 space-y-2.5">
                <div className="relative rounded-2xl overflow-hidden bg-[#0b0614] border border-purple-800/60 aspect-[4/3] shadow-inner">
                  {currentHeroImage ? (
                    <img
                      src={currentHeroImage}
                      alt={shoe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-purple-950/30 transition">
                      <ImageIcon className="w-10 h-10 text-purple-400/60 mb-2" />
                      <span className="text-xs font-bold text-purple-200">
                        لا توجد صورة مرفوعة لهذا اللون
                      </span>
                      <span className="text-[11px] text-fuchsia-300 mt-1 underline">
                        اضغط هنا لرفع وحفظ صورة من جهازك
                      </span>
                      {activeColor && onInlineUpdateShoe && (
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleUploadColorPhoto(activeColor.id, e)}
                          className="hidden"
                        />
                      )}
                    </label>
                  )}

                  {activeColor && (
                    <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 border border-white/15">
                      <span
                        className="w-3 h-3 rounded-full border border-white/50"
                        style={{ backgroundColor: activeColor.colorHex }}
                      />
                      <span>صور اللون: {activeColor.colorName}</span>
                    </div>
                  )}

                  {/* Quick Upload & Save Uploaded Photo Buttons directly on Gallery */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {currentHeroImage && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadUploadedImage(
                            currentHeroImage,
                            `iavenda_${shoe.code}_${activeColor?.colorName || 'img'}`
                          )
                        }
                        title="حفظ الصورة المرفوعة إلى الجهاز"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 border border-emerald-400/40 cursor-pointer backdrop-blur-md shadow transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>حفظ الصورة</span>
                      </button>
                    )}

                    {currentHeroImage && activeColor && activeColor.images.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveColorPhoto(activeColor.id, selectedImageIdx)
                        }
                        title="حذف هذه الصورة"
                        className="p-1.5 rounded-xl bg-rose-700/90 hover:bg-rose-600 text-white border border-rose-400/40 cursor-pointer backdrop-blur-md shadow transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {activeColor && onInlineUpdateShoe && (
                      <label className="px-2.5 py-1.5 rounded-xl bg-purple-900/85 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 border border-purple-400/40 cursor-pointer backdrop-blur-md shadow transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>+ رفع وحفظ صورة</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleUploadColorPhoto(activeColor.id, e)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Thumbnails if multiple images */}
                {allGalleryImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {allGalleryImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                          selectedImageIdx === idx
                            ? 'border-fuchsia-400 scale-105 shadow-md shadow-fuchsia-500/30'
                            : 'border-purple-800/50 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Left Column: Price, Info, and Color Switcher Summary */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Price Box & Quick Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Inline Editable Price Card */}
                    <div
                      onClick={() => !isQuickEditMode && setEditingHeaderField('price')}
                      className="p-3 rounded-2xl bg-purple-950/60 border border-purple-700/40 hover:border-fuchsia-500/60 transition cursor-pointer group"
                    >
                      <span className="text-[11px] text-purple-300 flex items-center justify-between">
                        <span>السعر المعتمد</span>
                        <Edit2 className="w-3 h-3 text-purple-400 group-hover:text-fuchsia-300" />
                      </span>
                      {editingHeaderField === 'price' || isQuickEditMode ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 mt-1"
                        >
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={draftPrice}
                            onChange={(e) => setDraftPrice(e.target.value)}
                            onBlur={handleSaveHeaderField}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveHeaderField()}
                            className="w-full bg-[#0d061a] border border-fuchsia-400 rounded-lg px-2 py-1 text-sm font-black text-fuchsia-300 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="text-lg sm:text-xl font-black text-fuchsia-300 mt-0.5">
                          {formatPrice(shoe.price, shoe.currency)}
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-700/40">
                      <span className="text-[11px] text-purple-300 block">عدد الألوان</span>
                      <div className="text-lg sm:text-xl font-black text-white mt-0.5 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>{shoe.colors.length} ألوان</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-700/40 col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-purple-300 block">عدد قطع الكود</span>
                      <div className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-400" />
                        <span>{totalShoePairs} قطعة</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info Box (Inline Editable) */}
                  <div
                    onClick={() => !isQuickEditMode && setEditingHeaderField('info')}
                    className="p-3.5 rounded-2xl bg-[#140a26] border border-purple-800/50 hover:border-purple-600 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-purple-200 flex items-center justify-between">
                        <span>معلومات إضافية حول الحذاء (اضغط للتعديل):</span>
                        <Edit2 className="w-3 h-3 text-purple-400" />
                      </span>
                      {editingHeaderField === 'info' || isQuickEditMode ? (
                        <input
                          type="text"
                          onClick={(e) => e.stopPropagation()}
                          value={draftInfo}
                          onChange={(e) => setDraftInfo(e.target.value)}
                          onBlur={handleSaveHeaderField}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveHeaderField()}
                          placeholder="اكتب مكان الرف، المورد، نوع الجلد..."
                          className="w-full mt-1.5 bg-[#0d061a] border border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-400"
                        />
                      ) : (
                        <p className="text-xs sm:text-sm text-purple-100/90 mt-0.5">
                          {shoe.additionalInfo || 'لا توجد ملاحظات مسجلة - اضغط هنا لإضافة ملاحظة فوراً.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Color Selector Tabs + Add Another Color Button */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">
                        الألوان المسجلة لهذا الكود (اضغط لعرض صور اللون):
                      </span>
                      <button
                        onClick={() => onOpenAddColor(shoe)}
                        className="flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-3 py-1.5 rounded-xl shadow-md transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة لون آخر ومقاساته</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {shoe.colors.map((c) => {
                        const isSelected = activeColor?.id === c.id;
                        const colorPairs = c.sizes.reduce((a, s) => a + s.quantity, 0);
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedColorId(c.id);
                              setSelectedImageIdx(0);
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-purple-700 text-white border-purple-300 shadow-lg shadow-purple-700/40'
                                : 'bg-[#140a26] text-purple-200 border-purple-800/60 hover:border-purple-600'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40"
                              style={{ backgroundColor: c.colorHex }}
                            />
                            <span>{c.colorName}</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[10px] text-emerald-300">
                              {colorPairs} قطعة
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: All Colors & Their Sizes 36-43 with Smooth Direct Editing */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-800/50 pb-2">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>جدول الألوان والقياسات (تحرير فوري للكميات)</span>
                </h3>
                <span className="text-xs text-purple-300">
                  انقر على رقم الكمية لكتابته مباشرة، أو استخدم (+) و (-)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {shoe.colors.map((colorVar) => {
                  const totalColorStock = colorVar.sizes.reduce(
                    (acc, s) => acc + s.quantity,
                    0
                  );

                  return (
                    <div
                      key={colorVar.id}
                      className="rounded-2xl bg-[#160c29] border border-purple-700/50 p-4 space-y-3 shadow-lg"
                    >
                      {/* Color Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-purple-800/40">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className="w-6 h-6 rounded-full border-2 border-white/60 shadow"
                            style={{ backgroundColor: colorVar.colorHex }}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isQuickEditMode ? (
                                <input
                                  type="text"
                                  defaultValue={colorVar.colorName}
                                  onBlur={(e) =>
                                    handleInlineColorNameChange(colorVar.id, e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' &&
                                    handleInlineColorNameChange(
                                      colorVar.id,
                                      (e.target as HTMLInputElement).value
                                    )
                                  }
                                  className="w-28 bg-[#0d061a] border border-purple-500 rounded-lg px-2 py-0.5 text-xs font-black text-white focus:outline-none focus:border-fuchsia-400"
                                />
                              ) : (
                                <h4 className="text-sm sm:text-base font-black text-white">
                                  اللون: {colorVar.colorName}
                                </h4>
                              )}
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                                عدد القطع: {totalColorStock} قطعة
                              </span>
                            </div>

                            {isQuickEditMode ? (
                              <input
                                type="text"
                                defaultValue={colorVar.additionalNotes || ''}
                                placeholder="ملاحظات هذا اللون..."
                                onBlur={(e) =>
                                  handleInlineColorNotesChange(colorVar.id, e.target.value)
                                }
                                className="mt-1 w-52 bg-[#0d061a] border border-purple-700 rounded-lg px-2 py-0.5 text-[11px] text-purple-200 focus:outline-none"
                              />
                            ) : (
                              colorVar.additionalNotes && (
                                <p className="text-xs text-purple-300/80 mt-0.5">
                                  ملاحظة اللون: {colorVar.additionalNotes}
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Add Custom Size to this color ("خانه اضافه قياسات") */}
                          <button
                            onClick={() =>
                              setAddingSizeForColor(
                                addingSizeForColor === colorVar.id ? null : colorVar.id
                              )
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-purple-900/70 hover:bg-purple-700 text-purple-200 hover:text-white text-xs font-bold border border-purple-700/60 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة قياس</span>
                          </button>

                          {/* Delete this Color Variant (with Confirmation Modal) */}
                          {shoe.colors.length > 1 && (
                            <button
                              onClick={() =>
                                onRequestDelete({
                                  type: 'color',
                                  itemId: shoe.id,
                                  shoeId: shoe.id,
                                  colorId: colorVar.id,
                                  code: shoe.code,
                                  shoeName: shoe.name,
                                  colorName: colorVar.colorName,
                                  sizesSummary: `${totalColorStock} قطعة في هذا اللون`,
                                })
                              }
                              className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/50 transition cursor-pointer"
                              title="حذف هذا اللون (مع تأكيد)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Add Custom Size Form */}
                      {addingSizeForColor === colorVar.id && (
                        <div className="p-3 rounded-xl bg-purple-950/70 border border-purple-600/50 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-purple-200">
                            إضافة مقاس جديد للون ({colorVar.colorName}):
                          </span>
                          <input
                            type="text"
                            placeholder="رقم المقاس (مثلاً 44 أو 45)"
                            value={newSizeInput}
                            onChange={(e) => setNewSizeInput(e.target.value)}
                            className="bg-[#11081f] border border-purple-700 rounded-lg px-2.5 py-1 text-xs text-white w-36 focus:outline-none focus:border-purple-400"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-purple-300">العدد:</span>
                            <input
                              type="number"
                              min="0"
                              value={newSizeQty}
                              onChange={(e) => setNewSizeQty(parseInt(e.target.value) || 0)}
                              className="bg-[#11081f] border border-purple-700 rounded-lg px-2 py-1 text-xs text-white w-16 text-center focus:outline-none focus:border-purple-400"
                            />
                          </div>
                          <button
                            onClick={() => handleSaveNewSize(colorVar.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ القياس</span>
                          </button>
                        </div>
                      )}

                      {/* Sizes Grid (36 to 43 + any custom sizes) with Direct Number Input */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                        {colorVar.sizes.map((sz) => {
                          const isOut = sz.quantity === 0;
                          const isLow = sz.quantity > 0 && sz.quantity <= 5;
                          return (
                            <div
                              key={String(sz.size)}
                              className={`relative rounded-xl p-2.5 border flex flex-col items-center justify-between gap-1.5 transition ${
                                isOut
                                  ? 'bg-rose-950/25 border-rose-900/50 opacity-85'
                                  : isLow
                                  ? 'bg-amber-950/30 border-amber-600/60 shadow-inner'
                                  : 'bg-[#1f1238] border-purple-700/60 shadow-inner'
                              }`}
                            >
                              {/* Delete single size button when in Quick Edit Mode (opens Confirmation) */}
                              {isQuickEditMode && colorVar.sizes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSingleSize(
                                      colorVar.id,
                                      colorVar.colorName,
                                      sz.size,
                                      sz.quantity
                                    )
                                  }
                                  title="حذف هذا القياس (مع تأكيد)"
                                  className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow cursor-pointer hover:bg-rose-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}

                              {/* Size Badge */}
                              <div className="w-full flex items-center justify-between text-[11px] font-bold text-purple-300 border-b border-purple-800/50 pb-1">
                                <span>قياس</span>
                                <span className="text-xs sm:text-sm font-black text-white bg-purple-900 px-1.5 py-0.2 rounded">
                                  {sz.size}
                                </span>
                              </div>

                              {/* Direct Smooth Editable Quantity Input (Shows number of pieces of this code/size for employees & supervisor) */}
                              <div className="my-0.5 text-center w-full">
                                <input
                                  type="number"
                                  min="0"
                                  value={sz.quantity}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    if (onSetExactStock) {
                                      onSetExactStock(shoe.id, colorVar.id, sz.size, val);
                                      triggerSaveFlash();
                                    } else {
                                      const diff = val - sz.quantity;
                                      if (diff !== 0) {
                                        onUpdateStock(shoe.id, colorVar.id, sz.size, diff);
                                      }
                                    }
                                  }}
                                  title="اكتب الكمية الجديدة مباشرة"
                                  className={`w-full text-center text-lg sm:text-xl font-black rounded-lg py-0.5 bg-black/25 border border-transparent hover:border-purple-500 focus:border-fuchsia-400 focus:bg-[#0d061a] focus:outline-none transition ${
                                    isOut
                                      ? 'text-rose-400'
                                      : isLow
                                      ? 'text-amber-300'
                                      : 'text-emerald-300'
                                  }`}
                                />
                                <span className="block text-[9px] text-purple-300/70 mt-0.5">
                                  {isOut ? 'نافذ (0)' : isLow ? `متبقي (${sz.quantity})` : `${sz.quantity} قطعة`}
                                </span>
                              </div>

                              {/* Plus / Minus Controls (Minus ALWAYS asks for confirmation: "اجعل تاكيد عند حذف قطعه") */}
                              <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-purple-800/40">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (sz.quantity <= 0) return;
                                    onRequestDeductPair({
                                      shoeId: shoe.id,
                                      shoeCode: shoe.code,
                                      colorId: colorVar.id,
                                      colorName: colorVar.colorName,
                                      size: sz.size,
                                      currentQuantity: sz.quantity,
                                      quantityToDeduct: 1,
                                    });
                                  }}
                                  disabled={isOut}
                                  title="حذف / سحب قطعة مع تأكيد"
                                  className="flex-1 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-600 disabled:opacity-30 text-rose-200 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateStock(shoe.id, colorVar.id, sz.size, 1);
                                    triggerSaveFlash();
                                  }}
                                  title="إضافة زوج للمخزون (+1)"
                                  className="flex-1 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-600 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
