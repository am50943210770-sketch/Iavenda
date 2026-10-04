export interface SizeStock {
  size: number | string;
  quantity: number;
}

export interface ColorVariant {
  id: string;
  colorName: string; // e.g. "أبيض", "أسود", "وردي", "نيلي", "جوزي", "بيج"
  colorHex: string;
  images: string[]; // Image URLs or Base64 data
  sizes: SizeStock[];
  additionalNotes?: string;
  sku?: string;
}

export interface ShoeItem {
  id: string;
  code: string; // كود الموديل مثلاً IAV-101
  name?: string; // اسم القطعة / النوع
  price: number; // السعر
  currency: string; // د.ع
  additionalInfo: string; // معلومات إضافية (مكان التخزين، المورد، نوع الخامة)
  primaryImage: string; // صورة سريعة للبطاقة الخارجية
  isFavorite: boolean; // تفضيل بقلب ❤️
  favoritedAt?: number; // لتثبيت المفضلات في الأعلى
  colors: ColorVariant[];
  createdAt: number;
  updatedAt: number;
}

export interface ColorOption {
  name: string;
  hex: string;
  textColor?: string;
}

export const PRESET_COLORS: ColorOption[] = [
  { name: 'أبيض', hex: '#FFFFFF', textColor: '#1e293b' },
  { name: 'أسود', hex: '#18181B', textColor: '#ffffff' },
  { name: 'وردي', hex: '#F472B6', textColor: '#831843' },
  { name: 'نيلي', hex: '#1E3A8A', textColor: '#ffffff' },
  { name: 'جوزي', hex: '#78350F', textColor: '#ffffff' },
  { name: 'بيج', hex: '#D4B996', textColor: '#451a03' },
];

export const DEFAULT_SIZES = [36, 37, 38, 39, 40, 41, 42, 43];

export interface DeleteConfirmTarget {
  type: 'item' | 'shoe' | 'color' | 'size';
  itemId: string;
  shoeId?: string;
  colorId?: string;
  size?: number | string;
  code: string;
  shoeName?: string;
  colorName?: string;
  sizesSummary?: string;
  title?: string;
}

export interface AdminUser {
  id: string; // 'حذيفة' | 'احمد'
  displayName: string;
  roleTitle: string; // 'مشرف' | 'موظف'
  isSupervisor: boolean; // حذيفة (مشرف): true, احمد (موظف): false
  canViewDeductions: boolean; // تقرير الموظفين
  canViewSecurityAlerts: boolean;
}

export interface AuthSession {
  adminId: string; // 'حذيفة' | 'احمد'
  displayName: string;
  isSupervisor: boolean; // حذيفة: true, احمد: false
  loginTime: number; // For 12-hour session expiry
}

export type ChatRoomId = 'orders' | 'notes';

export interface OrderPost {
  id: string;
  roomId?: ChatRoomId; // 'orders' = كروب تثبيت الطلبات, 'notes' = ملاحظات لافيندا
  authorId: string; // 'حذيفة' | 'احمد'
  authorName: string;
  text: string;
  image?: string; // صورة سكرين (Screenshot) أو صورة مرفقة
  isConfirmed: boolean;
  confirmedAt?: number;
  confirmedBy?: string;
  createdAt: number;
  updatedAt?: number;
  editedBy?: string;
  editedByName?: string;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedByName?: string;
  deletedAt?: number;
  previousText?: string;
  previousImage?: string;
}

export interface StockDeductionLog {
  id: string;
  shoeId: string;
  shoeCode: string;
  shoeName?: string;
  colorName: string;
  size: number | string;
  quantityDecreased: number;
  operationCategory?: 'deduct' | 'add'; // 'deduct' = سحب قطعة, 'add' = إضافة قطعة
  adminId: string;
  adminName: string;
  timestamp: number;
  actionType?:
    | 'pair_deduct'
    | 'color_delete'
    | 'item_delete'
    | 'item_add'
    | 'color_add'
    | 'size_add'
    | 'stock_add';
  actionLabel?: string;
  isReadBySupervisor?: boolean;
}

export interface SecurityAlert {
  id: string;
  attemptedName: string;
  attemptedCode: string;
  timestamp: number;
  reason: string;
  isRead?: boolean;
}

export interface EmployeeLoginLog {
  id: string;
  adminId: string;
  adminName: string;
  roleTitle: string;
  isSupervisor: boolean;
  timestamp: number;
  isReadBySupervisor?: boolean;
}
