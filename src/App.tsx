import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getStoredShoes,
  loadPersistedShoes,
  saveStoredShoes,
  sortWithFavoritesFirst,
  calculateTotalPairs,
} from './utils/storage';
import {
  reconcileShoes,
  addDeletedShoeId,
  removeDeletedShoeId,
  getLocalDeletedShoeIds,
} from './utils/idbStorage';
import {
  ShoeItem,
  ColorVariant,
  DeleteConfirmTarget,
  AuthSession,
  OrderPost,
  ChatRoomId,
  StockDeductionLog,
  SecurityAlert,
  EmployeeLoginLog,
} from './types/inventory';
import {
  getCurrentSession,
  saveCurrentSession,
  clearCurrentSession,
  getStoredOrders,
  saveStoredOrders,
  getStockDeductions,
  saveStockDeductions,
  markDeductionsReadBySupervisor,
  recordStockDeduction,
  getSecurityAlerts,
  clearAllSecurityAlerts,
  getEmployeeLoginLogs,
  saveEmployeeLoginLogs,
  markLoginLogsReadBySupervisor,
  formatTime12HourWithSeconds,
  getLocalDateKey,
  DEDUCTIONS_STORAGE_KEY,
  ORDERS_STORAGE_KEY,
  ALERTS_STORAGE_KEY,
  LOGIN_LOGS_STORAGE_KEY,
} from './utils/authStorage';
import { realtimeSync } from './utils/realtimeSync';
import { matchShoeWithQuery } from './utils/searchHelper';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { StatsBar } from './components/StatsBar';
import { ShoeCard } from './components/ShoeCard';
import { ShoeDetailModal } from './components/ShoeDetailModal';
import { AddShoeModal } from './components/AddShoeModal';
import { AddColorModal } from './components/AddColorModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { LoginModal } from './components/LoginModal';
import { SideNavDrawer } from './components/SideNavDrawer';
import { OrdersGroupModal } from './components/OrdersGroupModal';
import { DeductionsTrackerModal } from './components/DeductionsTrackerModal';
import { DailySalesReportModal } from './components/DailySalesReportModal';
import { LowStockAlertsModal } from './components/LowStockAlertsModal';
import { SecurityAlertsModal } from './components/SecurityAlertsModal';
import { EmployeeLoginsModal } from './components/EmployeeLoginsModal';
import { ConfirmDeductPairModal, DeductPairTarget } from './components/ConfirmDeductPairModal';
import {
  PackageOpen,
  Plus,
  FileText,
  TrendingDown,
  ShoppingBag,
  AlertTriangle,
  ShoppingCart,
  Clock,
  BellRing,
  Check,
  Eye,
  X,
  ArrowLeftRight,
  StickyNote,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export default function App() {
  const [shoes, setShoes] = useState<ShoeItem[]>(() => getStoredShoes());
  const [selectedShoe, setSelectedShoe] = useState<ShoeItem | null>(null);

  // Authentication & Session State (12 hours limit)
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(() => getCurrentSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !getCurrentSession());

  // Orders Group State
  const [orders, setOrders] = useState<OrderPost[]>(() => getStoredOrders());

  // Stock Deductions Tracker State
  const [deductions, setDeductions] = useState<StockDeductionLog[]>(() => getStockDeductions());

  // Security Alerts State (Failed Logins)
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(() => getSecurityAlerts());

  // Employee Login Logs State (for Supervisor Huthaifa's login notifications & history)
  const [loginLogs, setLoginLogs] = useState<EmployeeLoginLog[]>(() => getEmployeeLoginLogs());

  // Live Toast Notification exclusively for Supervisor Huthaifa when an employee pulls/deletes a piece or logs in
  const [liveSupervisorToast, setLiveSupervisorToast] = useState<StockDeductionLog | null>(null);
  const [liveLoginToast, setLiveLoginToast] = useState<EmployeeLoginLog | null>(null);

  // Navigation Drawers & Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOrdersGroupOpen, setIsOrdersGroupOpen] = useState(false);
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoomId>('orders');
  const [isDeductionsTrackerOpen, setIsDeductionsTrackerOpen] = useState(false);
  const [isDailySalesReportOpen, setIsDailySalesReportOpen] = useState(false);
  const [isLowStockAlertsOpen, setIsLowStockAlertsOpen] = useState(false);
  const [isEmployeeLoginsOpen, setIsEmployeeLoginsOpen] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [isLowStockBannerDismissed, setIsLowStockBannerDismissed] = useState(false);
  const [isSecurityAlertsOpen, setIsSecurityAlertsOpen] = useState(false);
  const [deductPairTarget, setDeductPairTarget] = useState<DeductPairTarget | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [shoeToEdit, setShoeToEdit] = useState<ShoeItem | null>(null);
  const [shoeForNewColor, setShoeForNewColor] = useState<ShoeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmTarget | null>(null);

  // Check if current logged-in user is Supervisor Huthaifa ("حذيفة فقط")
  const isHuthaifaSupervisor = Boolean(
    currentSession &&
      (currentSession.isSupervisor || currentSession.adminId === 'حذيفة')
  );

  // Instantaneous sync & automatic reset/refresh whenever someone exits and re-enters
  const syncLatestServerState = useCallback(async (resetFiltersAndView = false) => {
    if (resetFiltersAndView) {
      setSearchQuery('');
      setSelectedColor('');
      setOnlyFavorites(false);
    }
    const serverState = await realtimeSync.fetchInitialState();
    if (!serverState) return;

    // Load persistent local shoes (from IndexedDB / localStorage)
    const localShoes = await loadPersistedShoes();
    const serverShoes = Array.isArray(serverState.shoes) ? serverState.shoes : [];
    const serverDeletedIds = Array.isArray(serverState.deletedShoeIds) ? serverState.deletedShoeIds : [];

    // Intelligently reconcile: NEVER delete pieces unless an employee explicitly deleted them!
    const { merged, hasNewLocalToPush } = reconcileShoes(localShoes, serverShoes, serverDeletedIds);
    setShoes(merged);
    saveStoredShoes(merged);

    // If client had shoes that server didn't have (e.g. server restarted or container scaled),
    // immediately re-hydrate the server with the preserved shoes!
    if (hasNewLocalToPush) {
      realtimeSync.publishUpdate({
        shoes: merged,
        deletedShoeIds: getLocalDeletedShoeIds(),
        eventType: 'sync',
      });
    }

    if (Array.isArray(serverState.deductions)) {
      setDeductions(serverState.deductions);
      saveStockDeductions(serverState.deductions);
    }
    if (Array.isArray(serverState.orders)) {
      setOrders(serverState.orders);
      saveStoredOrders(serverState.orders);
    }
    if (Array.isArray(serverState.securityAlerts)) {
      setSecurityAlerts(serverState.securityAlerts);
    }
    if (Array.isArray(serverState.loginLogs)) {
      setLoginLogs(serverState.loginLogs);
      saveEmployeeLoginLogs(serverState.loginLogs);
    }
  }, []);

  // Connect to Real-Time Server, Multi-Tab Sync, and Auto-Reset on Leave/Return
  useEffect(() => {
    let mounted = true;

    // Initial async IndexedDB load
    loadPersistedShoes().then((loaded) => {
      if (mounted && loaded.length > 0) {
        setShoes(loaded);
      }
    });

    syncLatestServerState(true);
    realtimeSync.connect();

    const unsubscribe = realtimeSync.subscribe((remoteState, meta) => {
      if (!mounted) return;
      if (Array.isArray(remoteState.shoes)) {
        const currentLocal = getStoredShoes();
        const serverDeletedIds = Array.isArray(remoteState.deletedShoeIds)
          ? remoteState.deletedShoeIds
          : [];
        const { merged } = reconcileShoes(currentLocal, remoteState.shoes, serverDeletedIds);
        setShoes(merged);
        saveStoredShoes(merged);
      }
      if (Array.isArray(remoteState.deductions)) {
        setDeductions(remoteState.deductions);
        saveStockDeductions(remoteState.deductions);
      }
      if (Array.isArray(remoteState.orders)) {
        setOrders(remoteState.orders);
        saveStoredOrders(remoteState.orders);
      }
      if (Array.isArray(remoteState.securityAlerts)) {
        setSecurityAlerts(remoteState.securityAlerts);
      }
      if (Array.isArray(remoteState.loginLogs)) {
        setLoginLogs(remoteState.loginLogs);
        saveEmployeeLoginLogs(remoteState.loginLogs);
      }

      // If a piece was just deleted/pulled or added by an employee, trigger live toast for Huthaifa
      if (meta?.latestDeduction) {
        setLiveSupervisorToast(meta.latestDeduction);
      }
      // If an employee just logged in, trigger live login notification for Huthaifa
      if (meta?.latestLogin && !meta.latestLogin.isSupervisor) {
        setLiveLoginToast(meta.latestLogin);
      }
    });

    // Also listen for localStorage events across browser tabs
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'iavenda_warehouse_inventory_v2') {
        setShoes(getStoredShoes());
      } else if (e.key === DEDUCTIONS_STORAGE_KEY) {
        setDeductions(getStockDeductions());
      } else if (e.key === ORDERS_STORAGE_KEY) {
        setOrders(getStoredOrders());
      } else if (e.key === ALERTS_STORAGE_KEY) {
        setSecurityAlerts(getSecurityAlerts());
      } else if (e.key === LOGIN_LOGS_STORAGE_KEY) {
        setLoginLogs(getEmployeeLoginLogs());
      }
    };

    // Automatic reset & fresh sync whenever user exits the site/tab and re-enters it
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        realtimeSync.connect();
        syncLatestServerState(true);
      }
    };

    const handleWindowFocusOrPageShow = () => {
      realtimeSync.connect();
      syncLatestServerState(false);
    };

    window.addEventListener('storage', handleStorageEvent);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocusOrPageShow);
    window.addEventListener('pageshow', handleWindowFocusOrPageShow);

    // Fast background sync poll (every 3 seconds) to guarantee instant updates across all devices
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncLatestServerState(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocusOrPageShow);
      window.removeEventListener('pageshow', handleWindowFocusOrPageShow);
      window.clearInterval(pollInterval);
    };
  }, [syncLatestServerState]);

  // Check 12-hour session expiry periodically
  useEffect(() => {
    const checkSession = () => {
      const active = getCurrentSession();
      if (!active) {
        setCurrentSession(null);
        setIsLoginModalOpen(true);
      }
    };

    const interval = setInterval(checkSession, 15000);
    return () => clearInterval(interval);
  }, []);

  // Keep selected shoe synced if shoes array updates or if it was deleted by another user
  useEffect(() => {
    if (selectedShoe) {
      const fresh = shoes.find((s) => s.id === selectedShoe.id);
      if (fresh) {
        setSelectedShoe(fresh);
      } else {
        setSelectedShoe(null);
      }
    }
  }, [shoes]);

  // Helper to update shoes locally + broadcast to everyone on server
  const updateShoesForEveryone = (
    updater: (prev: ShoeItem[]) => ShoeItem[],
    extraSync?: {
      deletedShoeIds?: string[];
      deductions?: StockDeductionLog[];
      eventType?: 'delete_piece' | 'deduct_pair' | 'sync';
      latestDeduction?: StockDeductionLog | null;
    }
  ) => {
    setShoes((prev) => {
      const next = updater(prev);
      saveStoredShoes(next);
      realtimeSync.publishUpdate({
        shoes: next,
        deletedShoeIds: extraSync?.deletedShoeIds || getLocalDeletedShoeIds(),
        deductions: extraSync?.deductions,
        eventType: extraSync?.eventType || 'sync',
        latestDeduction: extraSync?.latestDeduction || null,
      });
      return next;
    });
  };

  // Toggle Favorite: Updates favoritedAt and pins to top immediately for everyone
  const handleToggleFavorite = (shoeId: string) => {
    updateShoesForEveryone((prevShoes) => {
      const updated = prevShoes.map((shoe) => {
        if (shoe.id === shoeId) {
          const newFav = !shoe.isFavorite;
          return {
            ...shoe,
            isFavorite: newFav,
            favoritedAt: newFav ? Date.now() : undefined,
          };
        }
        return shoe;
      });
      return sortWithFavoritesFirst(updated);
    });
  };

  const handleCardToggleFavorite = (e: React.MouseEvent, shoeId: string) => {
    e.stopPropagation();
    handleToggleFavorite(shoeId);
  };

  // Delete flow per user specifications
  const handleOpenDeleteModal = (target: DeleteConfirmTarget) => {
    setDeleteTarget(target);
  };

  const handleCardDeleteRequest = (e: React.MouseEvent, shoe: ShoeItem) => {
    e.stopPropagation();
    const totalPairs = calculateTotalPairs(shoe);
    setDeleteTarget({
      type: 'item',
      itemId: shoe.id,
      code: shoe.code,
      colorName: `جميع الألوان (${shoe.colors.length})`,
      sizesSummary: `${totalPairs} زوج في المستودع`,
    });
  };

  // "اجعله عند حذف قطعه تنحذف عند الجميع وتطلع يم حذيفة فقط بان الموضف أحمد سحب قطعه" + "اجعل تاكيد عند حذف قطعه"
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const targetItemId = deleteTarget.itemId || deleteTarget.shoeId || '';
    const actorId = currentSession?.adminId || 'احمد';
    const actorName = currentSession?.displayName || 'احمد (موظف)';

    let newLog: StockDeductionLog | null = null;

    if (deleteTarget.type === 'item' || deleteTarget.type === 'shoe') {
      const shoeBeingDeleted = shoes.find((s) => s.id === targetItemId);
      const totalPairs = shoeBeingDeleted ? calculateTotalPairs(shoeBeingDeleted) : 1;
      const nextDeletedIds = addDeletedShoeId(targetItemId);

      newLog = recordStockDeduction(
        targetItemId,
        deleteTarget.code || shoeBeingDeleted?.code || '',
        shoeBeingDeleted?.name,
        deleteTarget.colorName || 'جميع الألوان',
        'حذف القطعة بالكامل',
        totalPairs > 0 ? totalPairs : 1,
        actorId,
        actorName,
        'item_delete',
        'سحب / حذف قطعة كاملة'
      );

      const nextDeductions = [newLog, ...deductions];
      setDeductions(nextDeductions);

      updateShoesForEveryone(
        (prev) => prev.filter((s) => s.id !== targetItemId),
        {
          deletedShoeIds: nextDeletedIds,
          deductions: nextDeductions,
          eventType: 'delete_piece',
          latestDeduction: newLog,
        }
      );

      if (selectedShoe?.id === targetItemId) {
        setSelectedShoe(null);
      }
    } else if (deleteTarget.type === 'color' && deleteTarget.colorId) {
      const shoeItem = shoes.find((s) => s.id === targetItemId);
      const colorVar = shoeItem?.colors.find((c) => c.id === deleteTarget.colorId);
      const colorPairs = colorVar
        ? colorVar.sizes.reduce((sum, sz) => sum + (sz.quantity || 0), 0)
        : 1;

      newLog = recordStockDeduction(
        targetItemId,
        deleteTarget.code || shoeItem?.code || '',
        shoeItem?.name,
        deleteTarget.colorName || colorVar?.colorName || 'لون محذوف',
        deleteTarget.sizesSummary || 'جميع مقاسات اللون',
        colorPairs > 0 ? colorPairs : 1,
        actorId,
        actorName,
        'color_delete',
        'سحب / حذف لون كامل'
      );

      const nextDeductions = [newLog, ...deductions];
      setDeductions(nextDeductions);

      updateShoesForEveryone(
        (prev) =>
          prev.map((s) => {
            if (s.id === targetItemId) {
              return {
                ...s,
                updatedAt: Date.now(),
                colors: s.colors.filter((c) => c.id !== deleteTarget.colorId),
              };
            }
            return s;
          }),
        {
          deductions: nextDeductions,
          eventType: 'delete_piece',
          latestDeduction: newLog,
        }
      );
    } else if (
      deleteTarget.type === 'size' &&
      deleteTarget.colorId &&
      deleteTarget.size !== undefined
    ) {
      const shoeItem = shoes.find((s) => s.id === targetItemId);
      const colorVar = shoeItem?.colors.find((c) => c.id === deleteTarget.colorId);
      const szObj = colorVar?.sizes.find((sz) => String(sz.size) === String(deleteTarget.size));
      const sizeQty = szObj ? szObj.quantity : 1;

      newLog = recordStockDeduction(
        targetItemId,
        deleteTarget.code || shoeItem?.code || '',
        shoeItem?.name,
        deleteTarget.colorName || colorVar?.colorName || '',
        deleteTarget.size,
        sizeQty > 0 ? sizeQty : 1,
        actorId,
        actorName,
        'pair_deduct',
        `حذف قياس ${deleteTarget.size}`
      );

      const nextDeductions = [newLog, ...deductions];
      setDeductions(nextDeductions);

      updateShoesForEveryone(
        (prev) =>
          prev.map((s) => {
            if (s.id !== targetItemId) return s;
            return {
              ...s,
              updatedAt: Date.now(),
              colors: s.colors.map((c) => {
                if (c.id !== deleteTarget.colorId) return c;
                return {
                  ...c,
                  sizes: c.sizes.filter(
                    (sz) => String(sz.size) !== String(deleteTarget.size)
                  ),
                };
              }),
            };
          }),
        {
          deductions: nextDeductions,
          eventType: 'delete_piece',
          latestDeduction: newLog,
        }
      );
    }

    if (newLog) {
      setLiveSupervisorToast(newLog);
    }

    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  // Stock Adjustment for a specific color and size
  const handleUpdateStock = (
    shoeId: string,
    colorId: string,
    sizeVal: number | string,
    delta: number,
    extraSync?: {
      deductions?: StockDeductionLog[];
      eventType?: 'delete_piece' | 'deduct_pair' | 'sync';
      latestDeduction?: StockDeductionLog | null;
    }
  ) => {
    if (delta < 0) {
      // Re-show low stock visual alert banner if a stock decrease happens
      setIsLowStockBannerDismissed(false);
    }
    let syncPayload = extraSync;

    if (delta > 0 && !extraSync) {
      const targetShoe = shoes.find((s) => s.id === shoeId);
      const targetColor = targetShoe?.colors.find((c) => c.id === colorId);
      if (targetShoe && targetColor) {
        const actorId = currentSession?.adminId || 'موظف';
        const actorName = currentSession?.displayName || actorId;
        const addLog = recordStockDeduction(
          shoeId,
          targetShoe.code,
          targetShoe.name,
          targetColor.colorName,
          sizeVal,
          delta,
          actorId,
          actorName,
          'stock_add',
          `إضافة +${delta} قطعة للمخزون`,
          'add'
        );
        const nextLogs = [addLog, ...deductions];
        setDeductions(nextLogs);
        setLiveSupervisorToast(addLog);
        syncPayload = {
          deductions: nextLogs,
          eventType: 'sync',
          latestDeduction: addLog,
        };
      }
    }

    updateShoesForEveryone(
      (prev) =>
        prev.map((shoe) => {
          if (shoe.id !== shoeId) return shoe;
          return {
            ...shoe,
            updatedAt: Date.now(),
            colors: shoe.colors.map((c) => {
              if (c.id !== colorId) return c;
              return {
                ...c,
                sizes: c.sizes.map((s) => {
                  if (String(s.size) === String(sizeVal)) {
                    const newQty = Math.max(0, s.quantity + delta);
                    return { ...s, quantity: newQty };
                  }
                  return s;
                }),
              };
            }),
          };
        }),
      syncPayload
    );
  };

  // Smooth direct stock quantity setter (requires confirmation if decreasing/deleting pieces: "اجعل تاكيد عند حذف قطعه")
  const handleSetExactStock = (
    shoeId: string,
    colorId: string,
    sizeVal: number | string,
    newQuantity: number
  ) => {
    const cleanQty = Math.max(0, newQuantity);
    const targetShoe = shoes.find((s) => s.id === shoeId);
    const targetColor = targetShoe?.colors.find((c) => c.id === colorId);
    const targetSize = targetColor?.sizes.find((s) => String(s.size) === String(sizeVal));
    const oldQty = targetSize ? targetSize.quantity : 0;
    const diff = cleanQty - oldQty;
    if (diff === 0) return;

    if (diff < 0 && targetShoe && targetColor) {
      const decreasedAmount = Math.abs(diff);
      setDeductPairTarget({
        shoeId,
        colorId,
        shoeCode: targetShoe.code,
        shoeName: targetShoe.name,
        colorName: targetColor.colorName,
        size: sizeVal,
        currentQuantity: oldQty,
        quantityToDeduct: decreasedAmount,
      });
    } else {
      handleUpdateStock(shoeId, colorId, sizeVal, diff);
    }
  };

  // Pair deduction with confirmation modal and auto-logging for supervisors:
  // "اجعله عند حذف قطعه تنحذف عند الجميع وتطلع يم حذيفة فقط بان الموضف أحمد سحب قطعه"
  const handleConfirmDeductPair = (target: DeductPairTarget) => {
    if (!currentSession) {
      setIsLoginModalOpen(true);
      return;
    }

    const deductAmount =
      target.quantityToDeduct && target.quantityToDeduct > 0 ? target.quantityToDeduct : 1;

    // 1. Record stock deduction in audit log
    const newLog = recordStockDeduction(
      target.shoeId,
      target.shoeCode,
      target.shoeName,
      target.colorName,
      target.size,
      deductAmount,
      currentSession.adminId,
      currentSession.displayName,
      'pair_deduct',
      deductAmount === 1 ? 'سحب قطعة (زوج واحد)' : `سحب ${deductAmount} قطع`
    );

    const nextDeductions = [newLog, ...deductions];
    setDeductions(nextDeductions);
    setLiveSupervisorToast(newLog);

    // 2. Decrement stock for EVERYONE and broadcast deduction log
    handleUpdateStock(target.shoeId, target.colorId, target.size, -deductAmount, {
      deductions: nextDeductions,
      eventType: 'deduct_pair',
      latestDeduction: newLog,
    });

    setDeductPairTarget(null);
  };

  // Mark all unread employee withdrawal notifications as read by Supervisor Huthaifa
  const handleMarkWithdrawalsRead = () => {
    const updated = markDeductionsReadBySupervisor(deductions);
    setDeductions(updated);
    setLiveSupervisorToast(null);
    realtimeSync.publishUpdate({
      deductions: updated,
      eventType: 'sync',
    });
  };

  // Add custom size to an existing color in details
  const handleAddCustomSize = (shoeId: string, colorId: string, sizeInput: string | number) => {
    const s = String(sizeInput).trim();
    if (!s) return;

    const targetShoe = shoes.find((sh) => sh.id === shoeId);
    const targetColor = targetShoe?.colors.find((c) => c.id === colorId);
    let extraSync: {
      deductions?: StockDeductionLog[];
      eventType?: 'delete_piece' | 'deduct_pair' | 'sync';
      latestDeduction?: StockDeductionLog | null;
    } | undefined;

    if (
      targetShoe &&
      targetColor &&
      !targetColor.sizes.some((existing) => String(existing.size) === s)
    ) {
      const actorId = currentSession?.adminId || 'موظف';
      const actorName = currentSession?.displayName || actorId;
      const addLog = recordStockDeduction(
        shoeId,
        targetShoe.code,
        targetShoe.name,
        targetColor.colorName,
        s,
        3,
        actorId,
        actorName,
        'size_add',
        `إضافة قياس جديد (${s})`,
        'add'
      );
      const nextLogs = [addLog, ...deductions];
      setDeductions(nextLogs);
      setLiveSupervisorToast(addLog);
      extraSync = {
        deductions: nextLogs,
        eventType: 'sync',
        latestDeduction: addLog,
      };
    }

    updateShoesForEveryone(
      (prev) =>
        prev.map((shoe) => {
          if (shoe.id !== shoeId) return shoe;
          return {
            ...shoe,
            colors: shoe.colors.map((c) => {
              if (c.id !== colorId) return c;
              if (c.sizes.some((existing) => String(existing.size) === s)) return c;
              return {
                ...c,
                sizes: [
                  ...c.sizes,
                  { size: isNaN(Number(s)) ? s : Number(s), quantity: 3 },
                ],
              };
            }),
          };
        }),
      extraSync
    );
  };

  // Add new color to an existing shoe
  const handleAddColorToShoe = (shoeId: string, newVariant: ColorVariant) => {
    const targetShoe = shoes.find((sh) => sh.id === shoeId);
    let extraSync: {
      deductions?: StockDeductionLog[];
      eventType?: 'delete_piece' | 'deduct_pair' | 'sync';
      latestDeduction?: StockDeductionLog | null;
    } | undefined;

    if (targetShoe) {
      const addedPairs = newVariant.sizes.reduce((sum, sz) => sum + (sz.quantity || 0), 0);
      const actorId = currentSession?.adminId || 'موظف';
      const actorName = currentSession?.displayName || actorId;
      const addLog = recordStockDeduction(
        shoeId,
        targetShoe.code,
        targetShoe.name,
        newVariant.colorName,
        'لون جديد بالكامل',
        addedPairs > 0 ? addedPairs : 1,
        actorId,
        actorName,
        'color_add',
        `إضافة لون جديد (${newVariant.colorName})`,
        'add'
      );
      const nextLogs = [addLog, ...deductions];
      setDeductions(nextLogs);
      setLiveSupervisorToast(addLog);
      extraSync = {
        deductions: nextLogs,
        eventType: 'sync',
        latestDeduction: addLog,
      };
    }

    updateShoesForEveryone(
      (prev) =>
        prev.map((shoe) => {
          if (shoe.id !== shoeId) return shoe;
          return {
            ...shoe,
            updatedAt: Date.now(),
            colors: [...shoe.colors, newVariant],
          };
        }),
      extraSync
    );
  };

  // Save new or edited shoe ("حذيفه يستطيع رويا كل شيء منو ضاف قطعه ومنو سحب قطعه")
  const handleSaveShoe = (savedShoe: ShoeItem) => {
    removeDeletedShoeId(savedShoe.id);
    const exists = shoes.some((s) => s.id === savedShoe.id);
    let extraSync: {
      deductions?: StockDeductionLog[];
      eventType?: 'delete_piece' | 'deduct_pair' | 'sync';
      latestDeduction?: StockDeductionLog | null;
    } | undefined;

    if (!exists) {
      const totalAddedPairs = calculateTotalPairs(savedShoe);
      const colorsNames = savedShoe.colors.map((c) => c.colorName).join('، ') || 'أساسي';
      const actorId = currentSession?.adminId || 'موظف';
      const actorName = currentSession?.displayName || actorId;
      const addLog = recordStockDeduction(
        savedShoe.id,
        savedShoe.code,
        savedShoe.name,
        colorsNames,
        'قطعة / كود جديد',
        totalAddedPairs > 0 ? totalAddedPairs : 1,
        actorId,
        actorName,
        'item_add',
        'إضافة كود / قطعة جديدة للمستودع',
        'add'
      );
      const nextLogs = [addLog, ...deductions];
      setDeductions(nextLogs);
      setLiveSupervisorToast(addLog);
      extraSync = {
        deductions: nextLogs,
        eventType: 'sync',
        latestDeduction: addLog,
      };
    }

    updateShoesForEveryone(
      (prev) => {
        const alreadyExists = prev.some((s) => s.id === savedShoe.id);
        let nextList: ShoeItem[];
        if (alreadyExists) {
          nextList = prev.map((s) => (s.id === savedShoe.id ? savedShoe : s));
        } else {
          nextList = [savedShoe, ...prev];
        }
        return sortWithFavoritesFirst(nextList);
      },
      extraSync
    );
    setShoeToEdit(null);
  };

  // Orders & Chat Rooms Handlers ('orders' = كروب تثبيت الطلبات, 'notes' = ملاحظات لافيندا)
  const handleAddOrder = (newOrderData: Omit<OrderPost, 'id' | 'createdAt'>) => {
    const newOrder: OrderPost = {
      ...newOrderData,
      roomId: newOrderData.roomId || activeChatRoom || 'orders',
      id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    const updated = [newOrder, ...orders];
    setOrders(updated);
    saveStoredOrders(updated);
    realtimeSync.publishUpdate({ orders: updated });
  };

  // All employees can delete a message, and it clearly records WHO deleted it ("وجميع الموضفين يستطيعون حذف الرساله ويبين منو حذفها")
  const handleDeleteOrder = (orderId: string) => {
    const deleterId = currentSession?.adminId || 'موظف';
    const deleterName = currentSession?.displayName || currentSession?.adminId || 'موظف';
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            isDeleted: true,
            deletedBy: deleterId,
            deletedByName: deleterName,
            deletedAt: Date.now(),
            previousText: o.text,
            previousImage: o.image,
          }
        : o
    );
    setOrders(updated);
    saveStoredOrders(updated);
    realtimeSync.publishUpdate({ orders: updated });
  };

  const handleRestoreOrder = (orderId: string) => {
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            isDeleted: false,
            deletedBy: undefined,
            deletedByName: undefined,
            deletedAt: undefined,
          }
        : o
    );
    setOrders(updated);
    saveStoredOrders(updated);
    realtimeSync.publishUpdate({ orders: updated });
  };

  const handlePermanentDeleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    saveStoredOrders(updated);
    realtimeSync.publishUpdate({ orders: updated });
  };

  const handleUpdateOrder = (orderId: string, updatedText: string, updatedImage?: string) => {
    const editorId = currentSession?.adminId || 'موظف';
    const editorName = currentSession?.displayName || currentSession?.adminId || 'موظف';
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            text: updatedText,
            image: updatedImage,
            updatedAt: Date.now(),
            editedBy: editorId,
            editedByName: editorName,
          }
        : o
    );
    setOrders(updated);
    saveStoredOrders(updated);
    realtimeSync.publishUpdate({ orders: updated });
  };

  const handleToggleConfirmOrder = (orderId: string) => {
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            isConfirmed: !o.isConfirmed,
            confirmedAt: !o.isConfirmed ? Date.now() : undefined,
            confirmedBy: !o.isConfirmed ? currentSession?.adminId : undefined,
          }
        : o
    );
    setOrders(updated);
    saveStoredOrders(updated);
    realtimeSync.publishUpdate({ orders: updated });
  };

  // Security Alerts Handlers
  const handleClearAlerts = () => {
    clearAllSecurityAlerts();
    setSecurityAlerts([]);
    realtimeSync.publishUpdate({ securityAlerts: [] });
  };

  const handleRefreshAlerts = () => {
    const latestAlerts = getSecurityAlerts();
    setSecurityAlerts(latestAlerts);
    realtimeSync.publishUpdate({ securityAlerts: latestAlerts });
  };

  // Logout Handler (resets view and syncs fresh state when exiting and re-entering)
  const handleLogout = () => {
    clearCurrentSession();
    setCurrentSession(null);
    setSelectedShoe(null);
    setSearchQuery('');
    setSelectedColor('');
    setOnlyFavorites(false);
    setIsLoginModalOpen(true);
    syncLatestServerState(true);
  };

  // Filtered shoes calculation
  const filteredShoes = useMemo(() => {
    return shoes.filter((shoe) => {
      // 1. Search query (matches details like "كعب 5 سم" / "كعب ٥ سم", colors, code, name, sizes)
      if (searchQuery.trim()) {
        if (!matchShoeWithQuery(shoe, searchQuery)) {
          return false;
        }
      }

      // 2. Color filter
      if (selectedColor) {
        const hasColor = shoe.colors.some(
          (c) => c.colorName.trim().toLowerCase() === selectedColor.trim().toLowerCase()
        );
        if (!hasColor) return false;
      }

      // 3. Favorites only
      if (onlyFavorites && !shoe.isFavorite) {
        return false;
      }

      return true;
    });
  }, [shoes, searchQuery, selectedColor, onlyFavorites]);

  const unconfirmedOrdersCount = orders.filter(
    (o) => (!o.roomId || o.roomId === 'orders') && !o.isDeleted && !o.isConfirmed
  ).length;
  const activeLavendaNotesCount = orders.filter(
    (o) => o.roomId === 'notes' && !o.isDeleted
  ).length;

  // Unread employee login notifications for Supervisor Huthaifa ("اشعار ل حذيفه داخل الموقع كل موضف اي وقت سوا تسجيل دخول")
  const unreadEmployeeLogins = useMemo(() => {
    return loginLogs.filter((l) => !l.isReadBySupervisor && !l.isSupervisor);
  }, [loginLogs]);

  const handleMarkLoginsRead = () => {
    const updated = markLoginLogsReadBySupervisor(loginLogs);
    setLoginLogs(updated);
    setLiveLoginToast(null);
    realtimeSync.publishUpdate({ loginLogs: updated });
  };

  // Unread withdrawals by Employee Ahmed (to show ONLY to Supervisor Huthaifa)
  const unreadAhmedWithdrawals = useMemo(() => {
    return deductions.filter(
      (d) =>
        d.isReadBySupervisor === false &&
        (d.adminId.includes('احمد') ||
          d.adminName.includes('احمد') ||
          d.adminId === 'admin 3' ||
          !d.adminId.includes('حذيفة'))
    );
  }, [deductions]);

  // All withdrawals by employees for quick counter on Huthaifa's dashboard
  const totalAhmedPiecesPulled = useMemo(() => {
    return deductions
      .filter((d) => !d.adminId.includes('حذيفة') && d.operationCategory !== 'add')
      .reduce((sum, d) => sum + d.quantityDecreased, 0);
  }, [deductions]);

  // Personal pieces pulled by the currently logged-in employee ("كل موضف يكدر يشوف القطع الهوا سحبها فقط")
  const myPersonalPiecesPulled = useMemo(() => {
    if (!currentSession) return 0;
    const myKey = currentSession.adminId.trim().toLowerCase();
    return deductions
      .filter(
        (d) =>
          d.operationCategory !== 'add' &&
          (d.adminId.trim().toLowerCase() === myKey ||
            d.adminName.toLowerCase().includes(myKey))
      )
      .reduce((sum, d) => sum + d.quantityDecreased, 0);
  }, [deductions, currentSession]);

  // Total pairs sold/deducted across all records & today's records for the Daily Sales Report badge
  const totalAllSoldPairs = useMemo(() => {
    return deductions
      .filter((d) => d.operationCategory !== 'add')
      .reduce((sum, d) => sum + d.quantityDecreased, 0);
  }, [deductions]);

  const todaySoldPairs = useMemo(() => {
    const todayKey = getLocalDateKey(Date.now());
    return deductions
      .filter(
        (d) =>
          d.operationCategory !== 'add' &&
          formatTime12HourWithSeconds(d.timestamp).dateKey === todayKey
      )
      .reduce((sum, d) => sum + d.quantityDecreased, 0);
  }, [deductions]);

  // Low Stock Alerts Calculation (any size or color with quantity <= lowStockThreshold, default 5)
  const lowStockSummary = useMemo(() => {
    let modelsNeedingReorderCount = 0;
    let lowSizesCount = 0;
    let outOfStockSizesCount = 0;
    const urgentExamples: {
      id: string;
      shoeCode: string;
      shoeName?: string;
      colorName: string;
      size: number | string;
      quantity: number;
    }[] = [];

    shoes.forEach((shoe) => {
      let shoeHasLowStock = false;
      shoe.colors.forEach((color) => {
        const colorTotal = color.sizes.reduce((sum, s) => sum + s.quantity, 0);
        if (colorTotal <= lowStockThreshold) {
          shoeHasLowStock = true;
        }
        color.sizes.forEach((sz) => {
          if (sz.quantity <= lowStockThreshold) {
            shoeHasLowStock = true;
            lowSizesCount += 1;
            if (sz.quantity === 0) {
              outOfStockSizesCount += 1;
            }
            urgentExamples.push({
              id: `${shoe.id}-${color.id}-${sz.size}`,
              shoeCode: shoe.code,
              shoeName: shoe.name,
              colorName: color.colorName,
              size: sz.size,
              quantity: sz.quantity,
            });
          }
        });
      });
      if (shoeHasLowStock) {
        modelsNeedingReorderCount += 1;
      }
    });

    urgentExamples.sort((a, b) => a.quantity - b.quantity);

    return {
      modelsNeedingReorderCount,
      lowSizesCount,
      outOfStockSizesCount,
      urgentExamples: urgentExamples.slice(0, 4),
    };
  }, [shoes, lowStockThreshold]);

  return (
    <div
      className="min-h-screen bg-[#0d071a] text-slate-100 flex flex-col font-['Cairo',sans-serif]"
      dir="rtl"
    >
      {/* 1. Top Navigation & Branding with 3-Bars Hamburger Button */}
      <Header
        shoes={shoes}
        currentSession={currentSession}
        unconfirmedOrdersCount={unconfirmedOrdersCount}
        securityAlertsCount={
          securityAlerts.length +
          (isHuthaifaSupervisor
            ? unreadAhmedWithdrawals.length + unreadEmployeeLogins.length
            : 0)
        }
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenAddModal={() => {
          setShoeToEdit(null);
          setIsAddModalOpen(true);
        }}
      />

      {/* Quick Access Bar for Orders & Supervisor Reports */}
      <div className="bg-[#160c28] border-b border-purple-800/40 px-3 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Chat Room 1: كروب تثبيت الطلبات */}
            <button
              onClick={() => {
                setActiveChatRoom('orders');
                setIsOrdersGroupOpen(true);
              }}
              className="flex items-center gap-1.5 bg-purple-900/70 hover:bg-purple-800 text-purple-100 px-3 py-1.5 rounded-xl border border-purple-600/60 transition cursor-pointer font-black shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>💬 كروب تثبيت الطلبات</span>
              {unconfirmedOrdersCount > 0 && (
                <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {unconfirmedOrdersCount}
                </span>
              )}
            </button>

            {/* Chat Room 2: ملاحظات لافيندا */}
            <button
              onClick={() => {
                setActiveChatRoom('notes');
                setIsOrdersGroupOpen(true);
              }}
              className="flex items-center gap-1.5 bg-fuchsia-950/70 hover:bg-fuchsia-900 text-fuchsia-100 px-3 py-1.5 rounded-xl border border-fuchsia-600/60 transition cursor-pointer font-black shadow-sm"
            >
              <StickyNote className="w-3.5 h-3.5 text-fuchsia-300" />
              <span>📝 ملاحظات لافيندا</span>
              <span className="bg-fuchsia-800/80 text-fuchsia-200 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {activeLavendaNotesCount}
              </span>
            </button>

            {/* Employee Personal Withdrawals Button ("وضيف زر كل موضف يكدر يشوف القطع الهوا سحبها فقط") */}
            {currentSession && !isHuthaifaSupervisor && (
              <button
                onClick={() => setIsDeductionsTrackerOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900/90 to-fuchsia-900/80 hover:from-purple-800 hover:to-fuchsia-800 text-white px-3 py-1.5 rounded-xl border border-fuchsia-500/60 transition cursor-pointer font-black shadow-sm"
              >
                <TrendingDown className="w-3.5 h-3.5 text-fuchsia-300" />
                <span>📦 القطع التي سحبتها</span>
                <span className="bg-fuchsia-950 text-fuchsia-200 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-fuchsia-500/50">
                  {myPersonalPiecesPulled} قطعة
                </span>
              </button>
            )}

            {/* Visible ONLY to Huthaifa (Supervisor) - Hidden from Employees */}
            {isHuthaifaSupervisor && (
              <>
                {/* Employee Logins Dedicated Button ("واجعل لها زر وحده باسم تسجيل دخول الموضفين") */}
                <button
                  onClick={() => setIsEmployeeLoginsOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-900/90 to-blue-900/80 hover:from-cyan-800 hover:to-blue-800 text-cyan-100 px-3 py-1.5 rounded-xl border border-cyan-400/60 transition cursor-pointer font-black shadow-md shadow-cyan-950/50"
                >
                  <UserCheck className="w-3.5 h-3.5 text-cyan-300" />
                  <span>تسجيل دخول الموظفين</span>
                  <span className="bg-cyan-950 text-cyan-200 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-cyan-600/60">
                    {loginLogs.length} دخول
                  </span>
                  {unreadEmployeeLogins.length > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                      🔔 +{unreadEmployeeLogins.length} جديد
                    </span>
                  )}
                </button>

                {/* Daily Sales Report Button ("تقرير المبيعات اليومي" - للمشرف فقط) */}
                <button
                  onClick={() => setIsDailySalesReportOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-900/80 to-teal-900/70 hover:from-emerald-800 hover:to-teal-800 text-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-500/60 transition cursor-pointer font-black shadow-md shadow-emerald-950/50"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
                  <span>تقرير المبيعات اليومي</span>
                  <span className="bg-emerald-950 text-emerald-300 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-emerald-600/60">
                    اليوم: {todaySoldPairs} زوج | الكل: {totalAllSoldPairs}
                  </span>
                </button>

                <button
                  onClick={() => setIsDeductionsTrackerOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/80 to-purple-900/60 hover:from-amber-900/80 hover:to-purple-800 text-amber-200 px-3 py-1.5 rounded-xl border border-amber-500/50 transition cursor-pointer font-bold shadow-sm"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>سجل الرقابة: منو سحب ومنو ضاف قطعة (حذيفة 👑)</span>
                  <span className="bg-amber-500/20 text-amber-200 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-500/40">
                    مسحوبات الموظفين: {totalAhmedPiecesPulled} قطعة
                  </span>
                  {unreadAhmedWithdrawals.length > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                      +{unreadAhmedWithdrawals.length} جديد
                    </span>
                  )}
                </button>

                {/* Low Stock Alerts Button ("تنبيهات المخزون المنخفض ≤ 5 وقائمة إعادة الطلب" - للمشرف فقط) */}
                <button
                  onClick={() => setIsLowStockAlertsOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-purple-900/60 hover:from-rose-900/90 hover:to-amber-900/80 text-amber-200 px-3 py-1.5 rounded-xl border border-amber-500/70 transition cursor-pointer font-black shadow-md shadow-amber-950/50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>تنبيهات المخزون المنخفض (≤ {lowStockThreshold})</span>
                  {lowStockSummary.modelsNeedingReorderCount > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-rose-400/60">
                      {lowStockSummary.modelsNeedingReorderCount} موديل يحتاج طلب
                    </span>
                  )}
                </button>
              </>
            )}

            {isHuthaifaSupervisor && securityAlerts.length > 0 && (
              <button
                onClick={() => setIsSecurityAlertsOpen(true)}
                className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 px-3 py-1.5 rounded-xl border border-rose-600/50 transition cursor-pointer font-bold animate-pulse"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>تنبيهات الدخول الخاطئ ({securityAlerts.length})</span>
              </button>
            )}
          </div>

          {/* Account Indicator */}
          <div className="text-[11px] text-purple-300/80 flex flex-wrap items-center gap-2">
            <span>الحساب النشط:</span>
            <strong
              className={`px-2 py-0.5 rounded-md border ${
                isHuthaifaSupervisor
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                  : 'bg-purple-950 text-white border-purple-700/60'
              }`}
            >
              {isHuthaifaSupervisor ? '👑 ' : '👤 '}
              {currentSession?.displayName || currentSession?.adminId}
            </strong>

            {currentSession && (
              <button
                onClick={handleLogout}
                title="تسجيل الخروج أو الدخول بحساب آخر"
                className="flex items-center gap-1 bg-purple-900/70 hover:bg-purple-700 text-purple-200 hover:text-white px-2.5 py-1 rounded-lg border border-purple-600/50 transition cursor-pointer font-bold text-[10px]"
              >
                <ArrowLeftRight className="w-3 h-3 text-fuchsia-400" />
                <span>تبديل الحساب / خروج</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 md:px-6 py-4 space-y-4">
        {/* LIVE EMPLOYEE LOGIN NOTIFICATION BANNER FOR SUPERVISOR HUTHAIFA ("واجعل يصل اشعار ل حذيفه داخل الموقع كل موضف اي وقت سوا تسجيل دخول") */}
        {isHuthaifaSupervisor && (unreadEmployeeLogins.length > 0 || liveLoginToast) && (
          <div className="rounded-2xl bg-gradient-to-r from-cyan-950/90 via-[#191438] to-blue-950/80 border-2 border-cyan-400/70 p-3.5 sm:p-4 shadow-xl shadow-cyan-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-cyan-300">
                    🔔 إشعار تسجيل دخول الموظفين (خاص بالمشرف حذيفة): قام موظف بتسجيل الدخول للموقع!
                  </span>
                  {unreadEmployeeLogins.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {unreadEmployeeLogins.length} إشعار دخول جديد
                    </span>
                  )}
                </div>

                {/* Show latest employee logins with Time, Day, and Month */}
                <div className="space-y-1 pt-0.5">
                  {(unreadEmployeeLogins.length > 0
                    ? unreadEmployeeLogins.slice(0, 3)
                    : liveLoginToast
                    ? [liveLoginToast]
                    : []
                  ).map((log) => {
                    const t12 = formatTime12HourWithSeconds(log.timestamp);
                    return (
                      <div
                        key={log.id}
                        className="text-xs text-purple-100 bg-black/35 px-2.5 py-1.5 rounded-lg border border-cyan-500/30 flex flex-wrap items-center gap-2"
                      >
                        <span className="font-black text-cyan-300">👤 الموظف: {log.adminId}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-purple-900/80 text-purple-200 border border-purple-700/50">
                          {log.roleTitle}
                        </span>
                        <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50 font-mono">
                          🕒 الوقت: الساعة {t12.hours12}:{t12.minutes}:{t12.seconds} {t12.periodAr}
                        </span>
                        <span className="text-[11px] font-bold text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                          📆 اليوم: {t12.dayNumber} ({t12.dayOfWeekAr})
                        </span>
                        <span className="text-[11px] font-bold text-cyan-200 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-600/40">
                          🗓️ الشهر: {t12.monthNumber} — {t12.monthNameAr} {t12.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setIsEmployeeLoginsOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition cursor-pointer shadow"
              >
                تسجيل دخول الموظفين
              </button>
              <button
                onClick={handleMarkLoginsRead}
                className="px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-bold transition cursor-pointer"
              >
                تم الاطلاع
              </button>
            </div>
          </div>
        )}

        {/* LIVE SUPERVISOR NOTIFICATION BANNER (Visible ONLY on Huthaifa's account when Ahmed pulls/deletes a piece) */}
        {isHuthaifaSupervisor && (unreadAhmedWithdrawals.length > 0 || liveSupervisorToast) && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-950/90 via-[#29133e] to-rose-950/80 border-2 border-amber-500/70 p-3.5 sm:p-4 shadow-xl shadow-amber-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 shrink-0 mt-0.5">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-amber-300">
                    🔔 إشعار خاص بالمشرف (حذيفة فقط): حركة جديدة من الموظفين (سحب أو إضافة قطعة)!
                  </span>
                  {unreadAhmedWithdrawals.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {unreadAhmedWithdrawals.length} عملية جديدة
                    </span>
                  )}
                </div>

                {/* Show the latest 2 operations by employees */}
                <div className="space-y-1 pt-0.5">
                  {(unreadAhmedWithdrawals.length > 0
                    ? unreadAhmedWithdrawals.slice(0, 2)
                    : liveSupervisorToast
                    ? [liveSupervisorToast]
                    : []
                  ).map((log) => {
                    const t12 = formatTime12HourWithSeconds(log.timestamp);
                    const isAdd = log.operationCategory === 'add';
                    return (
                      <div
                        key={log.id}
                        className="text-xs text-purple-100 bg-black/30 px-2.5 py-1 rounded-lg border border-amber-500/30 flex flex-wrap items-center gap-2"
                      >
                        <span className="font-black text-amber-300">👤 {log.adminName}</span>
                        <span>{isAdd ? 'ضاف في كود' : 'سحب من كود'}</span>
                        <span className="font-mono font-black text-white bg-purple-900 px-1.5 py-0.2 rounded">
                          {log.shoeCode}
                        </span>
                        <span>• اللون: {log.colorName}</span>
                        <span>• {log.actionLabel || `مقاس ${log.size}`}</span>
                        <span
                          className={`font-black ${
                            isAdd ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          ({isAdd ? `الكمية المضافة: +${log.quantityDecreased}` : `الكمية المسحوبة: -${log.quantityDecreased}`} قطعة)
                        </span>
                        <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50 font-mono">
                          🕒 الساعة {t12.hours12}:{t12.minutes}:{t12.seconds} {t12.periodAr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setIsDeductionsTrackerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition cursor-pointer shadow"
              >
                فتح سجل الموظفين الشامل
              </button>
              <button
                onClick={handleMarkWithdrawalsRead}
                className="px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-bold transition cursor-pointer"
              >
                تم الاطلاع
              </button>
            </div>
          </div>
        )}

        {/* VISUAL LOW STOCK ALERT BANNER FOR SUPERVISOR HUTHAIFA (Threshold <= 5) */}
        {isHuthaifaSupervisor &&
          lowStockSummary.modelsNeedingReorderCount > 0 &&
          !isLowStockBannerDismissed && (
            <div className="rounded-2xl bg-gradient-to-r from-[#2c1221] via-[#261338] to-[#2a1910] border-2 border-amber-500/70 p-3.5 sm:p-4 shadow-xl shadow-amber-950/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      ⚠️ تنبيه المخزون المنخفض للمشرف (حذيفة): توجد قياسات وألوان وصلت كميتها إلى {lowStockThreshold} أو أقل!
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {lowStockSummary.modelsNeedingReorderCount} موديلات تحتاج إعادة طلب ({lowStockSummary.lowSizesCount} قياس)
                    </span>
                    {lowStockSummary.outOfStockSizesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600/60 text-[10px] font-bold">
                        منها {lowStockSummary.outOfStockSizesCount} قياس نافذ (0)
                      </span>
                    )}
                  </div>

                  {/* Quick preview chips of low stock sizes */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {lowStockSummary.urgentExamples.map((ex) => (
                      <span
                        key={ex.id}
                        className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold flex items-center gap-1.5 ${
                          ex.quantity === 0
                            ? 'bg-rose-950/90 border-rose-600/60 text-rose-200'
                            : 'bg-amber-950/80 border-amber-600/50 text-amber-200'
                        }`}
                      >
                        <strong className="font-mono text-white">{ex.shoeCode}</strong>
                        <span>({ex.colorName})</span>
                        <span>قياس {ex.size}:</span>
                        <strong
                          className={
                            ex.quantity === 0 ? 'text-rose-400 font-black' : 'text-amber-300 font-black'
                          }
                        >
                          {ex.quantity === 0 ? 'نافذ (0)' : `متبقي ${ex.quantity}`}
                        </strong>
                      </span>
                    ))}
                    {lowStockSummary.lowSizesCount > 4 && (
                      <span className="text-[11px] text-purple-300 font-bold px-1">
                        +{lowStockSummary.lowSizesCount - 4} قياسات أخرى...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                <button
                  onClick={() => setIsLowStockAlertsOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs transition cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>عرض قائمة إعادة الطلب ({lowStockSummary.modelsNeedingReorderCount})</span>
                </button>
                <button
                  onClick={() => setIsLowStockBannerDismissed(true)}
                  className="p-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-700/60 text-xs font-bold transition cursor-pointer"
                  title="إخفاء الشريط مؤقتاً"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        {/* Quick Summary Cards (Total pairs visible ONLY to Supervisor Huthaifa) */}
        <StatsBar shoes={shoes} isSupervisor={isHuthaifaSupervisor} />

        {/* Search, Favorites Filter, Color Pills (أبيض، أسود، وردي، نيلي، جوزي، بيج) */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          onlyFavorites={onlyFavorites}
          onToggleFavorites={() => setOnlyFavorites(!onlyFavorites)}
        />

        {/* Products Grid */}
        {filteredShoes.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-[#160d29]/60 border border-purple-800/40 my-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/50 border border-purple-700/50 flex items-center justify-center mx-auto mb-3">
              <PackageOpen className="w-8 h-8 text-purple-300" />
            </div>
            <h3 className="text-lg font-black text-white mb-1">
              {shoes.length === 0
                ? 'المستودع جاهز — لا توجد أكواد مضافة حالياً'
                : 'لا توجد أحذية مطابقة للبحث الحالي'}
            </h3>
            <p className="text-xs sm:text-sm text-purple-300/70 max-w-md mx-auto mb-5">
              {shoes.length === 0
                ? 'اضغط على زر "إضافة كود حذاء" لرفع أول قطعة وصورها ومقاساتها وتظهر فوراً لدى الجميع.'
                : 'جرّب مسح نص البحث أو تغيير تصفية اللون، أو قم بإضافة كود حذاء جديد إلى مستودع Iavenda.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {(searchQuery || selectedColor || onlyFavorites) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedColor('');
                    setOnlyFavorites(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-xs font-bold text-purple-200 border border-purple-700 transition cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
              <button
                onClick={() => {
                  setShoeToEdit(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة كود حذاء جديد</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
            {filteredShoes.map((shoe) => (
              <ShoeCard
                key={shoe.id}
                shoe={shoe}
                isSupervisor={isHuthaifaSupervisor}
                searchQuery={searchQuery}
                onSelect={(s) => setSelectedShoe(s)}
                onToggleFavorite={handleCardToggleFavorite}
                onDeleteRequest={handleCardDeleteRequest}
                onEditRequest={(_e, s) => {
                  setShoeToEdit(s);
                  setIsAddModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-purple-900/40 bg-[#0a0514] py-4 px-4 text-center text-xs text-purple-400/70">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-bold text-purple-300">
            مستودع شركة <span className="text-fuchsia-400">Iavenda</span> للأحذية — نظام الجرد والمقاسات والألوان
          </div>
          <div>يتم حفظ جميع الأكواد والمقاسات والطلبات وسجلات النواقص تلقائياً</div>
        </div>
      </footer>

      {/* ================= MODALS & DRAWERS ================= */}

      {/* 1. Login Modal (اسم ورمز للمسؤولين - صلاحية 12 ساعة) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={(session, loginLog) => {
          setCurrentSession(session);
          setIsLoginModalOpen(false);
          // Automatically reset filters and sync fresh inventory on login/re-entry
          syncLatestServerState(true);
          const updatedLogs = getEmployeeLoginLogs();
          setLoginLogs(updatedLogs);
          if (!loginLog.isSupervisor) {
            setLiveLoginToast(loginLog);
          }
          realtimeSync.publishUpdate({
            loginLogs: updatedLogs,
            eventType: 'employee_login',
            latestLogin: loginLog,
          });
        }}
        onAlertGenerated={handleRefreshAlerts}
        onClose={currentSession ? () => setIsLoginModalOpen(false) : undefined}
      />

      {/* 2. Side Navigation Drawer (زر الـ ٣ شخطات) */}
      {currentSession && (
        <SideNavDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentSession={currentSession}
          orders={orders}
          securityAlerts={securityAlerts}
          lowStockModelsCount={lowStockSummary.modelsNeedingReorderCount}
          lowStockSizesCount={lowStockSummary.lowSizesCount}
          unreadLoginsCount={unreadEmployeeLogins.length}
          totalLoginsCount={loginLogs.length}
          onOpenOrdersGroup={() => {
            setActiveChatRoom('orders');
            setIsOrdersGroupOpen(true);
          }}
          onOpenLavendaNotes={() => {
            setActiveChatRoom('notes');
            setIsOrdersGroupOpen(true);
          }}
          onOpenDeductionsTracker={() => setIsDeductionsTrackerOpen(true)}
          onOpenDailySalesReport={() => setIsDailySalesReportOpen(true)}
          onOpenLowStockAlerts={() => setIsLowStockAlertsOpen(true)}
          onOpenEmployeeLogins={() => setIsEmployeeLoginsOpen(true)}
          onOpenSecurityAlerts={() => setIsSecurityAlertsOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* 3. Chat Rooms Modal: كروب تثبيت الطلبات + ملاحظات لافيندا */}
      {currentSession && (
        <OrdersGroupModal
          isOpen={isOrdersGroupOpen}
          onClose={() => setIsOrdersGroupOpen(false)}
          orders={orders}
          currentSession={currentSession}
          initialRoom={activeChatRoom}
          onAddOrder={handleAddOrder}
          onDeleteOrder={handleDeleteOrder}
          onRestoreOrder={handleRestoreOrder}
          onPermanentDeleteOrder={handlePermanentDeleteOrder}
          onUpdateOrder={handleUpdateOrder}
          onToggleConfirmOrder={handleToggleConfirmOrder}
        />
      )}

      {/* 4. Deductions & Additions Tracker Modal (المشرف حذيفة يرى كل شيء، وكل موظف يرى القطع التي سحبها هو فقط) */}
      {currentSession && (
        <DeductionsTrackerModal
          isOpen={isDeductionsTrackerOpen}
          onClose={() => setIsDeductionsTrackerOpen(false)}
          deductions={deductions}
          currentSession={currentSession}
          onOpenDailySalesReport={() => setIsDailySalesReportOpen(true)}
        />
      )}

      {/* 4b. Daily Sales Report Modal (تقرير المبيعات اليومي - خاص بالمشرف حذيفة فقط) */}
      {currentSession && isHuthaifaSupervisor && (
        <DailySalesReportModal
          isOpen={isDailySalesReportOpen}
          onClose={() => setIsDailySalesReportOpen(false)}
          deductions={deductions}
          currentSession={currentSession}
        />
      )}

      {/* 4c. Low Stock Alerts & Reorder List Modal (تنبيهات المخزون المنخفض ≤ 5 - خاص بالمشرف حذيفة فقط) */}
      {currentSession && isHuthaifaSupervisor && (
        <LowStockAlertsModal
          isOpen={isLowStockAlertsOpen}
          onClose={() => setIsLowStockAlertsOpen(false)}
          shoes={shoes}
          currentSession={currentSession}
          threshold={lowStockThreshold}
          onThresholdChange={setLowStockThreshold}
          onSelectShoe={(shoe) => setSelectedShoe(shoe)}
          onQuickRestockSize={(shoeId, colorId, size, addedQty) =>
            handleUpdateStock(shoeId, colorId, size, addedQty)
          }
        />
      )}

      {/* 5. Security Alerts Modal (محاولات الدخول الخاطئة للمشرفين) */}
      {currentSession && isHuthaifaSupervisor && (
        <SecurityAlertsModal
          isOpen={isSecurityAlertsOpen}
          onClose={() => setIsSecurityAlertsOpen(false)}
          alerts={securityAlerts}
          onClearAlerts={handleClearAlerts}
        />
      )}

      {/* 5b. Employee Logins Modal ("تسجيل دخول الموظفين" بالوقت واليوم والشهر - خاص بالمشرف حذيفة فقط) */}
      {currentSession && isHuthaifaSupervisor && (
        <EmployeeLoginsModal
          isOpen={isEmployeeLoginsOpen}
          onClose={() => setIsEmployeeLoginsOpen(false)}
          loginLogs={loginLogs}
          currentSession={currentSession}
          onMarkAllRead={handleMarkLoginsRead}
        />
      )}

      {/* 6. Confirm Deduct / Delete Pair Modal ("وضيف زر تاكيد لحذف الزوج") */}
      <ConfirmDeductPairModal
        target={deductPairTarget}
        adminName={currentSession?.adminId || 'المسؤول'}
        isSupervisor={isHuthaifaSupervisor}
        onConfirm={handleConfirmDeductPair}
        onCancel={() => setDeductPairTarget(null)}
      />

      {/* 7. Shoe Details Modal */}
      {selectedShoe && (
        <ShoeDetailModal
          shoe={selectedShoe}
          isSupervisor={isHuthaifaSupervisor}
          onClose={() => setSelectedShoe(null)}
          onToggleFavorite={handleToggleFavorite}
          onOpenAddColor={(shoe) => setShoeForNewColor(shoe)}
          onUpdateStock={handleUpdateStock}
          onSetExactStock={handleSetExactStock}
          onInlineUpdateShoe={handleSaveShoe}
          onRequestDeductPair={(target) => setDeductPairTarget(target)}
          onAddCustomSize={handleAddCustomSize}
          onRequestDelete={handleOpenDeleteModal}
          onEditShoe={(shoe) => {
            setShoeToEdit(shoe);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* 8. Add / Edit Shoe Modal */}
      <AddShoeModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setShoeToEdit(null);
        }}
        onSave={handleSaveShoe}
        initialShoe={shoeToEdit}
      />

      {/* 9. Add Color Variant Modal */}
      <AddColorModal
        shoe={shoeForNewColor}
        isOpen={!!shoeForNewColor}
        onClose={() => setShoeForNewColor(null)}
        onAddColor={handleAddColorToShoe}
      />

      {/* 10. Item / Color / Size Delete Confirmation Modal ("اجعل تاكيد عند حذف قطعه") */}
      <DeleteConfirmModal
        target={deleteTarget}
        adminName={currentSession?.displayName || currentSession?.adminId || 'الموظف'}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
