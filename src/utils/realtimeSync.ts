import {
  ShoeItem,
  OrderPost,
  StockDeductionLog,
  SecurityAlert,
  EmployeeLoginLog,
} from '../types/inventory';

export interface WarehouseSyncState {
  shoes: ShoeItem[];
  deletedShoeIds?: string[];
  deductions: StockDeductionLog[];
  orders: OrderPost[];
  securityAlerts: SecurityAlert[];
  loginLogs?: EmployeeLoginLog[];
  updatedAt?: number;
}

export interface SyncUpdatePayload {
  shoes?: ShoeItem[];
  deletedShoeIds?: string[];
  deductions?: StockDeductionLog[];
  orders?: OrderPost[];
  securityAlerts?: SecurityAlert[];
  loginLogs?: EmployeeLoginLog[];
  eventType?: 'delete_piece' | 'deduct_pair' | 'employee_login' | 'sync';
  latestDeduction?: StockDeductionLog | null;
  latestLogin?: EmployeeLoginLog | null;
  senderId?: string;
}

type StateListener = (
  state: WarehouseSyncState,
  meta?: {
    eventType?: string;
    latestDeduction?: StockDeductionLog | null;
    latestLogin?: EmployeeLoginLog | null;
    senderId?: string | null;
  }
) => void;

const CLIENT_INSTANCE_ID = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const CHANNEL_NAME = 'iavenda_warehouse_realtime_channel';

class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private listeners = new Set<StateListener>();
  private channel: BroadcastChannel | null = null;
  private reconnectTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          const data = event.data;
          if (data && data.senderId !== CLIENT_INSTANCE_ID && data.state) {
            this.notifyListeners(data.state, {
              eventType: data.eventType,
              latestDeduction: data.latestDeduction,
              latestLogin: data.latestLogin,
              senderId: data.senderId,
            });
          }
        };
      } catch {
        // Ignore if BroadcastChannel is not supported
      }
    }
  }

  public getClientId(): string {
    return CLIENT_INSTANCE_ID;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(
    state: WarehouseSyncState,
    meta?: {
      eventType?: string;
      latestDeduction?: StockDeductionLog | null;
      latestLogin?: EmployeeLoginLog | null;
      senderId?: string | null;
    }
  ) {
    for (const listener of this.listeners) {
      listener(state, meta);
    }
  }

  public async fetchInitialState(): Promise<WarehouseSyncState | null> {
    try {
      const res = await fetch(`/api/state?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return null;
      const data: WarehouseSyncState = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if ((msg.type === 'state:init' || msg.type === 'state:updated') && msg.state) {
            if (msg.senderId && msg.senderId === CLIENT_INSTANCE_ID) {
              return;
            }
            this.notifyListeners(msg.state, {
              eventType: msg.eventType,
              latestDeduction: msg.latestDeduction,
              latestLogin: msg.latestLogin,
              senderId: msg.senderId,
            });
          }
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        this.ws = null;
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      // fallback to HTTP polling / REST if WS fails
    }
  }

  public async publishUpdate(payload: SyncUpdatePayload): Promise<void> {
    const enrichedPayload: SyncUpdatePayload = {
      ...payload,
      senderId: CLIENT_INSTANCE_ID,
    };

    // 1. Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'state:update',
            payload: enrichedPayload,
          })
        );
      } catch {
        // fallback to POST /api/sync below
      }
    }

    // 2. Also persist via POST /api/sync to guarantee server durability and broadcast
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.state && this.channel) {
          this.channel.postMessage({
            state: data.state,
            eventType: enrichedPayload.eventType,
            latestDeduction: enrichedPayload.latestDeduction,
            latestLogin: enrichedPayload.latestLogin,
            senderId: CLIENT_INSTANCE_ID,
          });
        }
      }
    } catch {
      // Offline fallback: still broadcast on BroadcastChannel if available
    }
  }
}

export const realtimeSync = new RealtimeSyncManager();
