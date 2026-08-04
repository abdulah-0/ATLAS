import { secureStore, SECURE_KEYS } from './secureStore';
import { rateLimiter } from './rateLimiter';

export interface PineconeMetadata {
  trade_id: string;
  bot_id: string;
  bot_generation: number;
  asset: string;
  asset_class: 'crypto' | 'stock';
  direction: 'long' | 'short';
  signal_type: string;
  regime: string;
  outcome: 'win' | 'loss' | 'breakeven';
  pnl_pct: number;
  bot_status: 'active' | 'terminated';
  timestamp: string;
  embedding_text: string;
  what_worked?: string | null;
  what_failed?: string | null;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata?: PineconeMetadata;
}

export const getPineconeConfig = async () => {
  const apiKey = await secureStore.getItem(SECURE_KEYS.PINECONE_API_KEY);
  const host = await secureStore.getItem(SECURE_KEYS.PINECONE_INDEX_HOST);

  if (!apiKey || !host) {
    throw new Error('Pinecone API Key or Index Host is not configured. Please set them in Settings.');
  }

  let formattedHost = host.trim();
  if (!formattedHost.startsWith('http://') && !formattedHost.startsWith('https://')) {
    formattedHost = `https://${formattedHost}`;
  }
  if (formattedHost.endsWith('/')) {
    formattedHost = formattedHost.slice(0, -1);
  }

  return {
    apiKey,
    host: formattedHost,
  };
};

export const pinecone = {
  namespace: 'atlas-trade-memory',

  async upsertVector(id: string, values: number[], metadata: PineconeMetadata): Promise<void> {
    return rateLimiter.execute('pinecone', async () => {
      const { apiKey, host } = await getPineconeConfig();

      const body = {
        vectors: [
          {
            id,
            values,
            metadata,
          },
        ],
        namespace: this.namespace,
      };

      const response = await fetch(`${host}/vectors/upsert`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const err: any = new Error(`Pinecone Upsert Failed: ${response.status} - ${errorText}`);
        err.status = response.status;
        throw err;
      }
    });
  },

  async querySimilarity(
    queryVector: number[],
    filters: {
      asset?: string;
      direction?: 'long' | 'short';
      outcome?: 'win' | 'loss';
      regime?: string;
    } = {},
    topK: number = 10
  ): Promise<PineconeMatch[]> {
    return rateLimiter.execute('pinecone', async () => {
      const { apiKey, host } = await getPineconeConfig();

      const filterObject: Record<string, any> = {};
      if (filters.asset) filterObject.asset = { '$eq': filters.asset };
      if (filters.direction) filterObject.direction = { '$eq': filters.direction };
      if (filters.outcome) filterObject.outcome = { '$eq': filters.outcome };
      if (filters.regime) filterObject.regime = { '$eq': filters.regime };

      const body = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        includeValues: false,
        namespace: this.namespace,
        ...(Object.keys(filterObject).length > 0 ? { filter: filterObject } : {}),
      };

      const response = await fetch(`${host}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const err: any = new Error(`Pinecone Query Failed: ${response.status} - ${errorText}`);
        err.status = response.status;
        throw err;
      }

      const result = await response.json();
      return result.matches || [];
    });
  }
};
