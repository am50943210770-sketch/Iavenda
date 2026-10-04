import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  DollarSign,
  FileText,
  Tag,
  Palette,
  Download,
} from 'lucide-react';
import { PRESET_COLORS, DEFAULT_SIZES, ShoeItem, ColorVariant } from '../types/inventory';
import { getColorHex, fileToBase64, downloadUploadedImage } from '../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shoe: ShoeItem) => void;
  initialShoe?: ShoeItem | null;
}

export const AddShoeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialShoe,
}) => {
  // Form fields
  const [code, setCode] = useState(initialShoe?.code || '');
  const [name, setName] = useState(initialShoe?.name || '');
  const [price, setPrice] = useState<number | string>(initialShoe?.price || '');
  const [currency, setCurrency] = useState(initialShoe?.currency || 'د.ع');
  const [additionalInfo, setAdditionalInfo] = useState(initialShoe?.additionalInfo || '');

  // Color selection
  const [selectedColorName, setSelectedColorName] = useState('أبيض');
  const [customColorInput, setCustomColorInput] = useState('');
  const [isCustomColor, setIsCustomColor] = useState(false);

  // Sizes setup: 36 to 43 default + extra sizes
  const [sizesList, setSizesList] = useState<{ size: number | string; quantity: number }[]>(() => {
    return DEFAULT_SIZES.map((size) => ({ size, quantity: 4 }));
  });
  const [customSizeToAdd, setCustomSizeToAdd] = useState('');

  // Images state
  const [images, setImages] = useState<string[]>([]);
  const [, setIsUploading] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Editable colors when editing an existing shoe
  const [editableColors, setEditableColors] = useState<ColorVariant[]>([]);
  const [activeEditColorIdx, setActiveEditColorIdx] = useState<number>(0);

  // Sync form state whenever initialShoe or isOpen changes ("اجعله سلس بل تحرير")
  useEffect(() => {
    if (!isOpen) return;
    if (initialShoe) {
      setCode(initialShoe.code || '');
      setName(initialShoe.name || '');
      setPrice(initialShoe.price ?? '');
      setCurrency(initialShoe.currency || 'د.ع');
      setAdditionalInfo(initialShoe.additionalInfo || '');
      const clonedColors = initialShoe.colors.map((c) => ({
        ...c,
        images: [...c.images],
        sizes: c.sizes.map((s) => ({ ...s })),
      }));
      setEditableColors(clonedColors);
      setActiveEditColorIdx(0);
      if (clonedColors[0]) {
        setSelectedColorName(clonedColors[0].colorName);
        setSizesList(clonedColors[0].sizes);
        setImages(
          clonedColors[0].images.length > 0
            ? clonedColors[0].images
            : initialShoe.primaryImage
            ? [initialShoe.primaryImage]
            : []
        );
      } else {
        setImages(initialShoe.primaryImage ? [initialShoe.primaryImage] : []);
      }
    } else {
      setCode('');
      setName('');
      setPrice('');
      setCurrency('د.ع');
      setAdditionalInfo('');
      setSelectedColorName('أبيض');
      setCustomColorInput('');
      setIsCustomColor(false);
      setSizesList(DEFAULT_SIZES.map((size) => ({ size, quantity: 4 })));
      setImages([]);
      setEditableColors([]);
      setActiveEditColorIdx(0);
    }
  }, [initialShoe, isOpen]);

  // Helper to switch active color tab when editing an existing shoe
  const handleSwitchEditColorTab = (newIdx: number) => {
    if (!initialShoe || !editableColors[newIdx]) return;
    // Save current tab's changes first
    const finalColor =
      isCustomColor && customColorInput.trim() ? customColorInput.trim() : selectedColorName;
    const updatedColors = editableColors.map((c, idx) =>
      idx === activeEditColorIdx
        ? {
            ...c,
            colorName: finalColor,
            colorHex: getColorHex(finalColor),
            sizes: sizesList,
            images: images.length > 0 ? images : c.images,
          }
        : c
    );
    setEditableColors(updatedColors);
    setActiveEditColorIdx(newIdx);
    const targetColor = updatedColors[newIdx];
    const isPreset = PRESET_COLORS.some((p) => p.name === targetColor.colorName);
    setIsCustomColor(!isPreset);
    if (isPreset) {
      setSelectedColorName(targetColor.colorName);
    } else {
      setCustomColorInput(targetColor.colorName);
    }
    setSizesList(targetColor.sizes.map((s) => ({ ...s })));
    setImages([...targetColor.images]);
  };

  if (!isOpen) return null;

  // Handle adding custom size
  const handleAddCustomSize = () => {
    const s = customSizeToAdd.trim();
    if (!s) return;
    if (!sizesList.some((item) => String(item.size) === s)) {
      setSizesList([...sizesList, { size: isNaN(Number(s)) ? s : Number(s), quantity: 3 }]);
      setCustomSizeToAdd('');
    }
  };

  // Handle changing quantity of a size
  const handleQuantityChange = (sizeVal: number | string, newQty: number) => {
    const qty = Math.max(0, newQty || 0);
    setSizesList(
      sizesList.map((item) => (item.size === sizeVal ? { ...item, quantity: qty } : item))
    );
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newImgs: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await fileToBase64(files[i]);
        newImgs.push(base64);
      }
      setImages((prev) => [...prev, ...newImgs]);
    } catch (err) {
      console.error('Failed to read image', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (customImageUrl.trim()) {
      setImages((prev) => [...prev, customImageUrl.trim()]);
      setCustomImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = code.trim().toUpperCase();
    if (!finalCode) return;

    const finalColor = isCustomColor && customColorInput.trim() ? customColorInput.trim() : selectedColorName;
    const finalColorHex = getColorHex(finalColor);

    const finalImages = images.filter(Boolean);

    const initialColorVariant: ColorVariant = {
      id: `col-${Date.now()}`,
      colorName: finalColor,
      colorHex: finalColorHex,
      images: finalImages,
      sizes: sizesList,
      additionalNotes: 'اللون الأساسي',
    };

    const updatedColorsForExisting =
      initialShoe && editableColors.length > 0
        ? editableColors.map((c, idx) =>
            idx === activeEditColorIdx
              ? {
                  ...c,
                  colorName: finalColor,
                  colorHex: finalColorHex,
                  images: finalImages,
                  sizes: sizesList,
                }
              : c
          )
        : [initialColorVariant];

    const firstValidImage =
      updatedColorsForExisting.find((c) => c.images.length > 0)?.images[0] ||
      finalImages[0] ||
      '';

    const newShoe: ShoeItem = {
      id: initialShoe ? initialShoe.id : `iav-${Date.now()}`,
      code: finalCode,
      name: name.trim() || `حذاء موديل ${finalCode}`,
      price: Number(price) || 35000,
      currency: currency.trim() || 'د.ع',
      additionalInfo: additionalInfo.trim(),
      primaryImage: firstValidImage,
      isFavorite: initialShoe ? initialShoe.isFavorite : false,
      favoritedAt: initialShoe?.favoritedAt,
      colors: initialShoe ? updatedColorsForExisting : [initialColorVariant],
      createdAt: initialShoe ? initialShoe.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSave(newShoe);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#140b24] border-2 border-purple-600/50 shadow-2xl shadow-purple-950/80 p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-800/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <Tag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black">
                  {initialShoe ? 'تعديل بيانات الكود' : 'إضافة قطعة / كود جديد لمستودع Iavenda'}
                </h3>
                <p className="text-xs text-purple-300/70">
                  سجل بيانات الحذاء، السعر، الألوان، المقاسات، وارفع الصور
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-purple-300 hover:text-white rounded-full bg-purple-900/40 hover:bg-purple-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Code and Model Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center gap-1">
                  <span>خانة الكود (رقم الموديل) *</span>
                  <span className="text-[10px] text-purple-400">(مثال: IAV-801)</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثال: IAV-702"
                  className="w-full bg-[#1e1238] border border-purple-800/70 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-purple-400 font-bold uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">
                  اسم الحذاء / النوعية
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: سنيكرز كلاسيك مريح"
                  className="w-full bg-[#1e1238] border border-purple-800/70 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Row 2: Price and Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                  <span>خانة السعر *</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="مثال: 35000"
                    className="flex-1 bg-[#1e1238] border border-purple-800/70 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-purple-400 font-extrabold"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-[#1e1238] border border-purple-800/70 text-purple-200 rounded-xl px-2.5 py-2.5 text-xs font-bold focus:outline-none"
                  >
                    <option value="د.ع">د.ع</option>
                    <option value="$">$ دولار</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>خانة المعلومات الإضافية</span>
                </label>
                <input
                  type="text"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="مثال: مكان الرف A-12، نوع الجلد، المورد..."
                  className="w-full bg-[#1e1238] border border-purple-800/70 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* Row 3: Colors selection ("خانه الون واجعل فيه الالوان هذه مع اضافه اي لون ببحث: ابيض اسود وردي نيلي جوزي بيج") */}
            <div className="bg-[#1b1033] p-3.5 rounded-2xl border border-purple-800/50 space-y-2.5">
              {initialShoe && editableColors.length > 1 && (
                <div className="pb-2.5 mb-2 border-b border-purple-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-black text-amber-300 ml-1">
                    اختر اللون المراد تعديل مقاساته وصوره:
                  </span>
                  {editableColors.map((col, idx) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleSwitchEditColorTab(idx)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                        activeEditColorIdx === idx
                          ? 'bg-amber-500 text-black font-black border-amber-300 shadow'
                          : 'bg-[#140b24] text-purple-200 border-purple-800 hover:border-purple-600'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/50"
                        style={{ backgroundColor: col.colorHex }}
                      />
                      <span>{col.colorName}</span>
                    </button>
                  ))}
                </div>
              )}

              <label className="block text-xs font-black text-purple-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>خانة اللون والخيارات المطلوبة</span>
                </span>
                <span className="text-[11px] text-purple-400 font-normal">
                  (اختر من الألوان الأساسية أو اكتب أي لون مخصص)
                </span>
              </label>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => {
                  const isSelected = !isCustomColor && selectedColorName === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setIsCustomColor(false);
                        setSelectedColorName(c.name);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 border-purple-300 text-white shadow-md shadow-purple-600/40 scale-105'
                          : 'bg-[#140b24] border-purple-900/60 text-purple-300 hover:border-purple-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}

                {/* Custom Color Option button */}
                <button
                  type="button"
                  onClick={() => setIsCustomColor(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isCustomColor
                      ? 'bg-purple-600 border-purple-300 text-white shadow-md'
                      : 'bg-[#140b24] border-purple-900/60 text-purple-300 hover:border-purple-700'
                  }`}
                >
                  + لون آخر / مخصص
                </button>
              </div>

              {/* Custom color input if selected */}
              {isCustomColor && (
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    placeholder="اكتب اسم اللون (مثال: أحمر قرمزي، رصاصي، زيتي...)"
                    className="flex-1 bg-[#140b24] border border-purple-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                  />
                  <span
                    className="w-7 h-7 rounded-lg border border-purple-500 shrink-0"
                    style={{ backgroundColor: getColorHex(customColorInput) }}
                  />
                </div>
              )}
            </div>

            {/* Row 4: Sizes 36 to 43 default + "خانه اضافه قياسات" */}
            <div className="bg-[#1b1033] p-3.5 rounded-2xl border border-purple-800/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-200">
                  المقاسات من 36 إلى 43 والكميات الافتراضية
                </span>
                <span className="text-[10px] text-purple-400">
                  (حدد عدد الأزواج لكل قياس)
                </span>
              </div>

              {/* Grid of sizes */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {sizesList.map((item) => (
                  <div
                    key={String(item.size)}
                    className="bg-[#140b24] border border-purple-850 p-1.5 rounded-xl text-center"
                  >
                    <div className="text-[11px] font-bold text-purple-300">
                      {item.size}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(item.size, parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-[#201339] border border-purple-700/50 rounded-lg text-center text-xs font-extrabold text-white py-1 mt-1 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* خانة إضافة قياسات إضافية */}
              <div className="pt-2 border-t border-purple-900/40 flex items-center gap-2">
                <span className="text-xs text-purple-300/80 shrink-0">
                  خانة إضافة قياسات أخرى:
                </span>
                <input
                  type="text"
                  value={customSizeToAdd}
                  onChange={(e) => setCustomSizeToAdd(e.target.value)}
                  placeholder="مثال: 35، 44، 45..."
                  className="w-28 bg-[#140b24] border border-purple-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  + إضافة قياس
                </button>
              </div>
            </div>

            {/* Row 5: Photo Upload ("خاصيه اضافه صور من قياس الطول 16 والعرض 4 رفع صوره اواكثر معا القطعه او اكثر من صوره") */}
            <div className="bg-[#1b1033] p-3.5 rounded-2xl border border-purple-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>خاصية إضافة صور (صورة واحدة أو أكثر)</span>
                </span>
                <span className="text-[10px] text-purple-400">
                  {images.length} صور مضافة
                </span>
              </div>

              {/* Upload Drop Area */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-purple-700/60 hover:border-purple-400 rounded-2xl p-4 bg-[#140b24]/80 text-center transition cursor-pointer relative">
                <Upload className="w-8 h-8 text-purple-400 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-purple-200">
                  اضغط لرفع صور من جهازك أو اسحب الصور هنا
                </p>
                <p className="text-[10px] text-purple-400 mt-1">
                  يمكنك رفع صورة واحدة أو عدة صور معاً للقطعة
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              {/* Image Previews Grid with Save Uploaded Image Button */}
              {images.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-purple-900/40">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                    <span>✓ الصور المرفوعة جاهزة للحفظ ({images.length} صورة)</span>
                    <span>يمكنك حفظ أي صورة مرفوعة إلى جهازك</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-black/40 border border-purple-800/80"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(i)}
                            title="حذف الصورة"
                            className="p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full transition shadow-md cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadUploadedImage(img, `${code || 'iavenda'}_img_${i + 1}`)
                            }
                            title="حفظ الصورة المرفوعة بالجهاز"
                            className="p-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full transition shadow-md cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                        {i === 0 && (
                          <span className="absolute bottom-1 right-1 bg-purple-950/90 text-[9px] font-bold text-purple-200 px-1.5 py-0.5 rounded border border-purple-700/60">
                            الرئيسية
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-3 border-t border-purple-900/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 transition cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-lg shadow-purple-600/30 border border-purple-400/50 transition cursor-pointer active:scale-95"
              >
                {initialShoe ? 'حفظ التعديلات' : 'حفظ وإضافة القطعة للمستودع'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
