import * as SecureStore from 'expo-secure-store';

export const SECURE_KEYS = {
  ALPACA_API_KEY: 'atlas_alpaca_api_key',
  ALPACA_SECRET_KEY: 'atlas_alpaca_secret_key',
  OPENROUTER_API_KEY: 'atlas_openrouter_api_key',
  PINECONE_API_KEY: 'atlas_pinecone_api_key',
  PINECONE_INDEX_HOST: 'atlas_pinecone_index_host',
  KRONOS_API_KEY: 'atlas_kronos_api_key',
  KRONOS_SERVICE_URL: 'atlas_kronos_service_url',
};

export const secureStore = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error saving secure item for key ${key}:`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving secure item for key ${key}:`, error);
      return null;
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting secure item for key ${key}:`, error);
      throw error;
    }
  },

  async clearAll(): Promise<void> {
    try {
      for (const key of Object.values(SECURE_KEYS)) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('Error clearing secure store:', error);
      throw error;
    }
  }
};
