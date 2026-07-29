# ATLAS — Project Memory & Roadmap

This document serves as the persistent memory layer for the development of **ATLAS (Autonomous Trading & Learning Agent System)**. It tracks the implementation status of each phase, architecture decisions, integration details, and milestones achieved.

---

## Project Overview

- **Platform:** React Native (Expo SDK 57) — Android Focused
- **Broker:** Alpaca Markets (Crypto + US Equities)
- **LLM Gateway:** OpenRouter (multi-model, single API key)
- **Memory:** Pinecone Vector DB + SQLite on-device (`expo-sqlite`)
- **GitHub Repository:** [https://github.com/abdulah-0/ATLAS.git](https://github.com/abdulah-0/ATLAS.git)
- **North Star Goal:** Compound starting capital to 20 BTC through autonomous, self-improving trading.

---

## Implementation Roadmap & Phases

We have divided the implementation of ATLAS into 5 sequential phases based on the PRD:

### ✅ Phase 1: Foundation & Integration
*Establish the development environment, database schemas, API connections, and core UI dashboard.*
- [x] Expo project initialization with TypeScript and routing setup (`expo-router`).
- [x] Alpaca SDK integration (Paper trading credentials, account status, position fetch, and order execution).
- [x] OpenRouter API gateway setup with SecureStore key storage (`openrouter.ts`).
- [x] SQLite database schema definition, initialization, and helper operations (`db.ts`).
- [x] Pinecone REST client integration (`pinecone.ts`).
- [x] Rule-based market regime detector (`regime.ts` calculating SMA and volatility metrics).
- [x] Mission Control (Home Screen) basic UI shell with live/demo toggle, dynamic Alpaca fetching, regime detector, and news ticker.

### ✅ Phase 2: Bot Genome & Strategy Engine
*Define the genetic structure of bots, signal generation, and the Darwinian replacement engine.*
- [x] Bot DNA JSON schema definition (`genome.ts`) and Zod runtime validator (`genomeSchema.ts`).
- [x] Seed genomes initialization (`atlas_001` "Momentum Hunter" & `atlas_002` "Mean Reversion" in `seedGenomes.ts`).
- [x] Technical indicators (`indicators.ts`: RSI, VWAP, Bollinger Bands, Volume Spikes) & signal evaluation engine (`signals.ts`).
- [x] Death trigger monitor service (`deathMonitor.ts`: 5 consecutive losses, <40% win rate over 20 trades, -15% drawdown, Champion immunity).
- [x] Probation slot workflow (`probation.ts`: 20-trade evaluation window, 50% allocation, auto-promotion criteria).
- [x] Replacement Engine (`replacementEngine.ts`: Claude Opus prompt + Zod schema validator for MUTATE, CROSSOVER, and GENERATE).
- [x] Bot Arena Screen UI (`bot_arena.tsx`: live bot cards, composite health bars, trigger badges, probation progress, kill feed & hall of fame).

### ✅ Phase 3: Intelligence & Vector Memory Layer
*Integrate real-time market intelligence, Pinecone RAG query flow, and post-trade reflections.*
- [x] News Engine integration (`newsEngine.ts`: Alpaca/CryptoPanic ingestion, Claude Haiku classifier, `NewsDigest` builder).
- [x] Pre-trade RAG decision flow (`decisionEngine.ts`: Pinecone top-10 similarity search, Opus context prompt, Zod `DecisionSchema` validation).
- [x] Trade DNA writer (`tradeDna.ts`: formatting semantic text blocks, generating 1536-dim embeddings via OpenRouter, Pinecone upsert).
- [x] Post-trade reflection process (`reflectionEngine.ts`: Claude Sonnet analysis on trade close, Zod `ReflectionSchema`, SQLite trade updating).
- [x] Genome auto-mutation and safety rollback mechanism (`rollback.ts`: 15-trade post-mutation performance tracking, auto-rollback if win rate drops >10%).
- [x] Trade Feed Screen UI (`trade_feed.tsx`: detailed chronological list, filter chips, expandable Opus reasoning, top Pinecone RAG matches, Sonnet reflections).

### ✅ Phase 4: Risk Management & Profit Compounding
*Enforce financial safety limits and build the BTC conversion mechanism.*
- [x] TypeScript Hard Risk Engine (`riskEngine.ts`: 9 code-level rules: mandatory stop loss, max 20% size, 1% portfolio risk, 5% daily loss halt, 20% drawdown circuit breaker, correlation guard, CRASH regime lock, stock earnings blackout, breaking news pause).
- [x] Dynamic position sizing (`sizing.ts`: confidence-gated tiers <0.50->0%, 0.50-0.64->5%, 0.65-0.74->10%, 0.75-0.84->15%, 0.85-1.00->20% & regime multipliers).
- [x] BTC Conversion Engine (`btcConversion.ts`: 80/20 profit conversion queue, >0.8% dip-aware execution, $5 minimum threshold, SQLite `btc_stack` logging).
- [x] Daily High-Water Mark profit lock protection (`profitLock.ts`: 70% peak gain floor protection, dynamic stop tightening).
- [x] BTC Stack Screen UI (`btc_stack.tsx`: 20 BTC progress bar, milestone chips 0.1/0.5/1/5/10/20 BTC, cost-basis, conversion history ledger).

### ✅ Phase 5: UI Polish, Testing & Deployment
*Refine UX, run validation suites, and prepare for production launch.*
- [x] Intelligence Screen UI (`intelligence.tsx`: regime transition history chart, live classified news feed, Fear & Greed index).
- [x] Settings Screen UI (`settings.tsx`: encrypted API keys input for OpenRouter, Alpaca, Pinecone via SecureStore, Emergency Stop button, paper/live mode toggle).
- [x] Push notification service (`notifications.ts`: wrapper for bot terminations, milestone targets, and risk alerts).
- [x] End-to-end 5-phase system health verification test suite (`test-phase5.ts`).
- [x] Android packaging & standalone build config (`app.json`: `package: "com.atlas.autonomous.trading"`).

### ✅ ATLAS v1.1: Model Selection + Configurable Settings + Responsive Foundation
*System-wide responsive redesign, per-task LLM model picker, configurable 80/20 profit split slider, editable target BTC goal, and code-level risk limits.*
- [x] Responsive Foundation (`useResponsive.ts`, `Screen.tsx`, `Row.tsx`, `Stack.tsx`, `Card.tsx`, `Text.tsx`, `responsive.ts`).
- [x] Settings Data Layer & Store (`settings.ts`, `settingsStore.ts` with Zustand & `AsyncStorage` persistence).
- [x] LLM Model Selection UI (`ModelPickerSheet.tsx`, `ModelTaskList.tsx`, `CostPreviewBanner.tsx` with live cost estimates).
- [x] Configurable Settings Controls (`ConversionRatioSlider.tsx`, `BtcGoalEditor.tsx`, `RiskLimitsEditor.tsx`).
- [x] OpenRouter & BTC Conversion Integration (`openrouter.ts`, `btcConversion.ts`, `settings.tsx`, `index.tsx`).

---

## Development Log & Version History

### [2026-07-30] ATLAS v1.1 Feature Implementation Complete
- **Action:** Executed full v1.1 implementation plan per `docs/ATLAS_Implementation_Plan.md`.
- **Components Built:**
  - `useResponsive` hook with 5 breakpoint scale (`xs`, `sm`, `md`, `lg`, `xl`) and scaled typography/spacing.
  - Layout primitives: `Screen`, `Row`, `Stack`, `Card`.
  - Typography system: `Text` with `numberOfLines` truncation & font scaling controls.
  - Responsive utilities: `fitFontSize`, `truncateModelId`, `safePercent`.
  - Settings data layer: `types/settings.ts` (10 LLM tasks) and `store/settingsStore.ts` (Zustand + `AsyncStorage`).
  - Model Selection UI: `ModelPickerSheet`, `ModelTaskList`, `CostPreviewBanner` with live monthly cost estimate ($/mo).
  - Configurable Settings: `ConversionRatioSlider` (10–95% range), `BtcGoalEditor` (decimal input + milestones), `RiskLimitsEditor` (risk per trade, max position, daily loss halt, drawdown circuit breaker).
  - Integrated `openrouter.ts`, `btcConversion.ts`, `settings.tsx`, and `index.tsx`.
- **Validation:** Executed verification test suite (`PASSED`). TypeScript compilation clean (`npx tsc --noEmit` 0 errors).
- **Git Commit:** Pushed v1.1 codebase to `https://github.com/abdulah-0/ATLAS.git`.
- **Status:** v1.1 complete.
