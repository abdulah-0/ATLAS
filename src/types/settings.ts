export type LLMTaskKey =
  | 'tradeDecision' // Opus — final trade approve/reject
  | 'genomeGeneration' // Opus — new bot DNA creation
  | 'weeklyReview' // Opus — deep strategy review
  | 'postTradeReflection' // Sonnet — what worked/failed analysis
  | 'genomeMutation' // Sonnet — parameter change logic
  | 'newsSentiment' // Haiku — classify news items
  | 'signalScoring' // Haiku — confidence score per signal
  | 'logSummaries' // Llama free — routine summaries
  | 'calendarParsing' // Llama free — economic event extraction
  | 'tradeDnaGeneration'; // Llama free — embedding text builder

export interface ModelAssignment {
  taskKey: LLMTaskKey;
  label: string;
  description: string;
  modelId: string;
  tier: 'premium' | 'mid' | 'cheap' | 'free';
  estCostUsd: number;
  isEditable: boolean;
  warning?: string;
}

export interface BTCConversionSettings {
  conversionRatio: number; // 0–100, default 80 (% of profit -> BTC)
  reinvestRatio: number; // auto-computed: 100 - conversionRatio
  minConvertUsd: number; // default 5 — minimum conversion amount
  convertOnDip: boolean; // default true — wait for BTC dip >0.8%
  dipThresholdPct: number; // default 0.8 — dip % to trigger conversion
  pauseInCrash: boolean; // default true — hold USDC during CRASH regime
}

export interface TradingGoalSettings {
  targetBtc: number; // default 20
  startingCapitalUsd: number; // user's initial deposit
  riskPerTradePct: number; // default 1 — % of portfolio per trade
  maxPositionPct: number; // default 20 — max % per trade
  dailyLossLimitPct: number; // default 5
  totalDrawdownPct: number; // default 20 — full halt threshold
}

export interface ATLASSettings {
  models: Record<LLMTaskKey, ModelAssignment>;
  conversion: BTCConversionSettings;
  goal: TradingGoalSettings;
  updatedAt: string;
  version: number;
}

export const DEFAULT_MODEL_ASSIGNMENTS: Record<LLMTaskKey, ModelAssignment> = {
  tradeDecision: {
    taskKey: 'tradeDecision',
    label: 'Trade Decision',
    description: 'Final approve/reject decision on every trade signal',
    modelId: 'anthropic/claude-opus-4-6',
    tier: 'premium',
    estCostUsd: 0.075,
    isEditable: true,
    warning: 'Using a cheaper model here directly affects trade quality. Not recommended.',
  },
  genomeGeneration: {
    taskKey: 'genomeGeneration',
    label: 'Bot Genome Generation',
    description: 'Creates new bot strategy DNA when a bot dies',
    modelId: 'anthropic/claude-opus-4-6',
    tier: 'premium',
    estCostUsd: 0.15,
    isEditable: true,
    warning: 'Weaker models may generate invalid or overly simplistic genomes.',
  },
  weeklyReview: {
    taskKey: 'weeklyReview',
    label: 'Weekly Strategy Review',
    description: 'Deep weekly analysis of all bot performance',
    modelId: 'anthropic/claude-opus-4-6',
    tier: 'premium',
    estCostUsd: 0.20,
    isEditable: true,
  },
  postTradeReflection: {
    taskKey: 'postTradeReflection',
    label: 'Post-Trade Reflection',
    description: 'Analyses what worked and failed after every trade',
    modelId: 'anthropic/claude-sonnet-4-6',
    tier: 'mid',
    estCostUsd: 0.015,
    isEditable: true,
  },
  genomeMutation: {
    taskKey: 'genomeMutation',
    label: 'Genome Mutation',
    description: 'Applies learned parameter changes to bot DNA',
    modelId: 'anthropic/claude-sonnet-4-6',
    tier: 'mid',
    estCostUsd: 0.015,
    isEditable: true,
  },
  newsSentiment: {
    taskKey: 'newsSentiment',
    label: 'News Classification',
    description: 'Classifies incoming news by asset and sentiment',
    modelId: 'anthropic/claude-haiku-4-5-20251001',
    tier: 'cheap',
    estCostUsd: 0.002,
    isEditable: true,
  },
  signalScoring: {
    taskKey: 'signalScoring',
    label: 'Signal Confidence Scoring',
    description: 'Scores each trade signal 0–1 before Opus review',
    modelId: 'anthropic/claude-haiku-4-5-20251001',
    tier: 'cheap',
    estCostUsd: 0.002,
    isEditable: true,
  },
  logSummaries: {
    taskKey: 'logSummaries',
    label: 'Log Summaries',
    description: 'Generates end-of-day performance summaries',
    modelId: 'meta-llama/llama-3.1-8b-instruct:free',
    tier: 'free',
    estCostUsd: 0,
    isEditable: true,
  },
  calendarParsing: {
    taskKey: 'calendarParsing',
    label: 'Calendar Parsing',
    description: 'Extracts economic events from calendar data',
    modelId: 'meta-llama/llama-3.1-8b-instruct:free',
    tier: 'free',
    estCostUsd: 0,
    isEditable: true,
  },
  tradeDnaGeneration: {
    taskKey: 'tradeDnaGeneration',
    label: 'Trade DNA Text',
    description: 'Builds embedding text for vector DB storage',
    modelId: 'meta-llama/llama-3.1-8b-instruct:free',
    tier: 'free',
    estCostUsd: 0,
    isEditable: true,
  },
};

export const DEFAULT_CONVERSION_SETTINGS: BTCConversionSettings = {
  conversionRatio: 80,
  reinvestRatio: 20,
  minConvertUsd: 5,
  convertOnDip: true,
  dipThresholdPct: 0.8,
  pauseInCrash: true,
};

export const DEFAULT_GOAL_SETTINGS: TradingGoalSettings = {
  targetBtc: 20,
  startingCapitalUsd: 0,
  riskPerTradePct: 1,
  maxPositionPct: 20,
  dailyLossLimitPct: 5,
  totalDrawdownPct: 20,
};
