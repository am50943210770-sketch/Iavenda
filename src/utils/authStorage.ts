import {
  AuthSession,
  OrderPost,
  StockDeductionLog,
  SecurityAlert,
  EmployeeLoginLog,
} from '../types/inventory';

export const SESSION_STORAGE_KEY = 'iavenda_auth_session';
export const ORDERS_STORAGE_KEY = 'iavenda_orders_posts';
export const DEDUCTIONS_STORAGE_KEY = 'iavenda_stock_deductions';
export const ALERTS_STORAGE_KEY = 'iavenda_security_alerts';
export const LOGIN_LOGS_STORAGE_KEY = 'iavenda_employee_login_logs';

// 12 hours in milliseconds as requested
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export interface AdminCredential {
  id: string; // 'حذيفة' | 'احمد'
  name: string;
  passwords: string[];
  isSupervisor: boolean;
  roleTitle: string;
}

export const REGISTERED_ADMINS: AdminCredential[] = [
  {
    id: 'حذيفة',
    name: 'حذيفة (مشرف)',
    passwords: ['8836'],
    isSupervisor: true,
    roleTitle: 'مشرف',
  },
  {
    id: 'Safa',
    name: 'Safa (موظف)',
    passwords: ['773894@1'],
    isSupervisor: false,
    roleTitle: 'موظف',
  },
  {
    id: 'Reem',
    name: 'Reem (موظف)',
    passwords: ['773636@2'],
    isSupervisor: false,
    roleTitle: 'موظف',
  },
  {
    id: 'Zaeenab',
    name: 'Zaeenab (موظف)',
    passwords: ['773917@3'],
    isSupervisor: false,
    roleTitle: 'موظف',
  },
  {
    id: 'Admin1',
    name: 'Admin1 (موظف)',
    passwords: ['3383737@4'],
    isSupervisor: false,
    roleTitle: 'موظف',
  },
  {
    id: 'Admin2',
    name: 'Admin2 (موظف)',
    passwords: ['82736@5'],
    isSupervisor: false,
    roleTitle: 'موظف',
  },
  {
    id: 'احمد',
    name: 'احمد (موظف)',
    passwords: ['9927'],
    isSupervisor: false,
    roleTitle: 'موظف',
  },
];

export function normalizeArabic(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/\s+/g, '');
}

export interface Formatted12HourTime {
  hours12: string;
  minutes: string;
  seconds: string;
  periodAr: 'صباحاً' | 'مساءً';
  fullTime12: string;
  detailedLabel: string;
  dateKey: string; // YYYY-MM-DD in local timezone
  dateAr: string;  // YYYY/MM/DD
  dayOfWeekAr: string; // الأحد، الإثنين...
  dayNumber: string; // 01..31
  monthNumber: string; // 01..12
  monthNameAr: string; // اسم الشهر بالعربي
  monthKey: string; // YYYY-MM
  year: string; // YYYY
}

const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ARABIC_MONTHS = [
  'كانون الثاني (يناير)',
  'شباط (فبراير)',
  'آذار (مارس)',
  'نيسان (أبريل)',
  'أيار (مايو)',
  'حزيران (يونيو)',
  'تموز (يوليو)',
  'آب (أغسطس)',
  'أيلول (سبتمبر)',
  'تشرين الأول (أكتوبر)',
  'تشرين الثاني (نوفمبر)',
  'كانون الأول (ديسمبر)',
];

/**
 * Formats a timestamp into 12-hour format with exact hours, minutes, seconds, day, and month
 */
