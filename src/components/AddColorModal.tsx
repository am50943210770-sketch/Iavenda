import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Palette,
  Upload,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import { PRESET_COLORS, DEFAULT_SIZES, ColorVariant, ShoeItem } from '../types/inventory';
import { getColorHex, fileToBase64, downloadUploadedImage } from '../utils/storage';

interface Props {
  shoe: ShoeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddColor: (shoeId: string, newVariant: ColorVariant) => void;
}

export const AddColorModal: React.FC<Props> = ({
  shoe,
  isOpen,
  onClose,
  onAddColor,
}) => {
  const [selectedColorName, setSelectedColorName] = useState('وردي');
  const [customColorInput, setCustomColorInput] = useState('');
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [sizesList, setSizesList] = useState<{ size: number | string; quantity: number }[]>(() => {
    return DEFAULT_SIZES.map((size) => ({ size, quantity: 4 }));
  });
  const [customSizeToAdd, setCustomSizeToAdd] = useState('');

  const [images, setImages] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState('');

  if (!isOpen || !shoe) return null;

  const handleAddCustomSize = () => {
    const s = customSizeToAdd.trim();
    if (!s) return;
    if (!sizesList.some((item) => String(item.size) === s)) {
      setSizesList([...sizesList, { size: isNaN(Number(s)) ? s : Number(s), quantity: 3 }]);
      setCustomSizeToAdd('');
    }
  };

  const handleQuantityChange = (sizeVal: number | string, newQty: number) => {
    const qty = Math.max(0, newQty || 0);
    setSizesList(
      sizesList.map((item) => (item.size === sizeVal ? { ...item, quantity: qty } : item))
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      setImages((prev) => [...prev, base64]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalColor = isCustomColor && customColorInput.trim() ? customColorInput.trim() : selectedColorName;
    const finalColorHex = getColorHex(finalColor);

    const finalImages = images.filter(Boolean);

    const newVariant: ColorVariant = {
      id: `col-${Date.now()}`,
      colorName: finalColor,
      colorHex: finalColorHex,
      images: finalImages,
      sizes: sizesList,
      additionalNotes: additionalNotes.trim(),
    };

    onAddColor(shoe.id, newVariant);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl my-auto rounded-3xl bg-[#150c26] border-2 border-purple-500/50 shadow-2xl shadow-purple-950/80 p-5 sm:p-6 text-white max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-800/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <Palette className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-black">
                  إضافة لون جديد للكود ({shoe.code})
                </h3>
                <p className="text-xs text-purple-300/70">
                  اختر اللون، حدد المقاسات والأزواج، وارفع الصور الخاصة به
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
            {/* Color selection buttons */}
            <div className="bg-[#1b1033] p-3.5 rounded-2xl border border-purple-800/50 space-y-2">
              <label className="block text-xs font-black text-purple-200">
                اختر اللون المراد إضافته:
              </label>

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
                          ? 'bg-purple-600 border-purple-300 text-white shadow-md'
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

                <button
                  type="button"
                  onClick={() => setIsCustomColor(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isCustomColor
                      ? 'bg-purple-600 border-purple-300 text-white shadow-md'
                      : 'bg-[#140b24] border-purple-900/60 text-purple-300'
                  }`}
                >
                  + لون آخر
                </button>
              </div>

              {isCustomColor && (
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    placeholder="اكتب اسم اللون (مثال: رصاصي، كحلي، كركواني...)"
                    className="flex-1 bg-[#140b24] border border-purple-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                  />
                  <span
                    className="w-7 h-7 rounded-lg border border-purple-500 shrink-0"
                    style={{ backgroundColor: getColorHex(customColorInput) }}
                  />
                </div>
              )}
            </div>

            {/* Sizes & Quantities */}
            <div className="bg-[#1b1033] p-3.5 rounded-2xl border border-purple-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-200">
                  المقاسات المتوفرة لهذا اللون (من 36 إلى 43):
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {sizesList.map((item) => (
                  <div
                    key={String(item.size)}
                    className="bg-[#140b24] border border-purple-850 p-1.5 rounded-xl text-center"
                  >
                    <div className="text-[11px] font-bold text-purple-300">{item.size}</div>
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

              {/* Extra size input */}
              <div className="pt-2 border-t border-purple-900/40 flex items-center gap-2">
                <span className="text-xs text-purple-300/80 shrink-0">خانة إضافة قياس:</span>
                <input
                  type="text"
                  value={customSizeToAdd}
                  onChange={(e) => setCustomSizeToAdd(e.target.value)}
                  placeholder="مثال: 44، 35..."
                  className="w-24 bg-[#140b24] border border-purple-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-lg transition"
                >
                  + إضافة
                </button>
              </div>
            </div>

            {/* Images upload */}
            <div className="bg-[#1b1033] p-3.5 rounded-2xl border border-purple-800/50 space-y-2.5">
              <span className="block text-xs font-black text-purple-200">
                صور هذا اللون (صورة أو أكثر):
              </span>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-purple-700/60 hover:border-purple-400 rounded-xl p-3 bg-[#140b24]/80 text-center transition cursor-pointer relative">
                <Upload className="w-6 h-6 text-purple-400 mb-1" />
                <p className="text-xs font-bold text-purple-200">رفع صور من جهازك</p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden aspect-[4/3] border border-purple-700"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="p-1 bg-rose-600 text-white rounded-full cursor-pointer"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadUploadedImage(img, `${shoe.code}_color_${i + 1}`)
                          }
                          className="p-1 bg-emerald-600 text-white rounded-full cursor-pointer"
                          title="حفظ الصورة المرفوعة بالجهاز"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-1">
                ملاحظات إضافية لهذا اللون (اختياري)
              </label>
              <input
                type="text"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="مثال: دفعة جديدة، جلد لماع..."
                className="w-full bg-[#1e1238] border border-purple-800 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-purple-900/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-purple-300 bg-purple-950/60 hover:bg-purple-900"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition"
              >
                إضافة اللون
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
