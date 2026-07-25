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

### 🟩 Phase 4: Risk Management & Profit Compounding
*Enforce financial safety limits and build the BTC conversion mechanism.*
- [ ] TypeScript Hard Risk Engine (mandatory stop loss, max 20% size, 1% portfolio risk, daily/drawdown halts).
- [ ] Dynamic position sizing gated by Opus confidence scores and regime multipliers.
- [ ] BTC Conversion Engine (80% profit conversion queue, dip-aware execution, SQLite audit trail).
- [ ] Daily High-Water Mark profit lock protection (stop loss tightening logic).
- [ ] BTC Stack Screen UI (progress bar towards 20 BTC target, cost-basis, conversion history).

### ⬜ Phase 5: UI Polish, Testing & Deployment
*Refine UX, run validation suites, and prepare for production launch.*
- [ ] Intelligence Screen UI (regime transition history chart, live news feed, Fear & Greed index).
- [ ] Settings Screen UI (encrypted API keys input, Emergency Stop button, paper/live mode toggle).
- [ ] Push notification service for bot terminations, milestone targets, and risk alerts.
- [ ] 30-day paper-trading simulation verification against PRD success metrics.
- [ ] App Store & Play Store packaging and distribution config.

---

## Development Log & Version History

### [2026-07-25] Phase 0: Repository Setup & Project Roadmap
- **Action:** Analyzed `ATLAS_PRD_v1.md`, established implementation plan divided into 5 phases.
- **Artifacts:** Created `docs/memory.md` to track progress.
- **Git Commit:** Initialized Git repository, added PRD and Memory files, and pushed to `https://github.com/abdulah-0/ATLAS.git`.
- **Status:** Phase 0 complete.

### [2026-07-25] Phase 1: Foundation & Integration Complete
- **Action:** Initialized Expo SDK 57 project with TypeScript, configured tab navigation, built services for Alpaca (`alpaca.ts`), OpenRouter (`openrouter.ts`), Pinecone (`pinecone.ts`), SQLite (`db.ts`), SecureStore (`secureStore.ts`), and Market Regime detection (`regime.ts`).
- **UI:** Designed Mission Control Home Screen (`src/app/index.tsx`) with 20 BTC progress bar, Live Regime badge, account metrics, seed bot cards, and news ticker. Created screen placeholders (`bot_arena.tsx`, `trade_feed.tsx`, `intelligence.tsx`, `btc_stack.tsx`, `settings.tsx`).
- **Validation:** Verification script `test-connections.js` created and executed. Zero TypeScript compilation errors (`npx tsc --noEmit` clean).
- **Git Commit:** Pushed Phase 1 codebase to `https://github.com/abdulah-0/ATLAS.git`.
- **Status:** Phase 1 complete.

### [2026-07-25] Phase 2: Bot Genome & Strategy Engine Complete
- **Action:** Created `src/types/genome.ts`, Zod schema `genomeSchema.ts`, technical indicators `indicators.ts` (RSI, VWAP, Bollinger Bands, Volume Spike, Momentum), seed genomes `seedGenomes.ts` (`atlas_001` Momentum Hunter and `atlas_002` Mean Reversion), signal evaluation engine `signals.ts`, 3-trigger death monitor `deathMonitor.ts` with Champion crown protection, probation manager `probation.ts` for 20-trade evaluation windows, and Claude Opus strategy generation `replacementEngine.ts`.
- **UI:** Implemented interactive Bot Arena Screen (`src/app/bot_arena.tsx`) with expandable bot cards, composite health score tracks, death trigger badges, probation progress indicators, and Kill Feed / Hall of Fame ledger.
- **Validation:** Built and ran `src/scripts/test-phase2.ts` test suite. All tests passed. Zero TypeScript compilation errors (`npx tsc --noEmit` clean).
- **Git Commit:** Pushed Phase 2 codebase to `https://github.com/abdulah-0/ATLAS.git`.
- **Status:** Phase 2 complete.

### [2026-07-25] Phase 3: Intelligence & Vector Memory Layer Complete
- **Action:** Implemented `newsEngine.ts` for headline classification via Claude Haiku (`HaikuNewsClassificationSchema`), `tradeDna.ts` for formatting semantic trade text and 1536-dim OpenRouter embeddings, `decisionEngine.ts` for pre-trade Pinecone RAG similarity search and Claude Opus decision analysis (`DecisionSchema`), `reflectionEngine.ts` for post-trade Claude Sonnet reflections (`ReflectionSchema`), and `rollback.ts` for 15-trade post-mutation performance tracking and auto-rollback.
- **UI:** Implemented interactive Trade Feed Screen (`src/app/trade_feed.tsx`) with filter chips (All/Wins/Losses), expandable trade cards, full Opus pre-trade decision reasoning, top-3 Pinecone RAG matches, and Sonnet reflections.
- **Validation:** Executed `test-phase3.ts` test suite (`PASSED`). Zero TypeScript compilation errors (`npx tsc --noEmit` clean).
- **Git Commit:** Pushed Phase 3 codebase to `https://github.com/abdulah-0/ATLAS.git`.
- **Status:** Phase 3 complete. Ready to begin Phase 4.
