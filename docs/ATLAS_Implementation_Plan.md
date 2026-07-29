# ATLAS — Implementation Plan
## Feature: Model Selection + Configurable Settings + Responsive Design
**Version:** 1.1 | **Status:** Ready for Development

---

## Overview

This plan covers three interconnected features:

1. **Model Selection UI** — per-task LLM assignment with live cost preview
2. **Configurable Settings** — editable BTC conversion ratio, total BTC goal, risk limits
3. **Responsive Layout System** — screen-size-aware layouts that never overflow on any device

Each feature is broken into atomic tasks with exact file paths, component names, acceptance criteria, and implementation notes. Follow the phases in order — the responsive system must be built first since everything else renders on top of it.

---

## Table of Contents

- [Phase 1: Responsive Foundation](#phase-1-responsive-foundation)
- [Phase 2: Settings Data Layer](#phase-2-settings-data-layer)
- [Phase 3: Model Selection Feature](#phase-3-model-selection-feature)
- [Phase 4: Configurable Settings UI](#phase-4-configurable-settings-ui)
- [Phase 5: Wiring & Integration](#phase-5-wiring--integration)
- [Component Reference](#component-reference)
- [Responsive Rules Reference](#responsive-rules-reference)
- [Testing Checklist](#testing-checklist)

---

## Phase 1: Responsive Foundation

> Build this first. Every other component in the app must be built on top of this system. Going back and retrofitting responsiveness is 3x the work.

### 1.1 — Create the Breakpoint & Dimension Hook

**File:** `src/hooks/useResponsive.ts`

This is the single source of truth for all screen-size decisions in the app. No component should ever call `Dimensions.get('window')` directly — they all go through this hook.

```typescript
// src/hooks/useResponsive.ts
import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveValues {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isXs: boolean;   // < 360px  — very small phones (Galaxy A series)
  isSm: boolean;   // 360–479px — standard phones (iPhone SE, Pixel 6a)
  isMd: boolean;   // 480–767px — large phones (iPhone Pro Max, Galaxy S Ultra)
  isLg: boolean;   // 768–1023px — small tablets (iPad Mini, foldables open)
  isXl: boolean;   // 1024px+  — full tablets (iPad Pro, large Android tablets)
  isTablet: boolean;        // isLg || isXl
  isPhone: boolean;         // isXs || isSm || isMd
  isLandscape: boolean;
  // Spacing scale — all spacing derived from these
  spacing: {
    xs: number;   // 4
    sm: number;   // 8
    md: number;   // 16
    lg: number;   // 24
    xl: number;   // 32
    xxl: number;  // 48
  };
  // Typography scale
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    display: number;
  };
  // Layout helpers
  numColumns: number;       // 1 on phone, 2 on tablet
  cardWidth: number;        // calculated safe card width
  horizontalPadding: number;
}

function getBreakpoint(width: number): Breakpoint {
  if (width < 360)  return 'xs';
  if (width < 480)  return 'sm';
  if (width < 768)  return 'md';
  if (width < 1024) return 'lg';
  return 'xl';
}

function computeValues(screen: ScaledSize): ResponsiveValues {
  const { width, height } = screen;
  const bp = getBreakpoint(width);
  const isLandscape = width > height;

  // Base spacing unit — scales with screen width
  const base = width < 360 ? 14 : width < 480 ? 16 : 18;

  const spacing = {
    xs:  Math.round(base * 0.25),   // ~4
    sm:  Math.round(base * 0.5),    // ~8
    md:  Math.round(base),          // ~16
    lg:  Math.round(base * 1.5),    // ~24
    xl:  Math.round(base * 2),      // ~32
    xxl: Math.round(base * 3),      // ~48
  };

  const fontSize = {
    xs:      width < 360 ? 10 : 11,
    sm:      width < 360 ? 12 : 13,
    md:      width < 360 ? 14 : 15,
    lg:      width < 360 ? 16 : 17,
    xl:      width < 360 ? 20 : 22,
    xxl:     width < 360 ? 26 : 28,
    display: width < 360 ? 32 : width < 768 ? 38 : 48,
  };

  const hPad = bp === 'xs' ? 12 : bp === 'sm' ? 16 : bp === 'md' ? 20 : 24;
  const numCols = bp === 'lg' || bp === 'xl' ? 2 : 1;
  const cardWidth = numCols === 2
    ? (width - hPad * 2 - spacing.md) / 2
    : width - hPad * 2;

  return {
    width, height, breakpoint: bp,
    isXs: bp === 'xs',
    isSm: bp === 'sm',
    isMd: bp === 'md',
    isLg: bp === 'lg',
    isXl: bp === 'xl',
    isTablet: bp === 'lg' || bp === 'xl',
    isPhone: bp === 'xs' || bp === 'sm' || bp === 'md',
    isLandscape,
    spacing,
    fontSize,
    numColumns: numCols,
    cardWidth,
    horizontalPadding: hPad,
  };
}

export function useResponsive(): ResponsiveValues {
  const [values, setValues] = useState(() =>
    computeValues(Dimensions.get('window'))
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setValues(computeValues(window));
    });
    return () => sub?.remove();
  }, []);

  return values;
}
```

**Acceptance criteria:**
- Hook re-renders consumers when device rotates or window resizes
- All 5 breakpoints correctly classified
- `cardWidth` never produces a negative number on any device
- No component in the codebase imports `Dimensions` directly after this is built

---

### 1.2 — Create the Layout Primitive Components

**File:** `src/components/layout/Screen.tsx`
**File:** `src/components/layout/Row.tsx`
**File:** `src/components/layout/Stack.tsx`
**File:** `src/components/layout/Card.tsx`

These four components are the only layout primitives the rest of the app uses. They absorb all padding, overflow, and safe-area concerns so individual screens never have to think about it.

```typescript
// src/components/layout/Screen.tsx
// Wraps every screen. Handles safe area, scroll, background, padding.
import { SafeAreaView, ScrollView, View, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;       // default true — most screens scroll
  padded?: boolean;       // default true — apply horizontal padding
  testID?: string;
}

export const Screen = ({ children, scroll = true, padded = true, testID }: ScreenProps) => {
  const r = useResponsive();
  const px = padded ? r.horizontalPadding : 0;

  const content = (
    <View style={{ paddingHorizontal: px, flex: scroll ? undefined : 1 }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: r.spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0D1117' },
  scroll: { flex: 1 },
});
```

```typescript
// src/components/layout/Row.tsx
// Horizontal flex row with gap support and wrap control
interface RowProps {
  children: React.ReactNode;
  gap?: number;
  wrap?: boolean;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  style?: object;
}

export const Row = ({
  children, gap = 0, wrap = false,
  align = 'center', justify = 'flex-start', style
}: RowProps) => (
  <View style={[{
    flexDirection: 'row',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    alignItems: align,
    justifyContent: justify,
    gap,
  }, style]}>
    {children}
  </View>
);
```

```typescript
// src/components/layout/Stack.tsx
// Vertical flex stack with uniform gap
interface StackProps {
  children: React.ReactNode;
  gap?: number;
  style?: object;
}

export const Stack = ({ children, gap = 0, style }: StackProps) => (
  <View style={[{ flexDirection: 'column', gap }, style]}>
    {children}
  </View>
);
```

```typescript
// src/components/layout/Card.tsx
// Standard card container — absorbs all border, padding, shadow concerns
import { useResponsive } from '../../hooks/useResponsive';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'gold';
  fullWidth?: boolean;
  style?: object;
}

const BORDER_COLORS = {
  default: '#30363D',
  danger:  '#F85149',
  success: '#3FB950',
  gold:    '#D29922',
};

export const Card = ({ children, variant = 'default', fullWidth, style }: CardProps) => {
  const r = useResponsive();
  return (
    <View style={[{
      backgroundColor: '#161B22',
      borderWidth: 1,
      borderColor: BORDER_COLORS[variant],
      borderRadius: 12,
      padding: r.spacing.md,
      width: fullWidth ? '100%' : undefined,
      // Critical: prevent content from overflowing the card
      overflow: 'hidden',
    }, style]}>
      {children}
    </View>
  );
};
```

**Acceptance criteria:**
- `Screen` never shows horizontal scroll on any device
- `Card` clips content that exceeds its bounds (no overflow bleed)
- All primitives accept `style` prop for one-off overrides
- `Row` with `wrap={true}` correctly wraps on small screens

---

### 1.3 — Typography System

**File:** `src/components/typography/Text.tsx`

One component for all text. No raw `<Text>` in screens except inside this component.

```typescript
// src/components/typography/Text.tsx
import { Text as RNText, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

type TextVariant =
  | 'display'    // hero numbers — BTC stack, portfolio value
  | 'h1'         // screen titles
  | 'h2'         // section headers
  | 'h3'         // card titles
  | 'body'       // default body text
  | 'bodySmall'  // secondary info
  | 'label'      // tags, badges, table headers
  | 'mono'       // prices, numbers, code
  | 'caption';   // timestamps, footnotes

type TextColor =
  | 'primary' | 'secondary' | 'muted'
  | 'green' | 'red' | 'gold' | 'blue' | 'purple' | 'white';

interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  children: React.ReactNode;
  numberOfLines?: number;   // IMPORTANT: use this to prevent overflow
  ellipsizeMode?: 'tail' | 'middle' | 'head' | 'clip';
  style?: object;
}

const COLOR_MAP: Record<TextColor, string> = {
  primary:  '#C9D1D9',
  secondary:'#8B949E',
  muted:    '#484F58',
  green:    '#3FB950',
  red:      '#F85149',
  gold:     '#D29922',
  blue:     '#58A6FF',
  purple:   '#BC8CFF',
  white:    '#FFFFFF',
};

export const Text = ({
  variant = 'body',
  color = 'primary',
  children,
  numberOfLines,
  ellipsizeMode = 'tail',
  style,
}: TextProps) => {
  const r = useResponsive();

  const variantStyles: Record<TextVariant, object> = {
    display:   { fontSize: r.fontSize.display, fontWeight: '700', letterSpacing: -1 },
    h1:        { fontSize: r.fontSize.xxl,     fontWeight: '700' },
    h2:        { fontSize: r.fontSize.xl,      fontWeight: '600' },
    h3:        { fontSize: r.fontSize.lg,      fontWeight: '600' },
    body:      { fontSize: r.fontSize.md,      fontWeight: '400', lineHeight: r.fontSize.md * 1.6 },
    bodySmall: { fontSize: r.fontSize.sm,      fontWeight: '400', lineHeight: r.fontSize.sm * 1.6 },
    label:     { fontSize: r.fontSize.xs,      fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    mono:      { fontSize: r.fontSize.md,      fontFamily: 'monospace' },
    caption:   { fontSize: r.fontSize.xs,      fontWeight: '400' },
  };

  return (
    <RNText
      style={[variantStyles[variant], { color: COLOR_MAP[color] }, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      // Prevent text from growing beyond container
      allowFontScaling={false}
    >
      {children}
    </RNText>
  );
};
```

**Key overflow prevention rules:**
- Always pass `numberOfLines` on any text inside a fixed-width container
- Use `numberOfLines={1}` for bot names, asset names, any single-line label
- Use `numberOfLines={3}` for trade reasoning previews
- Never use hardcoded `fontSize` values anywhere in the app

---

### 1.4 — Overflow Audit Utilities

**File:** `src/utils/responsive.ts`

Helper functions used across the app for safe dimension calculations.

```typescript
// src/utils/responsive.ts

/**
 * Returns a font size that fits within maxWidth.
 * Use for the BTC display number — it gets long as the stack grows.
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize = 12
): number {
  // Approximate character width at given font size
  const charWidth = (fontSize: number) => fontSize * 0.6;
  let size = maxFontSize;
  while (size > minFontSize && text.length * charWidth(size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/**
 * Truncates a string to fit within maxChars.
 * Use for model IDs — they can be very long.
 */
export function truncateModelId(modelId: string, maxChars = 30): string {
  if (modelId.length <= maxChars) return modelId;
  const parts = modelId.split('/');
  if (parts.length === 2) {
    // 'anthropic/claude-opus-4-6' → 'claude-opus-4-6'
    return parts[1].length <= maxChars ? parts[1] : parts[1].substring(0, maxChars - 1) + '…';
  }
  return modelId.substring(0, maxChars - 1) + '…';
}

/**
 * Safe percentage: clamps value between 0 and 100.
 * Use for progress bars to prevent layout breaks.
 */
export function safePercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}
```

---

## Phase 2: Settings Data Layer

> Build the data layer before the UI. The UI is just a view over this store.

### 2.1 — Settings Schema & Defaults

**File:** `src/types/settings.ts`

```typescript
// src/types/settings.ts

export type LLMTaskKey =
  | 'tradeDecision'       // Opus — final trade approve/reject
  | 'genomeGeneration'    // Opus — new bot DNA creation
  | 'weeklyReview'        // Opus — deep strategy review
  | 'postTradeReflection' // Sonnet — what worked/failed analysis
  | 'genomeMutation'      // Sonnet — parameter change logic
  | 'newsSentiment'       // Haiku — classify news items
  | 'signalScoring'       // Haiku — confidence score per signal
  | 'logSummaries'        // Llama free — routine summaries
  | 'calendarParsing'     // Llama free — economic event extraction
  | 'tradeDnaGeneration'; // Llama free — embedding text builder

export interface ModelAssignment {
  taskKey:     LLMTaskKey;
  label:       string;       // Human-readable task name
  description: string;       // One sentence explaining the task
  modelId:     string;       // OpenRouter model ID
  tier:        'premium' | 'mid' | 'cheap' | 'free';
  estCostUsd:  number;       // Per call, in USD
  isEditable:  boolean;      // Some tasks can be locked
  warning?:    string;       // Shown if user picks a weaker model
}

export interface BTCConversionSettings {
  conversionRatio:   number;   // 0–100, default 80 (% of profit → BTC)
  reinvestRatio:     number;   // auto-computed: 100 - conversionRatio
  minConvertUsd:     number;   // default 5 — minimum conversion amount
  convertOnDip:      boolean;  // default true — wait for BTC dip >0.8%
  dipThresholdPct:   number;   // default 0.8 — dip % to trigger conversion
  pauseInCrash:      boolean;  // default true — hold USDC during CRASH regime
}

export interface TradingGoalSettings {
  targetBtc:         number;   // default 20
  startingCapitalUsd:number;   // user's initial deposit
  riskPerTradePct:   number;   // default 1 — % of portfolio per trade
  maxPositionPct:    number;   // default 20 — max % per trade
  dailyLossLimitPct: number;   // default 5
  totalDrawdownPct:  number;   // default 20 — full halt threshold
}

export interface ATLASSettings {
  models:     Record<LLMTaskKey, ModelAssignment>;
  conversion: BTCConversionSettings;
  goal:       TradingGoalSettings;
  updatedAt:  string;
  version:    number;          // increment on every save for conflict detection
}

// ── Default values ────────────────────────────────────────────────────────

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
  conversionRatio:   80,
  reinvestRatio:     20,
  minConvertUsd:     5,
  convertOnDip:      true,
  dipThresholdPct:   0.8,
  pauseInCrash:      true,
};

export const DEFAULT_GOAL_SETTINGS: TradingGoalSettings = {
  targetBtc:          20,
  startingCapitalUsd: 0,
  riskPerTradePct:    1,
  maxPositionPct:     20,
  dailyLossLimitPct:  5,
  totalDrawdownPct:   20,
};
```

---

### 2.2 — Settings Store (Zustand + SQLite persistence)

**File:** `src/store/settingsStore.ts`

```typescript
// src/store/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ATLASSettings, LLMTaskKey, ModelAssignment,
  BTCConversionSettings, TradingGoalSettings,
  DEFAULT_MODEL_ASSIGNMENTS, DEFAULT_CONVERSION_SETTINGS,
  DEFAULT_GOAL_SETTINGS,
} from '../types/settings';

interface SettingsStore {
  settings: ATLASSettings;

  // Model selection actions
  updateModelForTask: (taskKey: LLMTaskKey, modelId: string) => void;
  resetModelToDefault: (taskKey: LLMTaskKey) => void;
  resetAllModels: () => void;

  // Conversion actions
  updateConversionRatio: (ratio: number) => void;   // 0–100
  updateConversionSettings: (partial: Partial<BTCConversionSettings>) => void;

  // Goal actions
  updateTargetBtc: (btc: number) => void;
  updateGoalSettings: (partial: Partial<TradingGoalSettings>) => void;

  // Computed
  estimatedMonthlyCost: () => number;
}

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-opus-4-6',                 label: 'Claude Opus',        tier: 'premium', cost: 0.075 },
  { id: 'anthropic/claude-sonnet-4-6',               label: 'Claude Sonnet',      tier: 'mid',     cost: 0.015 },
  { id: 'anthropic/claude-haiku-4-5-20251001',       label: 'Claude Haiku',       tier: 'cheap',   cost: 0.002 },
  { id: 'google/gemini-flash-1.5',                   label: 'Gemini Flash',       tier: 'cheap',   cost: 0.002 },
  { id: 'google/gemini-pro-1.5',                     label: 'Gemini Pro',         tier: 'mid',     cost: 0.010 },
  { id: 'deepseek/deepseek-r1',                      label: 'DeepSeek R1',        tier: 'mid',     cost: 0.008 },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',    label: 'Llama 3.3 70B',     tier: 'free',    cost: 0     },
  { id: 'meta-llama/llama-3.1-8b-instruct:free',     label: 'Llama 3.1 8B',      tier: 'free',    cost: 0     },
  { id: 'mistralai/mistral-7b-instruct:free',        label: 'Mistral 7B',         tier: 'free',    cost: 0     },
];

export { AVAILABLE_MODELS };

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: {
        models:     DEFAULT_MODEL_ASSIGNMENTS,
        conversion: DEFAULT_CONVERSION_SETTINGS,
        goal:       DEFAULT_GOAL_SETTINGS,
        updatedAt:  new Date().toISOString(),
        version:    1,
      },

      updateModelForTask: (taskKey, modelId) => {
        const model = AVAILABLE_MODELS.find(m => m.id === modelId);
        if (!model) return;
        set(state => ({
          settings: {
            ...state.settings,
            models: {
              ...state.settings.models,
              [taskKey]: {
                ...state.settings.models[taskKey],
                modelId,
                tier: model.tier as any,
                estCostUsd: model.cost,
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
        const clamped = Math.min(100, Math.max(0, Math.round(ratio)));
        set(state => ({
          settings: {
            ...state.settings,
            conversion: {
              ...state.settings.conversion,
              conversionRatio: clamped,
              reinvestRatio:   100 - clamped,
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

      estimatedMonthlyCost: () => {
        const { models } = get().settings;
        // Estimated call volumes per day × 22 trading days
        const volumes: Record<LLMTaskKey, number> = {
          tradeDecision:       4,
          genomeGeneration:    0.1,  // ~2/month
          weeklyReview:        0.18, // ~4/month
          postTradeReflection: 4,
          genomeMutation:      0.5,
          newsSentiment:       12,
          signalScoring:       15,
          logSummaries:        25,
          calendarParsing:     3,
          tradeDnaGeneration:  4,
        };
        return Object.entries(models).reduce((total, [key, assignment]) => {
          const vol = volumes[key as LLMTaskKey] ?? 0;
          return total + assignment.estCostUsd * vol * 22;
        }, 0);
      },
    }),
    {
      name: 'atlas-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

## Phase 3: Model Selection Feature

### 3.1 — Model Picker Bottom Sheet

**File:** `src/components/settings/ModelPickerSheet.tsx`

This is a bottom sheet that slides up when the user taps a task row. It shows all available models with tier badges, costs, and a confirmation step for downgrading from premium.

```typescript
// src/components/settings/ModelPickerSheet.tsx

interface ModelPickerSheetProps {
  visible:    boolean;
  taskKey:    LLMTaskKey | null;
  onClose:    () => void;
  onSelect:   (taskKey: LLMTaskKey, modelId: string) => void;
}

// UI structure (implement with react-native-bottom-sheet or Modal):
//
// ┌─────────────────────────────────────┐
// │  ▬  [drag handle]                   │
// │                                     │
// │  Trade Decision                     │  ← task label (h3)
// │  Final approve/reject on signals    │  ← description (bodySmall, muted)
// │                                     │
// │  ┌─ PREMIUM ──────────────────────┐ │
// │  │ ● Claude Opus         $0.075   │ │  ← selected (green border)
// │  │ ○ [empty]                      │ │
// │  └────────────────────────────────┘ │
// │  ┌─ MID ──────────────────────────┐ │
// │  │ ○ Claude Sonnet        $0.015  │ │
// │  │ ○ Gemini Pro           $0.010  │ │
// │  │ ○ DeepSeek R1          $0.008  │ │
// │  └────────────────────────────────┘ │
// │  ┌─ CHEAP ────────────────────────┐ │
// │  │ ○ Claude Haiku         $0.002  │ │
// │  │ ○ Gemini Flash         $0.002  │ │
// │  └────────────────────────────────┘ │
// │  ┌─ FREE ─────────────────────────┐ │
// │  │ ○ Llama 3.3 70B        free    │ │
// │  │ ○ Llama 3.1 8B         free    │ │
// │  │ ○ Mistral 7B           free    │ │
// │  └────────────────────────────────┘ │
// │                                     │
// │  ⚠ Warning text (if downgrading)   │  ← only shown when selecting
// │     from premium to cheaper tier    │     a lower tier than default
// │                                     │
// │  [  Cancel  ]  [  Confirm  ]        │
// └─────────────────────────────────────┘
```

**Key responsive rules for this sheet:**
- Bottom sheet height: `min(600, screenHeight * 0.85)` — never taller than 85% of screen
- Model list: `FlatList` with `scrollEnabled={true}` inside the sheet — never fixed height
- Model name: `numberOfLines={1}` — truncate long model IDs with `truncateModelId()`
- Cost badge: minimum width 60px, right-aligned — never wraps

---

### 3.2 — Model Task List

**File:** `src/components/settings/ModelTaskList.tsx`

The main settings section showing all tasks and their current model assignment.

```typescript
// Layout structure per task row:
//
// ┌──────────────────────────────────────────────┐
// │ Trade Decision              [PREMIUM]        │
// │ Final approve/reject...     Claude Opus  ›   │
// │                             ~$0.075/call     │
// └──────────────────────────────────────────────┘

// Responsive rules:
// - Phone (isSm/isMd): label + model on separate lines, stacked
// - Tablet (isLg/isXl): label left, model right, single row
// - Tier badge: always visible, never truncated
// - Model name: numberOfLines={1}, truncateModelId() applied
// - Cost: mono font, right-aligned, numberOfLines={1}
```

---

### 3.3 — Monthly Cost Preview Banner

**File:** `src/components/settings/CostPreviewBanner.tsx`

Live cost estimate that updates as the user changes models. Shows current vs default cost.

```typescript
// Layout:
// ┌─────────────────────────────────────────────┐
// │ Estimated monthly LLM cost                  │
// │                                             │
// │  Current config    Default config           │
// │  $9.42 / month     $8.50 / month            │
// │  ▲ $0.92 more than default                  │
// └─────────────────────────────────────────────┘

// Rules:
// - Dollar amounts: mono font, never truncated (max 8 chars: "$999.99")
// - Difference indicator: green if cheaper, red if more expensive
// - Banner always visible at top of Model Selection section
// - Updates in real time as user browses (no confirm needed for preview)
```

---

## Phase 4: Configurable Settings UI

### 4.1 — Conversion Ratio Slider

**File:** `src/components/settings/ConversionRatioSlider.tsx`

The 80/20 conversion ratio as an interactive slider with real-time visual feedback.

```typescript
// Layout:
// ┌──────────────────────────────────────────┐
// │ Profit Conversion Split                  │
// │                                          │
// │  80%                    20%              │
// │  ████████████████░░░░░  To BTC  Reinvest │
// │  [━━━━━━━━━━●────────]                   │
// │                                          │
// │  On a $100 profit:                       │
// │  → $80.00 buys BTC                       │
// │  → $20.00 added to trading capital       │
// └──────────────────────────────────────────┘

// Implementation notes:
// - Use @react-native-community/slider
// - step={5} — moves in 5% increments only (prevents micro-adjustments)
// - minimumValue={10} maximumValue={95} — never allow 0% or 100% conversion
//   (0% = never accumulate BTC, defeats the purpose;
//    100% = never reinvest, starves the bot pool)
// - The example calculation updates live: "On a $X profit:" uses last
//   closed trade's profit as X, or $100 if no trades yet
// - The dual percentage display (80% | 20%) never overflows:
//   both are max 3 chars + "%" = 4 chars maximum

// Responsive:
// - Slider track: width = screenWidth - (horizontalPadding * 2) - cardPadding * 2
// - Never hardcode width on the slider — let it stretch to fill
```

---

### 4.2 — BTC Goal Editor

**File:** `src/components/settings/BtcGoalEditor.tsx`

```typescript
// Layout:
// ┌──────────────────────────────────────────┐
// │ Target BTC Goal                          │
// │                                          │
// │  [  20.00  ] BTC                         │
// │  ≈ $1,300,000 at current price           │
// │                                          │
// │  Milestone markers:                      │
// │  0.1  0.5  1  5  ●10  20               │
// │  ○────○────○──○───●────○               │
// │                                          │
// │  [  Reset to 20 BTC  ]                   │
// └──────────────────────────────────────────┘

// Numeric input rules:
// - Use TextInput with keyboardType="decimal-pad"
// - Validate on blur: must be > 0 and ≤ 10,000 BTC
// - Show error state (red border) for invalid input
// - Never allow negative or zero values to save
// - USD equivalent: updates when BTC price updates from Alpaca feed
// - USD equivalent uses compact notation: "$1.3M" not "$1,300,000"
//   on small screens (isSm → compact, isMd+ → full)

// Milestone row overflow rules:
// - Fixed set of 6 milestones rendered as Row with wrap={false}
// - Each milestone: minimum 40px wide
// - If target < a milestone, that milestone dims (not removed)
// - Connecting line is a View with flex:1, not a fixed width
```

---

### 4.3 — Risk Limits Editor

**File:** `src/components/settings/RiskLimitsEditor.tsx`

Editable risk parameters with validation and hard floor/ceiling enforcement.

```typescript
// Parameters and their constraints:
const RISK_PARAM_CONSTRAINTS = {
  riskPerTradePct: {
    label: 'Max Risk Per Trade',
    unit: '%',
    min: 0.1,   max: 5,   step: 0.1,
    default: 1,
    description: '% of total portfolio risked on any single trade',
    warning: 'Above 2% significantly increases ruin probability',
    warnAbove: 2,
  },
  maxPositionPct: {
    label: 'Max Position Size',
    unit: '%',
    min: 1,     max: 20,  step: 1,
    default: 20,
    description: 'Max % of bot allocation per single position',
  },
  dailyLossLimitPct: {
    label: 'Daily Loss Halt',
    unit: '%',
    min: 1,     max: 15,  step: 0.5,
    default: 5,
    description: 'All trading halts if portfolio drops this % in one day',
  },
  totalDrawdownPct: {
    label: 'Total Drawdown Halt',
    unit: '%',
    min: 5,     max: 50,  step: 1,
    default: 20,
    description: 'Full system halt if portfolio drops this % from peak',
    warning: 'Above 30% may not leave enough capital to recover',
    warnAbove: 30,
  },
};

// Each parameter rendered as:
// Label + description
// [  slider  ] with min/max labels on either side
// Current value badge (updates live)
// Warning text (shown only when above warnAbove threshold)
```

---

## Phase 5: Wiring & Integration

### 5.1 — Settings Screen Assembly

**File:** `src/screens/SettingsScreen.tsx`

The Settings screen is now significantly larger. It must be structured as a `Screen` with `scroll={true}` divided into clearly labelled sections.

```typescript
// Screen section order:
// 1. API Keys (existing)
// 2. Trading Mode (PAPER / LIVE toggle — existing)
// 3. ─── LLM Model Selection ───
//    3a. CostPreviewBanner
//    3b. ModelTaskList (all 10 tasks)
//    3c. "Reset all to defaults" button
// 4. ─── BTC Compounding ───
//    4a. ConversionRatioSlider
//    4b. Advanced conversion toggles (convertOnDip, pauseInCrash)
// 5. ─── Trading Goal ───
//    5a. BtcGoalEditor
// 6. ─── Risk Controls ───
//    6a. RiskLimitsEditor
// 7. ─── Danger Zone ───
//    7a. Emergency Stop All (existing)
//    7b. Reset all settings to factory defaults (new)

// Navigation: Settings screen needs internal section anchors
// (ScrollView with ref, section header taps scroll to section)
// Implement via ScrollView ref + scrollTo({y: sectionOffset})
```

---

### 5.2 — LLM Router Integration

**File:** `src/services/llmRouter.ts`

The router must read from the settings store on every call, not from a hardcoded table.

```typescript
// src/services/llmRouter.ts
import { useSettingsStore } from '../store/settingsStore';
import { LLMTaskKey } from '../types/settings';

export class LLMRouter {
  async route(task: LLMTaskKey, prompt: string, systemPrompt?: string): Promise<string> {
    // Always read live from store — user may have changed model mid-session
    const { settings } = useSettingsStore.getState();
    const assignment = settings.models[task];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getApiKey()}`,
        'HTTP-Referer': 'https://atlas-trading.app',
        'X-Title': 'ATLAS Trading',
      },
      body: JSON.stringify({
        model: assignment.modelId,  // ← reads from user's setting
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: this.maxTokensForTask(task),
        temperature: this.temperatureForTask(task),
      }),
    });

    // Log actual model used to SQLite for cost tracking
    await this.logCall(task, assignment.modelId, assignment.estCostUsd);

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

---

### 5.3 — BTC Conversion Engine Integration

**File:** `src/services/btcConversionEngine.ts`

Reads live conversion ratio from settings store.

```typescript
// Key change: ratio is no longer hardcoded
async function convertProfit(profitUsd: number): Promise<void> {
  const { settings } = useSettingsStore.getState();
  const { conversionRatio, minConvertUsd, convertOnDip, pauseInCrash } = settings.conversion;

  if (profitUsd < minConvertUsd) return;  // below minimum

  const btcAmount   = profitUsd * (conversionRatio / 100);
  const reinvestAmt = profitUsd * ((100 - conversionRatio) / 100);

  // ... rest of conversion logic
}
```

---

## Component Reference

### New Components in This Feature

| Component | File | Purpose |
|---|---|---|
| `useResponsive` | `hooks/useResponsive.ts` | Screen size hook — single source of truth |
| `Screen` | `components/layout/Screen.tsx` | Safe screen wrapper |
| `Row` | `components/layout/Row.tsx` | Horizontal flex primitive |
| `Stack` | `components/layout/Stack.tsx` | Vertical flex primitive |
| `Card` | `components/layout/Card.tsx` | Container primitive |
| `Text` | `components/typography/Text.tsx` | All text rendering |
| `ModelPickerSheet` | `components/settings/ModelPickerSheet.tsx` | Model selection bottom sheet |
| `ModelTaskList` | `components/settings/ModelTaskList.tsx` | All tasks + current models |
| `CostPreviewBanner` | `components/settings/CostPreviewBanner.tsx` | Live cost estimate |
| `ConversionRatioSlider` | `components/settings/ConversionRatioSlider.tsx` | BTC/reinvest ratio |
| `BtcGoalEditor` | `components/settings/BtcGoalEditor.tsx` | Target BTC goal |
| `RiskLimitsEditor` | `components/settings/RiskLimitsEditor.tsx` | Risk parameter controls |

### Modified Files

| File | Change |
|---|---|
| `store/settingsStore.ts` | New — replaces any ad-hoc settings state |
| `services/llmRouter.ts` | Reads model from store instead of hardcoded table |
| `services/btcConversionEngine.ts` | Reads ratio from store |
| `screens/SettingsScreen.tsx` | Rebuilt with new sections |
| `screens/HomeScreen.tsx` | BTC goal reads from store for progress bar |

---

## Responsive Rules Reference

These rules apply to every component in the app. Treat them as a checklist before marking any component done.

### Text Overflow Rules

| Scenario | Rule |
|---|---|
| Bot name | `numberOfLines={1}` always |
| Asset ticker (BTC/USD) | `numberOfLines={1}` always |
| Model ID in any list | `truncateModelId()` + `numberOfLines={1}` |
| Trade rationale preview | `numberOfLines={3}` maximum |
| BTC amount display | `fitFontSize()` — shrinks if number gets long |
| Dollar amounts | Max 10 chars — use compact notation on `isXs` |
| Percentage values | Max 6 chars (e.g. "99.99%") — always fits |

### Layout Overflow Rules

| Scenario | Rule |
|---|---|
| Any horizontal `Row` | Add `flexShrink: 1` to children that can shrink |
| Price + change badge | Price gets `flex: 1`, badge gets `flexShrink: 0` |
| Label + value pair | Label gets `flex: 1`, value gets `flexShrink: 0` |
| Tab bar labels | `numberOfLines={1}`, icon always visible |
| Bottom sheet | Max height `screenHeight * 0.85` |
| Modal content | Always wrapped in `ScrollView` |
| Slider | Width computed from screen, never hardcoded |
| Progress bar | `width: '100%'` on parent, child `width` in % |
| Charts | `width: screenWidth - horizontalPadding * 2` |

### Spacing Rules

| Context | Rule |
|---|---|
| Screen horizontal padding | Always `r.horizontalPadding` from hook |
| Card internal padding | Always `r.spacing.md` |
| Gap between cards | Always `r.spacing.md` |
| Section gap | Always `r.spacing.xl` |
| Inline gap (icon + text) | Always `r.spacing.sm` |

---

## Testing Checklist

Test every new screen and component against this list before marking a phase complete.

### Devices to Test

| Device | Width | Represents |
|---|---|---|
| iPhone SE (3rd gen) | 375px | Small phone — most constrained |
| iPhone 16 Pro | 393px | Standard phone |
| iPhone 16 Pro Max | 430px | Large phone |
| iPad Mini 6th gen | 768px | Small tablet |
| iPad Pro 12.9" | 1024px | Large tablet |
| Any device landscape | varies | Rotation test |

### Per-Component Checks

- [ ] No horizontal scroll on any screen in portrait
- [ ] No horizontal scroll on any screen in landscape
- [ ] No text truncation where full text is needed (use `numberOfLines` intentionally, not accidentally)
- [ ] All touch targets minimum 44×44px
- [ ] Slider works with both thumb and tap-to-position interaction
- [ ] Model picker sheet doesn't obscure keyboard when opened
- [ ] Settings scroll preserves position when sheet closes
- [ ] BTC goal USD equivalent updates when BTC price changes
- [ ] Conversion ratio slider snaps to 5% increments
- [ ] Cost preview banner updates in real time (not on save)
- [ ] Risk limit warnings appear/disappear at correct thresholds
- [ ] Emergency stop still accessible without scrolling (sticky or top of danger zone)
- [ ] All monetary values formatted consistently (2 decimal places for USD, 8 for BTC)
- [ ] Store persists after app kill and relaunch (AsyncStorage test)
- [ ] Reset to defaults restores all values correctly

### Overflow-Specific Checks

- [ ] Longest model ID (`meta-llama/llama-3.3-70b-instruct:free`) renders without overflow in every context it appears
- [ ] BTC amount `19.99999999` renders without overflow on HomeScreen progress bar
- [ ] Bot name `atlas_099_generation_14` renders without overflow on Bot Arena card
- [ ] `$1,300,000.00` USD equivalent renders without overflow on BTC Goal screen
- [ ] 5-digit portfolio value `$9,999.99` renders without overflow on HomeScreen

---

## Implementation Order Summary

```
Week 1
  Day 1-2:  Phase 1.1 — useResponsive hook
  Day 2-3:  Phase 1.2 — Layout primitives (Screen, Row, Stack, Card)
  Day 3-4:  Phase 1.3 — Typography system (Text component)
  Day 4-5:  Phase 1.4 — Responsive utils (fitFontSize, truncateModelId)
  Day 5:    Migrate ALL existing screens to use new primitives

Week 2
  Day 1:    Phase 2.1 — Settings types and defaults
  Day 2-3:  Phase 2.2 — Zustand settings store with persistence
  Day 3-4:  Phase 3.1 — ModelPickerSheet component
  Day 4-5:  Phase 3.2 — ModelTaskList component
  Day 5:    Phase 3.3 — CostPreviewBanner

Week 3
  Day 1-2:  Phase 4.1 — ConversionRatioSlider
  Day 2-3:  Phase 4.2 — BtcGoalEditor
  Day 3-4:  Phase 4.3 — RiskLimitsEditor
  Day 4-5:  Phase 5.1 — Settings screen assembly
  Day 5:    Phase 5.2 + 5.3 — Wire router and conversion engine to store

Week 4
  Day 1-2:  Full responsive testing on all 6 device sizes
  Day 3:    Overflow audit — every screen against the checklist
  Day 4:    Edge case fixes
  Day 5:    Final review + merge
```

---

*ATLAS Implementation Plan v1.1 — Model Selection + Configurable Settings + Responsive Design*
*Build Phase 1 first. The responsive foundation is not optional.*
EOF