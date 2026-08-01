import { create } from 'zustand';
import { LogEvent } from '../types/logs';
import { dbOperations } from '../services/db';
import { subscribeToLogs } from '../services/logger';

interface LogsStore {
  logs: LogEvent[];
  unreadCount: number;
  loading: boolean;
  loadLogs: () => Promise<void>;
  addLog: (event: LogEvent) => void;
  markAllRead: () => Promise<void>;
}

export const useLogsStore = create<LogsStore>((set, get) => {
  // Subscribe to real-time logger emissions
  subscribeToLogs(event => {
    get().addLog(event);
  });

  return {
    logs: [],
    unreadCount: 0,
    loading: false,

    loadLogs: async () => {
      set({ loading: true });
      try {
        const events = await dbOperations.getLogEvents(100);
        const unread = events.filter(e => !e.is_read).length;
        set({ logs: events, unreadCount: unread, loading: false });
      } catch (e) {
        console.warn('Failed to load logs from DB:', e);
        set({ loading: false });
      }
    },

    addLog: (event: LogEvent) => {
      set(state => ({
        logs: [event, ...state.logs],
        unreadCount: state.unreadCount + 1,
      }));
    },

    markAllRead: async () => {
      try {
        await dbOperations.markAllLogsRead();
        set(state => ({
          unreadCount: 0,
          logs: state.logs.map(l => ({ ...l, is_read: true })),
        }));
      } catch (e) {
        console.warn('Failed to mark logs as read:', e);
      }
    },
  };
});
