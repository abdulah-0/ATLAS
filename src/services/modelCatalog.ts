import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATALOG_SEED } from './modelCatalogSeed';

const CATALOG_CACHE_KEY = 'atlas:model_catalog_v2';
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000; // 24h cache

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  supports_tools: boolean;
  supports_structured_outputs: boolean;
  tier: 'PREMIUM' | 'MID' | 'CHEAP' | 'FREE';
}

const RELEVANT_PROVIDERS = new Set([
  'openai',
  'anthropic',
  'moonshotai',
  'google',
  'x-ai',
  'deepseek',
  'meta-llama',
  'mistralai',
  'z-ai',
  'qwen',
  'minimax',
]);

function computeTier(pricing: { prompt: string; completion: string }): CatalogModel['tier'] {
  const promptPerM = (parseFloat(pricing.prompt) || 0) * 1_000_000;
  if (promptPerM === 0) return 'FREE';
  if (promptPerM < 0.5) return 'CHEAP';
  if (promptPerM < 3.0) return 'MID';
  return 'PREMIUM';
}

export async function fetchModelCatalog(forceRefresh = false): Promise<CatalogModel[]> {
  try {
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
      if (cachedData) {
        const { timestamp, models } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CATALOG_TTL_MS && Array.isArray(models) && models.length > 0) {
          return models;
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s fetch timeout

    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const { data } = await res.json();

    const models: CatalogModel[] = data
      .filter((m: any) => {
        const provider = (m.id || '').split('/')[0];
        return RELEVANT_PROVIDERS.has(provider);
      })
      .map((m: any) => {
        const provider = m.id.split('/')[0];
        const params = m.supported_parameters || [];
        return {
          id: m.id,
          name: m.name || m.id,
          provider,
          context_length: m.context_length || 128000,
          pricing: {
            prompt: m.pricing?.prompt || '0',
            completion: m.pricing?.completion || '0',
          },
          supports_tools: params.includes('tools'),
          supports_structured_outputs: params.includes('structured_outputs') || params.includes('response_format'),
          tier: computeTier(m.pricing || { prompt: '0', completion: '0' }),
        };
      });

    if (models.length > 0) {
      await AsyncStorage.setItem(
        CATALOG_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), models })
      );
      return models;
    }
  } catch (e) {
    console.warn('[ModelCatalog] Fetch failed or offline, using seed catalog:', e);
  }

  return CATALOG_SEED;
}
