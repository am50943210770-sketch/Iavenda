import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Image as ImageIcon,
  AlertCircle,
  MessageSquare,
  StickyNote,
  RotateCcw,
  Camera,
  Maximize2,
  UserCheck,
  Sparkles,
  Download,
} from 'lucide-react';
import { OrderPost, AuthSession, ChatRoomId } from '../types/inventory';
import { fileToBase64, downloadUploadedImage } from '../utils/storage';
import { formatTime12HourWithSeconds } from '../utils/authStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderPost[];
  currentSession: AuthSession;
  initialRoom?: ChatRoomId;
  onAddOrder: (newOrder: Omit<OrderPost, 'id' | 'createdAt'>) => void;
  onDeleteOrder: (orderId: string) => void;
  onRestoreOrder?: (orderId: string) => void;
  onPermanentDeleteOrder?: (orderId: string) => void;
  onUpdateOrder: (orderId: string, updatedText: string, updatedImage?: string) => void;
  onToggleConfirmOrder: (orderId: string) => void;
}

export const OrdersGroupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orders,
  currentSession,
  initialRoom = 'orders',
  onAddOrder,
  onDeleteOrder,
  onRestoreOrder,
  onPermanentDeleteOrder,
  onUpdateOrder,
  onToggleConfirmOrder,
}) => {
  const [activeRoom, setActiveRoom] = useState<ChatRoomId>(initialRoom);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'deleted'>('all');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editImage, setEditImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewImageLightbox, setPreviewImageLightbox] = useState<string | null>(null);
  const [expandedDeletedIds, setExpandedDeletedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && initialRoom) {
      setActiveRoom(initialRoom);
      setFilter('all');
      setEditingOrderId(null);
    }
  }, [isOpen, initialRoom]);

  if (!isOpen) return null;

  // Separate messages by chat room:
  // 'orders' -> كروب تثبيت الطلبات (default for legacy items without roomId)
  // 'notes'  -> ملاحظات لافيندا
  const ordersRoomMessages = orders.filter((o) => !o.roomId || o.roomId === 'orders');
  const notesRoomMessages = orders.filter((o) => o.roomId === 'notes');

  const currentRoomMessages = activeRoom === 'orders' ? ordersRoomMessages : notesRoomMessages;

  // Counters for current room
  const activeMessagesInRoom = currentRoomMessages.filter((o) => !o.isDeleted);
  const deletedMessagesInRoom = currentRoomMessages.filter((o) => o.isDeleted);
  const totalSentOrders = activeMessagesInRoom.length;
  const totalConfirmedOrders = activeMessagesInRoom.filter((o) => o.isConfirmed).length;
  const totalPendingOrders = totalSentOrders - totalConfirmedOrders;

  const isSupervisor =
    currentSession.isSupervisor ||
    currentSession.adminId === 'حذيفة' ||
    currentSession.adminId === 'admin 1';

  // Handle Screenshot / Photo upload from file input
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const b64 = await fileToBase64(file);
      if (isEdit) {
        setEditImage(b64);
      } else {
        setImage(b64);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Ultra-smooth Paste Screenshot directly from clipboard (Ctrl+V)
  const handlePasteScreenshot = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    isEdit = false
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setIsUploading(true);
          try {
            const b64 = await fileToBase64(file);
            if (isEdit) {
              setEditImage(b64);
            } else {
              setImage(b64);
            }
          } catch (err) {
            console.error(err);
          } finally {
            setIsUploading(false);
          }
          break;
        }
      }
    }
  };

  const handleSubmitNewMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !image) return;

    onAddOrder({
      roomId: activeRoom,
      authorId: currentSession.adminId,
      authorName: currentSession.displayName || currentSession.adminId,
      text: text.trim() || (image ? '📸 صورة سكرين مرفقة' : ''),
      image: image || undefined,
      isConfirmed: false,
    });

    setText('');
    setImage('');
  };

  const handleStartEdit = (order: OrderPost) => {
    setEditingOrderId(order.id);
    setEditText(order.text);
    setEditImage(order.image || '');
  };

  const handleSaveEdit = (orderId: string) => {
    if (!editText.trim() && !editImage) return;
    onUpdateOrder(
      orderId,
      editText.trim() || (editImage ? '📸 صورة سكرين مرفقة' : ''),
      editImage || undefined
    );
    setEditingOrderId(null);
    setEditText('');
    setEditImage('');
  };

  // Filter messages in active room
  const filteredMessages = currentRoomMessages.filter((o) => {
    if (filter === 'deleted') return Boolean(o.isDeleted);
    if (filter === 'confirmed') return !o.isDeleted && o.isConfirmed;
    if (filter === 'pending') return !o.isDeleted && !o.isConfirmed;
    // In 'all', show both active messages AND deleted message tombstones so everyone clearly sees who deleted what!
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.16 }}
          className="relative w-full max-w-4xl my-auto rounded-3xl bg-[#140b25] border-2 border-purple-600/50 shadow-2xl shadow-purple-950/90 flex flex-col max-h-[93vh] overflow-hidden text-white"
          dir="rtl"
        >
          {/* Top Header + Room Switcher Tabs */}
          <div className="p-3.5 sm:p-5 bg-gradient-to-r from-[#22103e] via-[#1c0d33] to-[#140b25] border-b border-purple-800/50 space-y-3.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl border shadow-inner transition-colors ${
                    activeRoom === 'orders'
                      ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                      : 'bg-fuchsia-600/30 text-fuchsia-200 border-fuchsia-500/50'
                  }`}
                >
                  {activeRoom === 'orders' ? (
                    <MessageSquare className="w-6 h-6 text-purple-300" />
                  ) : (
                    <StickyNote className="w-6 h-6 text-fuchsia-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-xl font-black text-white">
                      {activeRoom === 'orders' ? 'كروب تثبيت الطلبات' : 'ملاحظات لافيندا'}
                    </h3>
                    <span className="text-[11px] font-bold text-fuchsia-300 bg-purple-950/90 px-2.5 py-0.5 rounded-full border border-purple-700/60">
                      {activeRoom === 'orders'
                        ? 'غرفة دردشة الطلبات والسكرينات'
                        : 'غرفة دردشة ملاحظات لافيندا'}
                    </span>
                  </div>
                  <p className="text-xs text-purple-300/80 mt-0.5">
                    {activeRoom === 'orders'
                      ? 'رفع صور سكرين للطلبات، تعديل الرسائل فورا، وحذف متاح لجميع الموظفين مع إظهار اسم الحاذف'
                      : 'مساحة دردشة وملاحظات فورية بين موظفي ومشرفي شركة لافيندا (Iavenda)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 mr-auto">
                <div className="text-right text-xs bg-purple-900/50 border border-purple-700/50 px-3 py-1.5 rounded-xl">
                  <div className="text-[10px] text-purple-300">المتصل حالياً:</div>
                  <div className="font-black text-amber-300">
                    {currentSession.displayName || currentSession.adminId}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 text-purple-300 hover:text-white rounded-full bg-purple-900/50 hover:bg-purple-800 border border-purple-700/40 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TWO CHAT ROOMS SWITCHER TABS ("غرف دردشه واحده باسم كروب تثبيت الطلبات والثانيه بل ملاحضات لافيندا") */}
            <div className="grid grid-cols-2 gap-2.5 bg-[#0e071b] p-1.5 rounded-2xl border border-purple-800/60">
              <button
                type="button"
                onClick={() => {
                  setActiveRoom('orders');
                  setFilter('all');
                  setEditingOrderId(null);
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeRoom === 'orders'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/50'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/60'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>💬 كروب تثبيت الطلبات</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeRoom === 'orders'
                      ? 'bg-black/30 text-white'
                      : 'bg-purple-900/70 text-purple-200'
                  }`}
                >
                  {ordersRoomMessages.filter((m) => !m.isDeleted).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRoom('notes');
                  setFilter('all');
                  setEditingOrderId(null);
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeRoom === 'notes'
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-600/30 border border-fuchsia-400/50'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/60'
                }`}
              >
                <StickyNote className="w-4 h-4 shrink-0" />
                <span>📝 ملاحظات لافيندا</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeRoom === 'notes'
                      ? 'bg-black/30 text-white'
                      : 'bg-purple-900/70 text-purple-200'
                  }`}
                >
                  {notesRoomMessages.filter((m) => !m.isDeleted).length}
                </span>
              </button>
            </div>
          </div>

          {/* Room Stats & Permissions Bar */}
          <div className="px-4 py-2.5 bg-[#190d30] border-b border-purple-900/50 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-purple-950/80 px-2.5 py-1 rounded-xl border border-purple-800/60">
                <Send className="w-3.5 h-3.5 text-purple-400" />
                <span>الرسائل النشطة:</span>
                <strong className="text-white font-black">{totalSentOrders}</strong>
              </div>

              {activeRoom === 'orders' && (
                <>
                  <div className="flex items-center gap-1.5 bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-800/50 text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم تثبيته:</span>
                    <strong className="text-emerald-300 font-black">{totalConfirmedOrders}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-800/40 text-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>قيد الانتظار:</span>
                    <strong className="text-amber-300 font-black">{totalPendingOrders}</strong>
                  </div>
                </>
              )}

              {deletedMessagesInRoom.length > 0 && (
                <div className="flex items-center gap-1.5 bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-800/50 text-rose-200">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>رسائل محذوفة:</span>
                  <strong className="text-rose-300 font-black">
                    {deletedMessagesInRoom.length}
                  </strong>
                </div>
              )}
            </div>

            <div className="text-[11px] font-bold text-purple-200 bg-purple-950/70 px-2.5 py-1 rounded-lg border border-purple-700/50 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>جميع الموظفين يمكنهم التعديل والحذف مع إظهار اسم من قام بالحذف</span>
            </div>
          </div>

          {/* Compose Message & Upload Screenshot Box */}
          <div className="p-3.5 sm:p-4 bg-[#1b1035]/90 border-b border-purple-900/50 shrink-0">
            <form onSubmit={handleSubmitNewMessage} className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-purple-200 flex items-center gap-1.5">
                  {activeRoom === 'orders' ? (
                    <>
                      <Camera className="w-4 h-4 text-fuchsia-400" />
                      <span>إرسال طلب جديد أو رفع صورة سكرين (Screenshot) للطلب:</span>
                    </>
                  ) : (
                    <>
                      <StickyNote className="w-4 h-4 text-fuchsia-400" />
                      <span>كتابة ملاحظة جديدة في غرفة ملاحظات لافيندا:</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] text-purple-400">
                  💡 نصيحة: يمكنك لصق صورة السكرين مباشرة بـ (Ctrl+V) أو الضغط على زر رفع صورة سكرين
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <textarea
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={(e) => handlePasteScreenshot(e, false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitNewMessage();
                    }
                  }}
                  placeholder={
                    activeRoom === 'orders'
                      ? 'اكتب تفاصيل الطلب هنا أو ارفع صورة سكرين للطلب... (اضغط Enter للإرسال الفوري)'
                      : 'اكتب ملاحظتك لموظفي لافيندا هنا... (اضغط Enter للإرسال الفوري)'
                  }
                  className="flex-1 bg-[#120822] text-white placeholder-purple-400/40 text-xs sm:text-sm rounded-xl p-3 border border-purple-800 focus:outline-none focus:border-fuchsia-400 transition resize-none"
                />

                {/* Screenshot Preview if attached */}
                {image && (
                  <div className="relative w-28 sm:w-32 h-20 rounded-xl overflow-hidden border-2 border-fuchsia-500 bg-black/50 shrink-0 group">
                    <img src={image} alt="سكرين مرفق" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center text-fuchsia-200 py-0.5 font-bold">
                      صورة سكرين جاهزة
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      title="إزالة الصورة"
                      className="absolute top-1 left-1 p-1 rounded-full bg-rose-600 text-white shadow cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                {/* Screenshot Upload Button ("امكانيه رفع صوره سكرين") */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-black bg-gradient-to-r from-fuchsia-900/70 to-purple-900/70 hover:from-fuchsia-700 hover:to-purple-700 text-fuchsia-100 hover:text-white px-3.5 py-2 rounded-xl border border-fuchsia-500/50 cursor-pointer transition shadow-sm active:scale-95">
                    <Camera className="w-4 h-4 text-fuchsia-300" />
                    <span>📸 رفع صورة سكرين (Screenshot)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || (!text.trim() && !image)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs sm:text-sm font-black px-5 py-2 rounded-xl shadow-lg shadow-purple-600/30 transition disabled:opacity-40 cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {activeRoom === 'orders' ? 'إرسال في كروب تثبيت الطلبات' : 'إرسال في ملاحظات لافيندا'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#110920]">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-purple-900/40">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-purple-300/70">الفلتر:</span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-950/60 text-purple-300 hover:text-white'
                  }`}
                >
                  الكل ({currentRoomMessages.length})
                </button>
                {activeRoom === 'orders' && (
                  <>
                    <button
                      onClick={() => setFilter('confirmed')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        filter === 'confirmed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-950/40 text-emerald-400 hover:text-white'
                      }`}
                    >
                      المثبتة ({totalConfirmedOrders})
                    </button>
                    <button
                      onClick={() => setFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        filter === 'pending'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-950/40 text-amber-400 hover:text-white'
                      }`}
                    >
                      قيد التثبيت ({totalPendingOrders})
                    </button>
                  </>
                )}
                <button
                  onClick={() => setFilter('deleted')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    filter === 'deleted'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-950/40 text-rose-300 hover:text-white'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>سجل المحذوفات ({deletedMessagesInRoom.length})</span>
                </button>
              </div>

              <div className="text-[11px] text-purple-300/80">
                متاح لجميع الموظفين التعديل والحذف مع بيان اسم الحاذف
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 bg-purple-950/20 rounded-2xl border border-purple-900/40 p-4">
                <AlertCircle className="w-10 h-10 text-purple-400/50 mx-auto mb-2" />
                <p className="text-purple-200 font-bold text-sm">
                  {filter === 'deleted'
                    ? 'لا توجد رسائل محذوفة في هذه الغرفة حتى الآن'
                    : activeRoom === 'orders'
                    ? 'لا توجد طلبات في هذا القسم حالياً'
                    : 'لا توجد ملاحظات مسجلة حالياً — ابدأ بكتابة أول ملاحظة'}
                </p>
              </div>
            ) : (
              filteredMessages.map((order) => {
                const isEditing = editingOrderId === order.id;
                const createdTime12 = formatTime12HourWithSeconds(order.createdAt);
                const editedTime12 = order.updatedAt
                  ? formatTime12HourWithSeconds(order.updatedAt)
                  : null;
                const deletedTime12 = order.deletedAt
                  ? formatTime12HourWithSeconds(order.deletedAt)
                  : null;

                // If the message was deleted by an employee ("وجميع الموضفين يستطيعون حذف الرساله ويبين منو حذفها")
                if (order.isDeleted) {
                  const isExpanded = Boolean(expandedDeletedIds[order.id]);
                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border-2 border-rose-600/50 bg-gradient-to-r from-rose-950/50 via-[#1c0c24] to-[#170b22] p-3.5 transition-all shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="p-2 rounded-xl bg-rose-600/25 border border-rose-500/50 text-rose-300">
                            <Trash2 className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-black text-rose-200">
                              <span>🗑️ تم حذف هذه الرسالة بواسطة:</span>
                              <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-black shadow-xs">
                                👤 {order.deletedByName || order.deletedBy || 'موظف'}
                              </span>
                              {deletedTime12 && (
                                <span className="text-[11px] font-mono text-rose-300 bg-black/40 px-2 py-0.5 rounded border border-rose-800/60">
                                  الساعة {deletedTime12.hours12}:{deletedTime12.minutes}:
                                  {deletedTime12.seconds} {deletedTime12.periodAr}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-purple-300/80 mt-0.5">
                              المرسل الأصلي للرسالة:{' '}
                              <strong className="text-white">
                                {order.authorName || order.authorId}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Actions on Deleted Message: View original content / Restore / Permanent remove */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDeletedIds((prev) => ({
                                ...prev,
                                [order.id]: !prev[order.id],
                              }))
                            }
                            className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-[11px] font-bold border border-purple-700/50 cursor-pointer transition"
                          >
                            {isExpanded ? 'إخفاء المحتوى المحذوف' : 'عرض الرسالة المحذوفة'}
                          </button>

                          {onRestoreOrder && (
                            <button
                              type="button"
                              onClick={() => onRestoreOrder(order.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="استرجاع الرسالة إلى الغرفة"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>استرجاع</span>
                            </button>
                          )}

                          {isSupervisor && onPermanentDeleteOrder && (
                            <button
                              type="button"
                              onClick={() => onPermanentDeleteOrder(order.id)}
                              className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-700 text-rose-300 hover:text-white border border-rose-800/60 text-[11px] cursor-pointer transition"
                              title="إزالة السجل نهائياً (للمشرف)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Optional Preview of what was deleted */}
                      {isExpanded && (
                        <div className="mt-2.5 pt-2.5 border-t border-rose-900/50 text-xs text-purple-200/80 bg-black/30 p-2.5 rounded-xl space-y-2">
                          <div className="line-through opacity-85 whitespace-pre-wrap">
                            {order.previousText || order.text}
                          </div>
                          {(order.previousImage || order.image) && (
                            <img
                              src={order.previousImage || order.image}
                              alt="صورة محذوفة"
                              className="w-28 h-20 object-cover rounded-lg border border-rose-700/50 opacity-75"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // Active Message Bubble
                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                      order.isConfirmed && activeRoom === 'orders'
                        ? 'bg-[#172036] border-emerald-500/50 shadow-md shadow-emerald-950/20'
                        : 'bg-[#1a0f2e] border-purple-800/60 hover:border-purple-600/70'
                    }`}
                  >
                    {/* Top Row: Author badge, Status, Edited indicator, Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-purple-900/40 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-purple-900/80 text-purple-100 border border-purple-700/50 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-fuchsia-400" />
                          <span>{order.authorName || order.authorId}</span>
                        </span>

                        {activeRoom === 'orders' && (
                          <>
                            {order.isConfirmed ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>
                                  تم التثبيت {order.confirmedBy ? `بواسطة ${order.confirmedBy}` : ''}
                                </span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-700/50">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>قيد التثبيت</span>
                              </span>
                            )}
                          </>
                        )}

                        {order.image && (
                          <span className="text-[10px] font-bold bg-fuchsia-950/80 text-fuchsia-300 px-2 py-0.5 rounded-md border border-fuchsia-700/50 flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            <span>مرفق سكرين</span>
                          </span>
                        )}

                        {/* Edited Indicator */}
                        {order.updatedAt && (
                          <span className="text-[10px] font-bold bg-amber-950/70 text-amber-300 px-2 py-0.5 rounded-md border border-amber-700/50">
                            ✏️ تم التعديل{' '}
                            {order.editedByName || order.editedBy
                              ? `بواسطة ${order.editedByName || order.editedBy}`
                              : ''}
                            {editedTime12
                              ? ` (${editedTime12.hours12}:${editedTime12.minutes} ${editedTime12.periodAr})`
                              : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-purple-300 font-mono bg-black/30 px-2 py-0.5 rounded border border-purple-800/40">
                          الساعة {createdTime12.hours12}:{createdTime12.minutes}:
                          {createdTime12.seconds} {createdTime12.periodAr}
                        </span>

                        {/* Confirm / Unconfirm Order Button */}
                        {activeRoom === 'orders' && (
                          <button
                            onClick={() => onToggleConfirmOrder(order.id)}
                            className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              order.isConfirmed
                                ? 'bg-amber-900/40 text-amber-300 border-amber-700 hover:bg-amber-800/50'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-xs'
                            }`}
                          >
                            {order.isConfirmed ? 'إلغاء التثبيت' : '✓ تثبيت الطلب'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body or Smooth Inline Editor */}
                    {isEditing ? (
                      <div className="space-y-2.5 my-2 bg-[#120822] p-3 rounded-2xl border-2 border-fuchsia-500/60">
                        <div className="flex items-center justify-between text-xs text-fuchsia-300 font-bold">
                          <span>✏️ تعديل الرسالة أو صورة السكرين المرفقة:</span>
                          <span className="text-[10px] text-purple-400">
                            اضغط حفظ التعديل لاعتماد التغييرات فوراً
                          </span>
                        </div>

                        <textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onPaste={(e) => handlePasteScreenshot(e, true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(order.id);
                            }
                          }}
                          className="w-full bg-[#0b0516] text-white text-xs sm:text-sm rounded-xl p-2.5 border border-purple-600 focus:outline-none focus:border-fuchsia-400"
                        />

                        {editImage && (
                          <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-fuchsia-400 bg-black/40">
                            <img
                              src={editImage}
                              alt="معاينة التعديل"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setEditImage('')}
                              className="absolute top-1 left-1 p-1 rounded-full bg-rose-600 text-white text-[10px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold bg-purple-900/70 hover:bg-purple-800 text-purple-100 px-3 py-1.5 rounded-xl cursor-pointer border border-purple-700 flex items-center gap-1.5 transition">
                              <Camera className="w-3.5 h-3.5 text-fuchsia-400" />
                              <span>{editImage ? 'تغيير صورة السكرين' : 'إرفاق صورة سكرين'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, true)}
                                className="hidden"
                              />
                            </label>
                            {editImage && (
                              <button
                                type="button"
                                onClick={() => setEditImage('')}
                                className="text-xs text-rose-400 hover:underline cursor-pointer"
                              >
                                إزالة الصورة
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingOrderId(null)}
                              className="px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-xs font-bold text-purple-300 border border-purple-800 cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(order.id)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow cursor-pointer"
                            >
                              ✓ حفظ التعديل
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-xs sm:text-sm text-purple-100 whitespace-pre-wrap leading-relaxed font-medium">
                          {order.text}
                        </p>

                        {/* Attached Screenshot Image with Click-to-Zoom Lightbox & Save Uploaded Image Button */}
                        {order.image && (
                          <div className="space-y-1.5">
                            <div
                              onClick={() => setPreviewImageLightbox(order.image || null)}
                              className="group relative max-w-sm rounded-2xl overflow-hidden border-2 border-purple-700/70 hover:border-fuchsia-400 bg-black/50 max-h-60 cursor-pointer transition"
                            >
                              <img
                                src={order.image}
                                alt="صورة سكرين الطلب"
                                className="w-full h-full object-contain max-h-56 bg-black/60"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                                  <Maximize2 className="w-3.5 h-3.5 text-fuchsia-400" />
                                  <span>تكبير صورة السكرين</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadUploadedImage(
                                    order.image!,
                                    `iavenda_order_${order.id}`
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-400/40 transition cursor-pointer shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>حفظ الصورة المرفوعة بالجهاز</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Action Controls:
                        1. Smooth Edit ("وامكانيه تعديل على الرساله التي تم رفعها")
                        2. All Employees Can Delete & Shows Who Deleted It ("وجميع الموضفين يستطيعون حذف الرساله ويبين منو حذفها")
                    */}
                    {!isEditing && (
                      <div className="mt-3 pt-2.5 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] text-purple-400/80">
                          يمكن لأي موظف تعديل الرسالة أو حذفها مع تسجيل اسم الحاذف
                        </span>

                        <div className="flex items-center gap-2 mr-auto">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(order)}
                            className="flex items-center gap-1 text-xs font-bold text-purple-200 hover:text-white bg-purple-900/50 hover:bg-purple-700 px-3 py-1.5 rounded-xl border border-purple-700/60 transition cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-fuchsia-400" />
                            <span>تعديل الرسالة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteOrder(order.id)}
                            className="flex items-center gap-1 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-600 px-3 py-1.5 rounded-xl border border-rose-800/50 transition cursor-pointer active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف الرسالة</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-[#190d30] border-t border-purple-900/50 flex items-center justify-between text-xs shrink-0">
            <span className="text-purple-300/80">
              مزامنة فورية للغرفتين (كروب تثبيت الطلبات + ملاحظات لافيندا) لدى جميع الموظفين
            </span>
            <button
              onClick={onClose}
              className="bg-purple-800/80 hover:bg-purple-700 text-white font-bold px-5 py-1.5 rounded-xl border border-purple-600/40 transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>

        {/* Fullscreen Screenshot Lightbox Modal */}
        {previewImageLightbox && (
          <div
            onClick={() => setPreviewImageLightbox(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative max-w-3xl max-h-[88vh] flex flex-col items-center">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadUploadedImage(previewImageLightbox, 'iavenda_screenshot');
                  }}
                  className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>حفظ الصورة بالجهاز</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImageLightbox(null)}
                  className="px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إغلاق معاينة السكرين</span>
                </button>
              </div>
              <img
                src={previewImageLightbox}
                alt="معاينة السكرين"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border-2 border-purple-500 shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