export function formatTime12HourWithSeconds(timestamp: number): Formatted12HourTime {
  const d = new Date(timestamp);
  const rawHours = d.getHours();
  const isPM = rawHours >= 12;
  const h12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const hours12 = String(h12).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const periodAr: 'صباحاً' | 'مساءً' = isPM ? 'مساءً' : 'صباحاً';

  const year = String(d.getFullYear());
  const monthIdx = d.getMonth();
  const month = String(monthIdx + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  const dateAr = `${year}/${month}/${day}`;
  const dayOfWeekAr = ARABIC_DAYS[d.getDay()] || '';
  const monthNameAr = ARABIC_MONTHS[monthIdx] || '';
  const monthKey = `${year}-${month}`;

  return {
    hours12,
    minutes,
    seconds,
    periodAr,
    fullTime12: `${hours12}:${minutes}:${seconds} ${periodAr}`,
    detailedLabel: `الساعة ${hours12} و ${minutes} دقيقة و ${seconds} ثانية (${periodAr})`,
    dateKey,
    dateAr,
    dayOfWeekAr,
    dayNumber: day,
    monthNumber: month,
    monthNameAr,
    monthKey,
    year,
  };
}

export function getLocalDateKey(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Verify credentials
export function verifyCredentials(nameInput: string, passInput: string): {
  success: boolean;
  session?: AuthSession;
  errorReason?: string;
} {
  const normName = normalizeArabic(nameInput);
  const cleanPass = passInput.trim();

  // Find admin match
  const admin = REGISTERED_ADMINS.find((a) => {
    const normAdminId = normalizeArabic(a.id);
    const normAdminName = normalizeArabic(a.name);
    return (
      normAdminId === normName ||
      normAdminName.includes(normName) ||
      a.id.toLowerCase() === nameInput.trim().toLowerCase()
    );
  });

  if (!admin) {
    return { success: false, errorReason: `اسم الموظف أو المسؤول (${nameInput}) غير مسجل في النظام` };
  }

  const isPassValid = admin.passwords.some(
    (p) => p.toLowerCase() === cleanPass.toLowerCase() || p.replace(/\s+/g, '').toLowerCase() === cleanPass.replace(/\s+/g, '').toLowerCase()
  );

  if (!isPassValid) {
    return { success: false, errorReason: `الرمز السري غير صحيح للموظف (${admin.id})` };
  }

  const session: AuthSession = {
    adminId: admin.id,
    displayName: admin.name,
    isSupervisor: admin.isSupervisor,
    loginTime: Date.now(),
  };

  return { success: true, session };
}

// Session handling with 12 hour expiry check
export function getCurrentSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);

    const now = Date.now();
    const elapsed = now - session.loginTime;
    if (elapsed > SESSION_DURATION_MS) {
      // 12 hours expired!
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveCurrentSession(session: AuthSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearCurrentSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

// Security Alerts for Failed Logins
export function getSecurityAlerts(): SecurityAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordFailedLogin(attemptedName: string, attemptedCode: string, reason: string): SecurityAlert {
  const alerts = getSecurityAlerts();
  const newAlert: SecurityAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    attemptedName,
    attemptedCode,
    timestamp: Date.now(),
    reason,
    isRead: false,
  };
  const updated = [newAlert, ...alerts].slice(0, 50); // Keep last 50
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
  return newAlert;
}

export function markAlertsAsRead(): void {
  const alerts = getSecurityAlerts().map((a) => ({ ...a, isRead: true }));
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

export function clearAllSecurityAlerts(): void {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([]));
}

const LEGACY_DEMO_ORDER_IDS = new Set(['ord-101', 'ord-102', 'note-201', 'note-202']);
const LEGACY_DEMO_SHOE_IDS = new Set([
  'iav-001',
  'iav-002',
  'iav-003',
  'iav-004',
  'iav-005',
  'iav-006',
]);
const LEGACY_DEMO_DEDUCTION_IDS = new Set([
  'ded-001',
  'ded-002',
  'ded-003',
  'ded-004',
  'ded-005',
]);

// Orders & Chat Rooms Storage ('orders' = كروب تثبيت الطلبات, 'notes' = ملاحظات لافيندا)
export function stripReadyMadeImagesFromOrders(orders: OrderPost[]): OrderPost[] {
  return orders
    .filter((o) => o && !LEGACY_DEMO_ORDER_IDS.has(o.id))
    .map((o) => ({
      ...o,
      image: o.image && o.image.includes('images.unsplash.com') ? undefined : o.image,
      previousImage:
        o.previousImage && o.previousImage.includes('images.unsplash.com')
          ? undefined
          : o.previousImage,
    }));
}

export const INITIAL_ORDERS: OrderPost[] = [];

export function getStoredOrders(): OrderPost[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: OrderPost[] = JSON.parse(raw);
    const cleaned = stripReadyMadeImagesFromOrders(parsed);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders: OrderPost[]): void {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

// Stock Deduction Logs Storage
export function stripLegacyDemoDeductions(deductions: StockDeductionLog[]): StockDeductionLog[] {
  return deductions.filter(
    (d) =>
      d &&
      !LEGACY_DEMO_DEDUCTION_IDS.has(d.id) &&
      !LEGACY_DEMO_SHOE_IDS.has(d.shoeId)
  );
}

export const INITIAL_DEDUCTIONS: StockDeductionLog[] = [];

export function getStockDeductions(): StockDeductionLog[] {
  try {
    const raw = localStorage.getItem(DEDUCTIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: StockDeductionLog[] = JSON.parse(raw);
    const cleaned = stripLegacyDemoDeductions(parsed);
    localStorage.setItem(DEDUCTIONS_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStockDeductions(deductions: StockDeductionLog[]): void {
  try {
    localStorage.setItem(DEDUCTIONS_STORAGE_KEY, JSON.stringify(deductions));
  } catch (err) {
    console.error('Failed to save deductions to localStorage', err);
  }
}

export function markDeductionsReadBySupervisor(current: StockDeductionLog[]): StockDeductionLog[] {
  const updated = current.map((d) => ({ ...d, isReadBySupervisor: true }));
  saveStockDeductions(updated);
  return updated;
}

export function recordStockDeduction(
  shoeId: string,
  shoeCode: string,
  shoeName: string | undefined,
  colorName: string,
  size: number | string,
  quantityDecreased: number,
  adminId: string,
  adminName: string,
  actionType:
    | 'pair_deduct'
    | 'color_delete'
    | 'item_delete'
    | 'item_add'
    | 'color_add'
    | 'size_add'
    | 'stock_add' = 'pair_deduct',
  actionLabel?: string,
  operationCategory: 'deduct' | 'add' = 'deduct'
): StockDeductionLog {
  const current = getStockDeductions();
  const isEmployee = !adminId.includes('حذيفة');
  const log: StockDeductionLog = {
    id: `ded-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    shoeId,
    shoeCode,
    shoeName,
    colorName,
    size,
    quantityDecreased,
    operationCategory,
    adminId,
    adminName,
    timestamp: Date.now(),
    actionType,
    actionLabel:
      actionLabel ||
      (actionType === 'item_delete'
        ? 'سحب / حذف الكود بالكامل'
        : actionType === 'color_delete'
        ? 'سحب / حذف اللون بالكامل'
        : actionType === 'item_add'
        ? 'إضافة كود / قطعة جديدة'
        : actionType === 'color_add'
        ? 'إضافة لون جديد للقطعة'
        : actionType === 'size_add'
        ? 'إضافة قياس جديد'
        : actionType === 'stock_add'
        ? 'إضافة / زيادة عدد للمخزون'
        : 'سحب قطعة (زوج)'),
    isReadBySupervisor: !isEmployee,
  };
  const updated = [log, ...current];
  saveStockDeductions(updated);
  return log;
}

// Employee Login Logs Storage ("تسجيل دخول الموظفين بالوقت واليوم والشهر وإشعار لحذيفة")
const LEGACY_DEMO_LOGIN_IDS = new Set([
  'login-init-1',
  'login-init-2',
  'login-init-3',
  'login-init-4',
]);

export const INITIAL_LOGIN_LOGS: EmployeeLoginLog[] = [];

export function getEmployeeLoginLogs(): EmployeeLoginLog[] {
  try {
    const raw = localStorage.getItem(LOGIN_LOGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: EmployeeLoginLog[] = JSON.parse(raw);
    const cleaned = parsed.filter((l) => l && !LEGACY_DEMO_LOGIN_IDS.has(l.id));
    localStorage.setItem(LOGIN_LOGS_STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return [];
  }
}

export function saveEmployeeLoginLogs(logs: EmployeeLoginLog[]): void {
  try {
    localStorage.setItem(LOGIN_LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save login logs', err);
  }
}

export function markLoginLogsReadBySupervisor(current: EmployeeLoginLog[]): EmployeeLoginLog[] {
  const updated = current.map((l) => ({ ...l, isReadBySupervisor: true }));
  saveEmployeeLoginLogs(updated);
  return updated;
}

export function recordEmployeeLogin(session: AuthSession): EmployeeLoginLog {
  const current = getEmployeeLoginLogs();
  const isSupervisor = Boolean(session.isSupervisor || session.adminId === 'حذيفة');
  const newLog: EmployeeLoginLog = {
    id: `login-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    adminId: session.adminId,
    adminName: session.displayName || session.adminId,
    roleTitle: isSupervisor ? 'مشرف' : 'موظف',
    isSupervisor,
    timestamp: Date.now(),
    isReadBySupervisor: isSupervisor, // Unread for Huthaifa when an employee logs in
  };
  const updated = [newLog, ...current].slice(0, 300);
  saveEmployeeLoginLogs(updated);
  return newLog;
}
