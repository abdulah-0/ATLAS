# ATLAS — Project Memory & Roadmap

This document serves as the persistent memory layer for the development of **ATLAS (Autonomous Trading & Learning Agent System)**. It tracks the implementation status of each phase, architecture decisions, integration details, and milestones achieved.

---

## Project Overview

- **Platform:** React Native (Expo SDK 57) — Android Focused
- **Broker:** Alpaca Markets (Crypto + US Equities)
- **LLM Gateway:** OpenRouter (multi-model, single API key)
- **Forecasting Microservice:** Kronos Deep-Learning Model (`https://atlas-kronos.onrender.com`)
- **Memory:** Pinecone Vector DB + SQLite on-device (`expo-sqlite`)
- **GitHub Repository:** [https://github.com/abdulah-0/ATLAS.git](https://github.com/abdulah-0/ATLAS.git)
- **North Star Goal:** Compound starting capital to 20 BTC through autonomous, self-improving trading.

---

## Implementation Roadmap & Phases

### ✅ Phase 1: Foundation & Integration
- [x] Expo project initialization with TypeScript and routing setup (`expo-router`).
- [x] Alpaca SDK integration (Paper trading credentials, account status, position fetch, and order execution).
- [x] OpenRouter API gateway setup with SecureStore key storage (`openrouter.ts`).
- [x] SQLite database schema definition, initialization, and helper operations (`db.ts`).
- [x] Pinecone REST client integration (`pinecone.ts`).
- [x] Rule-based market regime detector (`regime.ts`).
- [x] Mission Control (Home Screen) basic UI shell.

### ✅ Phase 2: Bot Genome & Strategy Engine
- [x] Bot DNA JSON schema definition (`genome.ts`) and Zod runtime validator (`genomeSchema.ts`).
- [x] Seed genomes initialization (`atlas_001` & `atlas_002`).
- [x] Technical indicators (`indicators.ts`) & signal evaluation engine (`signals.ts`).
- [x] Death trigger monitor service (`deathMonitor.ts`).
- [x] Probation slot workflow (`probation.ts`).
- [x] Replacement Engine (`replacementEngine.ts`).
- [x] Bot Arena Screen UI (`bot_arena.tsx`).

### ✅ Phase 3: Intelligence & Vector Memory Layer
- [x] News Engine integration (`newsEngine.ts`).
- [x] Pre-trade RAG decision flow (`decisionEngine.ts`).
- [x] Trade DNA writer (`tradeDna.ts`).
- [x] Post-trade reflection process (`reflectionEngine.ts`).
- [x] Genome auto-mutation and safety rollback mechanism (`rollback.ts`).
- [x] Trade Feed Screen UI (`trade_feed.tsx`).

### ✅ Phase 4: Risk Management & Profit Compounding
- [x] TypeScript Hard Risk Engine (`riskEngine.ts`).
- [x] Dynamic position sizing (`sizing.ts`).
- [x] BTC Conversion Engine (`btcConversion.ts`).
- [x] Daily High-Water Mark profit lock protection (`profitLock.ts`).
- [x] BTC Stack Screen UI (`btc_stack.tsx`).

### ✅ Phase 5: UI Polish, Testing & Deployment
- [x] Intelligence Screen UI (`intelligence.tsx`).
- [x] Settings Screen UI (`settings.tsx`).
- [x] Push notification service (`notifications.ts`).
- [x] End-to-end 5-phase system health verification test suite (`test-phase5.ts`).
- [x] Android packaging & standalone build config (`app.json`).

### ✅ ATLAS v1.1: Model Selection + Configurable Settings + Responsive Foundation
- [x] Responsive Foundation (`useResponsive.ts`, `Screen.tsx`, `Row.tsx`, `Stack.tsx`, `Card.tsx`, `Text.tsx`, `responsive.ts`).
- [x] Settings Data Layer & Store (`settings.ts`, `settingsStore.ts`).
- [x] LLM Model Selection UI (`ModelPickerSheet.tsx`, `ModelTaskList.tsx`, `CostPreviewBanner.tsx`).
- [x] Configurable Settings Controls (`ConversionRatioSlider.tsx`, `BtcGoalEditor.tsx`, `RiskLimitsEditor.tsx`).
- [x] OpenRouter & BTC Conversion Integration (`openrouter.ts`, `btcConversion.ts`, `settings.tsx`, `index.tsx`).

### ✅ ATLAS × Kronos Integration & Real-Time Event System
*Kronos deep-learning time-series forecasting, 4-stage Bull/Bear/Risk Opus decision debate, central logger, real-time Event Logs Screen, icon-only 6-tab navbar, and Intel screen fixes.*
- [x] Kronos TypeScript types (`kronos.ts`) & HTTP client service (`kronosClient.ts` with 15s timeout & keep-alive).
- [x] Kronos Accuracy Tracker (`kronosAccuracyTracker.ts` updating `was_correct` on trade close).
- [x] Centralized Logger service (`logger.ts`) & Zustand event store (`logsStore.ts`).
- [x] Database schemas: `kronos_forecasts`, `ohlcv_cache` with trim trigger, `kronos_accuracy` view, and `log_events` with trim trigger in `db.ts`.
- [x] 4-Stage Bull/Bear/Risk Opus Debate in `decisionEngine.ts` parsing `bull_case`, `bear_case`, `risk_flags`, `kronos_alignment`.
- [x] Icon-Only 6-Tab Bottom Navigation Bar in `_layout.tsx` (`Control`, `Bot Arena`, `Logs`, `Intel`, `BTC Stack`, `Settings`) with `lucide-react-native` icons, active top bar, and red unread dot.
- [x] Real-time Event Logs Screen (`logs.tsx`) with category/level filter chips, expandable debate details, auto-expanded errors, and mark-read on focus.
- [x] Trade Feed Kronos Badge (`KronosAlignmentBadge.tsx`) & Intelligence Screen Forecast Panel (`KronosForecastPanel.tsx`) with non-virtualized 20-item news feed.

---

## Development Log & Version History

### [2026-08-01] ATLAS × Kronos Integration Complete
- **Action:** Executed full integration plan per `docs/ATLAS_Kronos_Integration_Plan (1).md`.
- **Validation:** Executed test suite (`test-kronos-v1.1.ts`). TypeScript compilation clean (`npx tsc --noEmit` 0 errors).
- **Git Commit:** Pushed codebase to `https://github.com/abdulah-0/ATLAS.git`.
- **Status:** Kronos integration complete.
