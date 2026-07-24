# ATLAS — Project Memory & Roadmap

This document serves as the persistent memory layer for the development of **ATLAS (Autonomous Trading & Learning Agent System)**. It tracks the implementation status of each phase, architecture decisions, integration details, and milestones achieved.

---

## Project Overview

- **Platform:** React Native (Expo) — iOS & Android
- **Broker:** Alpaca Markets (Crypto + US Equities)
- **LLM Gateway:** OpenRouter (multi-model, single API key)
- **Memory:** Pinecone Vector DB + SQLite on-device
- **GitHub Repository:** [https://github.com/abdulah-0/ATLAS.git](https://github.com/abdulah-0/ATLAS.git)
- **North Star Goal:** Compound starting capital to 20 BTC through autonomous, self-improving trading.

---

## Implementation Roadmap & Phases

We have divided the implementation of ATLAS into 5 sequential phases based on the PRD:

### 🟩 Phase 1: Foundation & Integration
*Establish the development environment, database schemas, API connections, and core UI dashboard.*
- [ ] Expo project initialization with TypeScript and routing setup.
- [ ] Alpaca SDK integration (Paper trading credentials, account status, position fetch, and order execution).
- [ ] OpenRouter API gateway setup with SecureStore key storage.
- [ ] SQLite database schema definition, initialization, and mock data.
- [ ] Pinecone client integration, vector database configuration, and read/write helper utilities.
- [ ] HMM / rule-based market regime detector (proxy implementation using volatility/VIX and trend metrics).
- [ ] Mission Control (Home Screen) basic UI shell with live/mock data feeds.

### ⬜ Phase 2: Bot Genome & Strategy Engine
*Define the genetic structure of bots, signal generation, and the Darwinian replacement engine.*
- [ ] Bot DNA JSON schema definition and Zod runtime validator.
- [ ] Seed genomes initialization (atlas_001 "Momentum Hunter" & atlas_002 "Mean Reversion").
- [ ] Technical indicators & signal generators (Momentum Breakout, Mean Reversion, VWAP Reversion).
- [ ] Death trigger monitor service (5 consecutive losses, <40% win rate over 20 trades, -15% drawdown).
- [ ] Probation slot workflow (20-trade probation window, 50% allocation, auto-promotion criteria).
- [ ] Replacement Engine (Claude Opus prompt and Zod schema validator for generating successor genomes).
- [ ] Bot Arena Screen UI (live bot cards, health bars, probation status, kill feed).

### ⬜ Phase 3: Intelligence & Vector Memory Layer
*Integrate real-time market intelligence, Pinecone RAG query flow, and post-trade reflections.*
- [ ] News Engine integration (Alpaca, CryptoPanic, RSS feeds ingestion + Claude Haiku classifier).
- [ ] Pre-trade RAG decision flow (similarity search of past 10 trades from Pinecone, context injection).
- [ ] Claude Opus Trade Decision prompt (signals + RAG past outcomes + news context = Approve/Reject/Modify).
- [ ] Trade DNA writer (generating embedding text, creating vector, upserting to Pinecone).
- [ ] Post-trade reflection process (Claude Sonnet analysis on trade close, storing insights in SQLite).
- [ ] Genome auto-mutation and safety rollback mechanism.
- [ ] Trade Feed Screen UI (detailed list, expanded cards showing trade metrics, RAG outcomes, and reflections).

### ⬜ Phase 4: Risk Management & Profit Compounding
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
- **Status:** Phase 0 complete. Ready to begin Phase 1.
