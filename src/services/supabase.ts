import { createClient } from '@supabase/supabase-js';
import { secureStore } from './secureStore';

// Hardware-backed SecureStore adapter for Supabase Auth token persistence in Expo
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return secureStore.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return secureStore.setItem(key, value);
  },
  removeItem: (key: string) => {
    return secureStore.deleteItem(key);
  },
};

// Fallback default keys (replace with your actual Supabase project credentials in Settings or .env)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const supabaseOperations = {
  /**
   * Syncs closed trades from local SQLite to Supabase remote database
   */
  async syncTradeToCloud(trade: any): Promise<boolean> {
    try {
      const { error } = await supabase.from('trades').upsert(trade);
      if (error) {
        console.warn('Supabase trade sync warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase sync skipped (credentials not configured):', err instanceof Error ? err.message : String(err));
      return false;
    }
  },

  /**
   * Syncs bot genome snapshot to Supabase cloud storage
   */
  async syncBotGenomeToCloud(botGenome: any): Promise<boolean> {
    try {
      const { error } = await supabase.from('bot_genomes').upsert(botGenome);
      if (error) {
        console.warn('Supabase genome sync warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase sync skipped:', err instanceof Error ? err.message : String(err));
      return false;
    }
  }
};
