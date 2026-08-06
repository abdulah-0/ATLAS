import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ATLASSettings,
  LLMTaskKey,
  BTCConversionSettings,
  TradingGoalSettings,
  DEFAULT_MODEL_ASSIGNMENTS,
  DEFAULT_CONVERSION_SETTINGS,
  DEFAULT_GOAL_SETTINGS,
} from '../types/settings';

export interface AvailableModel {
  id: string;
  label: string;
  tier: 'premium' | 'mid' | 'cheap' | 'free';
  cost: number;
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  { id: 'anthropic/claude-opus-4-6', label: 'Claude Opus', tier: 'premium', cost: 0.075 },
  { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet', tier: 'mid', cost: 0.015 },
  { id: 'anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku', tier: 'cheap', cost: 0.002 },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash', tier: 'cheap', cost: 0.002 },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro', tier: 'mid', cost: 0.010 },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', tier: 'mid', cost: 0.008 },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', tier: 'free', cost: 0 },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B', tier: 'free', cost: 0 },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', tier: 'free', cost: 0 },
];

interface SettingsStore {
  settings: ATLASSettings;

  // Global & Bot Trading Controls
  toggleEngine: () => void;
  toggleBotPause: (botId: string) => void;
  isBotPaused: (botId: string) => boolean;

  // Model selection actions
  updateModelForTask: (taskKey: LLMTaskKey, modelId: string, tier?: 'premium' | 'mid' | 'cheap' | 'free', estCostUsd?: number) => void;
  resetModelToDefault: (taskKey: LLMTaskKey) => void;
  resetAllModels: () => void;

  // Conversion actions
  updateConversionRatio: (ratio: number) => void;
  updateConversionSettings: (partial: Partial<BTCConversionSettings>) => void;

  // Goal actions
  updateTargetBtc: (btc: number) => void;
  updateGoalSettings: (partial: Partial<TradingGoalSettings>) => void;

  // Reset factory defaults
  resetAllSettings: () => void;

  // Computed
  estimatedMonthlyCost: () => number;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: {
        models: DEFAULT_MODEL_ASSIGNMENTS,
        conversion: DEFAULT_CONVERSION_SETTINGS,
        goal: DEFAULT_GOAL_SETTINGS,
        isEngineRunning: true,
        pausedBotIds: [],
        updatedAt: new Date().toISOString(),
        version: 1,
      },

      toggleEngine: () => {
        set(state => ({
          settings: {
            ...state.settings,
            isEngineRunning: !(state.settings.isEngineRunning ?? true),
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      toggleBotPause: (botId) => {
        set(state => {
          const currentPaused = state.settings.pausedBotIds || [];
          const isPaused = currentPaused.includes(botId);
          const nextPaused = isPaused
            ? currentPaused.filter(id => id !== botId)
            : [...currentPaused, botId];

          return {
            settings: {
              ...state.settings,
              pausedBotIds: nextPaused,
              updatedAt: new Date().toISOString(),
              version: state.settings.version + 1,
            },
          };
        });
      },

      isBotPaused: (botId) => {
        const { settings } = get();
        return (settings.pausedBotIds || []).includes(botId);
      },

      updateModelForTask: (taskKey, modelId, tier, estCostUsd) => {
        const seedModel = AVAILABLE_MODELS.find(m => m.id === modelId);
        const resolvedTier = tier || seedModel?.tier || (modelId.includes('free') ? 'free' : modelId.includes('opus') || modelId.includes('gpt-4') ? 'premium' : 'mid');
        const resolvedCost = estCostUsd ?? seedModel?.cost ?? (resolvedTier === 'premium' ? 0.05 : resolvedTier === 'mid' ? 0.01 : resolvedTier === 'cheap' ? 0.002 : 0);

        set(state => ({
          settings: {
            ...state.settings,
            models: {
              ...state.settings.models,
              [taskKey]: {
                ...state.settings.models[taskKey],
                modelId,
                tier: resolvedTier,
                estCostUsd: resolvedCost,
              },
            },
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      resetModelToDefault: (taskKey) => {
        set(state => ({
          settings: {
            ...state.settings,
            models: {
              ...state.settings.models,
              [taskKey]: DEFAULT_MODEL_ASSIGNMENTS[taskKey],
            },
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      resetAllModels: () => {
        set(state => ({
          settings: {
            ...state.settings,
            models: DEFAULT_MODEL_ASSIGNMENTS,
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      updateConversionRatio: (ratio) => {
        const clamped = Math.min(95, Math.max(10, Math.round(ratio)));
        set(state => ({
          settings: {
            ...state.settings,
            conversion: {
              ...state.settings.conversion,
              conversionRatio: clamped,
              reinvestRatio: 100 - clamped,
            },
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      updateConversionSettings: (partial) => {
        set(state => ({
          settings: {
            ...state.settings,
            conversion: { ...state.settings.conversion, ...partial },
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      updateTargetBtc: (btc) => {
        const clamped = Math.max(0.01, btc);
        set(state => ({
          settings: {
            ...state.settings,
            goal: { ...state.settings.goal, targetBtc: clamped },
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      updateGoalSettings: (partial) => {
        set(state => ({
          settings: {
            ...state.settings,
            goal: { ...state.settings.goal, ...partial },
            updatedAt: new Date().toISOString(),
            version: state.settings.version + 1,
          },
        }));
      },

      resetAllSettings: () => {
        set({
          settings: {
            models: DEFAULT_MODEL_ASSIGNMENTS,
            conversion: DEFAULT_CONVERSION_SETTINGS,
            goal: DEFAULT_GOAL_SETTINGS,
            isEngineRunning: true,
            pausedBotIds: [],
            updatedAt: new Date().toISOString(),
            version: 1,
          },
        });
      },

      estimatedMonthlyCost: () => {
        const { models } = get().settings;
        const volumes: Record<LLMTaskKey, number> = {
          tradeDecision: 4,
          genomeGeneration: 0.1,
          weeklyReview: 0.18,
          postTradeReflection: 4,
          genomeMutation: 0.5,
          newsSentiment: 12,
          signalScoring: 15,
          logSummaries: 25,
          calendarParsing: 3,
          tradeDnaGeneration: 4,
        };
        return Object.entries(models).reduce((total, [key, assignment]) => {
          const vol = volumes[key as LLMTaskKey] ?? 0;
          return total + assignment.estCostUsd * vol * 22;
        }, 0);
      },
    }),
    {
      name: 'atlas-settings-v1.1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
