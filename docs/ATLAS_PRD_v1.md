# ATLAS — Autonomous Trading & Learning Agent System
## Product Requirements Document · Version 1.0 · CONFIDENTIAL

> **Darwinian · Self-Improving · Compounding to 20 BTC**

**Platform:** React Native (Expo) — iOS & Android
**Brokers:** Alpaca Markets (Crypto + US Equities)
**LLM Gateway:** OpenRouter (multi-model, single API key)
**Memory:** Pinecone Vector DB + SQLite on-device
**North Star:** Compound any starting capital to 20 BTC through autonomous, self-improving trading

---

> ⚠️ **RISK DISCLAIMER:** Automated trading involves substantial risk of capital loss. All features described herein must be paper-traded and validated before any real capital is deployed. Past performance of any strategy does not guarantee future results.

---

## Table of Contents

1. [Product Overview & Vision](#1-product-overview--vision)
2. [Core Philosophy: Darwinian Agent Pool](#2-core-philosophy-darwinian-agent-pool)
3. [System Architecture](#3-system-architecture)
4. [Bot DNA & Strategy Genome](#4-bot-dna--strategy-genome)
5. [Death Conditions & Replacement Engine](#5-death-conditions--replacement-engine)
6. [Self-Improvement: Vector DB Memory Layer](#6-self-improvement-vector-db-memory-layer)
7. [LLM Model Stack & Routing](#7-llm-model-stack--routing)
8. [Live News & Market Intelligence](#8-live-news--market-intelligence)
9. [Risk Management Engine](#9-risk-management-engine)
10. [BTC Compounding & Profit Conversion Engine](#10-btc-compounding--profit-conversion-engine)
11. [Execution Layer: Alpaca Integration](#11-execution-layer-alpaca-integration)
12. [Mobile App: Screen-by-Screen Specification](#12-mobile-app-screen-by-screen-specification)
13. [Data Models & Database Schema](#13-data-models--database-schema)
14. [Technical Stack](#14-technical-stack)
15. [Development Phases & Milestones](#15-development-phases--milestones)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Open Questions & Future Scope](#17-open-questions--future-scope)

---

## 1. Product Overview & Vision

### Product Identity

| Field | Value |
|---|---|
| Product Name | ATLAS — Autonomous Trading & Learning Agent System |
| Platform | React Native (Expo) — iOS & Android |
| Version | 1.0 (MVP) |
| Target User | Individual retail trader, any starting capital ($20–$10,000+) |
| Core Broker | Alpaca Markets — Crypto + US Equities |
| LLM Gateway | OpenRouter — single API key, multi-model routing |
| Memory Layer | Pinecone Vector DB (free tier) + SQLite on-device |
| North Star Goal | Compound any starting capital to 20 BTC |

### The Problem

Retail traders face three compounding disadvantages:

1. **Emotional decision-making** that overrides logic at the worst moments
2. **Static strategies** that fail when market regimes change and require manual intervention to fix
3. **No systematic learning** from past mistakes — the same errors repeat indefinitely

Traditional trading bots solve the first problem but not the second or third. They run fixed strategies until they stop working, then sit and bleed.

### The Solution

ATLAS deploys a **Darwinian pool of strategy bots** that compete, die, and evolve. Every trade is stored as a vector embedding — a semantic fingerprint of market conditions, signal logic, and outcome. When the system considers a new trade, it retrieves the most similar past situations and learns from them in real time. Underperforming bots are automatically replaced by Opus-generated successors optimised for the current market regime. The system genuinely improves over time without human intervention.

### Success Metrics

| Metric | Definition | Category |
|---|---|---|
| BTC Stack Growth | Total BTC accumulated increases month-over-month | Primary |
| Bot Survival Rate | Average bot lives >30 trades before elimination | Health |
| Learning Velocity | Win rate improves measurably after every 50 trades | Intelligence |
| Capital Preservation | Total portfolio drawdown never exceeds 20% | Safety |
| Self-Improvement Delta | Generation N+1 bots outperform Generation N on same regime | Evolution |
| News Reaction Speed | <90 seconds from news event to position adjustment | Responsiveness |

---

## 2. Core Philosophy: Darwinian Agent Pool

The central innovation of ATLAS is treating trading strategies as **living organisms** that compete, reproduce, and die. No strategy is permanently embedded in code. Every bot is a configuration — a genome — that can be generated, mutated, crossed over, or discarded entirely. The market is the selection pressure.

### Pool Configuration

> **Starting configuration:** 2 active bots + 1 probation slot. Pool scales automatically as capital grows.

| Capital Range | Pool Size | Allocation Split | Approx Per Bot |
|---|---|---|---|
| < $500 | 2 active + 1 probation | 50% / 50% | ~$125 each |
| $500–$1K | 2 active + 1 probation | 50% / 50% | ~$250 each |
| $1K–$2.5K | 3 active + 1 probation | 33% / 33% / 33% | ~$330 each |
| $2.5K–$5K | 4 active + 1 probation | 25% each | ~$625 each |
| > $5K | 5 active + 1 probation | 20% each | ~$1,000 each |

### Key Pool Rules

| Rule | Definition |
|---|---|
| Active Bots | 2 at launch, scaling to max 5 as capital grows |
| Probation Slot | 1 slot always reserved — new bots serve 20-trade probation at 50% allocation before full promotion |
| Capital Split | Active bots split available capital equally. Probation bot gets 50% of one active bot's share |
| Champion Protection | #1 ranked bot by 30-day Sharpe cannot be killed by triggers 1 or 2 — only by hard drawdown (trigger 3) |
| Regime Lock | If 2+ bots die within 24 hours, entire pool halts. No replacements until regime stabilises |
| Max Generations | No limit — the pool evolves indefinitely. Full genealogy tracked in vector DB forever |

### The Evolution Lifecycle

```
BIRTH     → Opus generates or mutates a Bot DNA genome
PROBATION → Bot trades with 50% allocation for 20 trades
PROMOTION → If probation passed: full allocation, active status
ACTIVE    → Bot trades, performance monitored continuously
WARNING   → 1 death trigger hit: push alert, 24h confirmation window
DEAD      → 2 of 3 triggers hit (or 1 trigger + 24h confirmation): terminated
ARCHIVED  → Full trade history + DNA stored in Pinecone tagged 'terminated'
REPLACED  → Opus analyses regime + archive, generates successor genome
           ↑__________________ CYCLE REPEATS ________________________________↑
```

---

## 3. System Architecture

### Layer Overview

| Layer | Technology | Responsibility |
|---|---|---|
| Mobile App | React Native (Expo) | UI, user controls, data visualisation |
| Broker | Alpaca SDK | Crypto + stock execution, positions, account data |
| LLM Gateway | OpenRouter | Opus for decisions, Haiku/Llama for tools |
| Vector Memory | Pinecone | Trade DNA storage, similarity search, RAG |
| Operational DB | SQLite (on-device) | Live positions, bot state, performance ledger |
| Key Storage | Expo SecureStore | Encrypted API key storage (hardware-backed) |
| News Engine | Alpaca News + CryptoPanic + RSS | Live market intelligence |
| Regime Brain | HMM / Rule-based proxy | Market regime detection — drives replacement strategy |
| Evolution Engine | Opus-powered | Bot generation, mutation, crossover |

### Trade Decision Pipeline

```
[Market Data + News Feed]
        |
        ↓
[HMM Regime Detector] ──── regime: BULL / BEAR / NEUTRAL / CRASH / EUPHORIA
        |
        ↓
[Each Active Bot] ──── reads own DNA genome
        |
   [Signal Generator] ──── technical indicators + entry rules
        |
   [Pinecone RAG Query] ──── find top-10 similar past trades
        |
   [Opus Decision Engine] ──── signal + RAG results + news context
        |                       decides: APPROVE / REJECT / MODIFY
        |
   [Risk Engine Gate] ──── hard rules, position sizing, correlation check
        |
   [Alpaca Execution] ──── order submitted
        |
   [Trade DNA Writer] ──── embed trade context → Pinecone
        |
   [Performance Ledger] ──── update bot stats → SQLite
        |
   [Death Check] ──── evaluate 3 kill conditions
        |
   [BTC Conversion Check] ──── route profit to BTC accumulation engine
```

---

## 4. Bot DNA & Strategy Genome

Every bot is fully defined by its **genome** — a JSON configuration object encoding all trading behaviour. Genomes can be created by Opus from scratch, mutated from a parent, or produced by crossing two parents. No strategy logic is hardcoded — it all flows from the genome.

### Full Genome Schema

```typescript
interface BotGenome {
  // Identity
  bot_id:          string;         // e.g. 'atlas_007'
  generation:      number;         // starts at 1, increments on lineage
  parent_ids:      string[];       // empty for Gen 1, 1-2 parents thereafter
  birth_timestamp: string;         // ISO 8601
  created_by:      'opus' | 'mutation' | 'crossover' | 'seed';

  // Asset Universe
  asset_universe:           string[];   // ['BTC/USD', 'ETH/USD', 'NVDA', ...]
  preferred_timeframe:      '1min' | '5min' | '15min' | '1h' | '4h' | '1d';
  max_concurrent_positions: number;     // 1–3

  // Entry Rules
  entry: {
    primary_signal:   SignalType;
    rsi_entry:        number;      // 10–40 for long, 60–90 for short
    volume_mult:      number;      // minimum volume vs 20-bar average
    vwap_deviation:   number;      // min % deviation from VWAP
    bb_squeeze:       boolean;     // require Bollinger squeeze before entry
    confluence_count: number;      // how many conditions must align (1–4)
    news_sentiment:   'positive' | 'neutral_or_positive' | 'any';
    min_confidence:   number;      // 0.0–1.0 from Opus scorer
  };

  // Exit Rules
  exit: {
    take_profit_rr:   number;     // risk:reward ratio e.g. 2.5
    stop_loss_pct:    number;     // e.g. 0.018 = 1.8%
    trail_after_pct:  number;     // activate trailing stop after X% profit
    trail_distance:   number;     // trailing stop distance in %
    max_hold_hours:   number;     // force close after N hours
    breakeven_at_pct: number;     // move stop to entry after X% profit
  };

  // Position Sizing
  sizing: {
    base_pct:           number;   // base % of bot allocation per trade
    confidence_scaling: boolean;  // scale size by Opus confidence score
    max_pct:            number;   // hard cap % of bot allocation (max 20%)
    kelly_enabled:      boolean;
  };

  // Regime Preferences
  regime_filters: {
    active_in:  RegimeType[];
    size_mult:  Record<RegimeType, number>;
  };
}

type SignalType =
  | 'momentum_breakout'
  | 'mean_reversion'
  | 'vwap_reversion'
  | 'bb_squeeze_break'
  | 'volume_spike'
  | 'news_momentum'
  | 'insider_follow'
  | 'gap_and_go'
  | 'orb';

type RegimeType = 'CRASH' | 'BEAR' | 'NEUTRAL' | 'BULL' | 'EUPHORIA';
```

### Seed Genomes (Generation 1)

The first two bots are pre-configured seeds — complementary by design so they perform across different regimes from day one.

| Bot ID | Nickname | Universe | Timeframe | Primary Signal | Active Regimes |
|---|---|---|---|---|---|
| atlas_001 | Momentum Hunter | BTC, ETH, NVDA | 15min | Breakout + volume spike | NEUTRAL, BULL, EUPHORIA |
| atlas_002 | Mean Reversion | BTC, ETH, large-caps | 1h | VWAP reversion + RSI oversold | NEUTRAL, mild BEAR |

---

## 5. Death Conditions & Replacement Engine

### The Three Death Triggers

> A bot is **FLAGGED** when it hits any 1 trigger. It is **TERMINATED** when it hits 2 of 3 triggers simultaneously, OR when 1 trigger persists through a 24-hour confirmation window. The Champion bot (#1 by 30-day Sharpe) is immune to triggers 1 and 2 — only trigger 3 kills it.

| # | Trigger | Threshold | Rationale |
|---|---|---|---|
| Trigger 1 | Consecutive Losses | 5 losses in a row | Strategy likely broken in current regime |
| Trigger 2 | Win Rate (rolling) | Below 40% over last 20 trades | Statistical failure — not just a bad streak |
| Trigger 3 | Capital Drawdown | -15% of bot's allocated capital | Hard money loss — overrides all protections |

### Replacement Engine: How Opus Decides

When a bot dies, Opus receives a structured context packet:

```typescript
const replacementContext = {
  dead_bot: {
    genome:         deadBot.genome,
    death_triggers: ['win_rate', 'consecutive_losses'],
    trade_count:    deadBot.tradeCount,
    final_pnl_pct:  deadBot.totalPnlPct,
    regime_at_death: currentRegime,
  },
  survivors: activeBots.map(b => ({
    genome:      b.genome,
    sharpe_30d:  b.sharpe30d,
    win_rate:    b.winRate,
    generation:  b.generation,
  })),
  current_regime:    hmm.currentRegime,
  regime_confidence: hmm.confidence,
  recent_failures:   vectorDB.queryFailedStrategies(regime, limit=20),
  recent_winners:    vectorDB.queryWinningStrategies(regime, limit=20),
  market_context:    newsEngine.getLatestDigest(),
};
```

Opus chooses one of three replacement strategies:

1. **MUTATE** — Take the best survivor, change 2–3 parameters (80% DNA preserved)
2. **CROSSOVER** — Blend entry rules from Survivor A with exit rules from Survivor B
3. **GENERATE** — Create an entirely new strategy optimised for the current regime

Opus returns a valid `BotGenome` JSON. No explanation. No markdown. Validated with zod before use.

### Post-Death Workflow

```
1.  Bot hits 2/3 death triggers
2.  Archive bot: full genome + trade history → Pinecone (tagged 'terminated')
3.  Alpaca: close all open positions for dead bot's capital segment
4.  Capital reclaimed → held in cash (not reassigned yet)
5.  Push notification: "Bot atlas_007 eliminated after 5 consecutive losses"
6.  Replacement Engine builds context packet
7.  Opus call: generates new BotGenome JSON
8.  New bot created: atlas_008, generation = dead_bot.generation + 1
9.  Probation mode: 50% allocation, 20-trade evaluation window
10. After 20 trades: auto-promote if win_rate > 45% AND profit_factor > 1.0
    Otherwise: kill probation bot, generate another replacement
```

---

## 6. Self-Improvement: Vector DB Memory Layer

The vector database is the long-term memory and learning engine of ATLAS. Every trade is stored as a rich semantic embedding. Before making any decision, the system queries Pinecone for the most similar past situations and uses those retrieved experiences as context for Opus. This is **Retrieval-Augmented Decision-Making**.

### Trade DNA Schema

```typescript
interface TradeDNA {
  // Pinecone metadata (filterable)
  trade_id:        string;
  bot_id:          string;
  bot_generation:  number;
  asset:           string;
  asset_class:     'crypto' | 'stock';
  direction:       'long' | 'short';
  signal_type:     SignalType;
  regime:          RegimeType;
  outcome:         'win' | 'loss' | 'breakeven';
  pnl_pct:         number;
  hold_duration_m: number;
  timestamp:       string;

  // Text block — this gets embedded into a vector
  embedding_text:  string;
  /*
  Example:
  "BTC/USD long entry. Regime: BULL (confidence 87%). RSI was 34 recovering
   from oversold. Price broke above 20-period VWAP by 0.6% on 2.1x average
   volume. BB squeeze had been forming for 4 bars. News: ETF inflow data
   positive, no major macro events next 6h. Opus confidence: 0.81.
   Entry: $67,420. Stop: $66,080 (-1.99%). Target: $70,780 (+4.98%).
   Outcome: WIN +3.2% in 94 minutes. Exit: take profit hit.
   What worked: volume confirmation was decisive. BB squeeze gave clean setup."
  */

  // Post-trade LLM reflection
  what_worked:     string | null;
  what_failed:     string | null;
  rule_update:     string | null;  // genome mutation candidate
  avoid_next_time: string | null;
}
```

### RAG Decision Flow (Pre-Trade)

```
1. Bot generates signal: BTC/USD long, momentum breakout, 15min
2. Build query text from current conditions
3. Embed query text → OpenAI text-embedding-3-small
4. Pinecone query: top_k=10, filter={asset:'BTC/USD', direction:'long'}
5. Returns 10 most similar past trades with full context + outcomes
6. Opus receives:
   - Current signal details
   - 10 similar past trades (wins/losses/what worked/what failed)
   - Current news digest
   - Current regime + bot DNA
7. Opus decides: APPROVE / REJECT / MODIFY position size
8. Decision + reasoning logged to SQLite
9. Trade executed (if approved) → new TradeDNA written to Pinecone
```

### Post-Trade Reflection (Sonnet — After Every Close)

```typescript
const reflectionPrompt = `
Trade closed: ${asset} ${direction}
Entry: $${entry}  Exit: $${exit}  P&L: ${pnl_pct}%  Duration: ${duration}min
Signal conditions at entry: ${entry_conditions}
Outcome: ${outcome}

The 3 most similar past trades were:
${similar_trades}

In 4 sentences max, answer:
1. What was the single most important factor that determined the outcome?
2. What should this bot do differently next time in similar conditions?
3. Should any genome parameter change? If yes, which one and how?
4. One-line summary for the trade log.

Return JSON: { what_worked, what_failed, rule_update, avoid_next_time, summary }
`;

// If rule_update is not null:
// → Queue genome mutation for review
// → If same rule_update appears 3+ times → auto-apply to genome
// → Snapshot previous genome for rollback
```

### Rollback Mechanism

> ⚠️ Every genome mutation creates a versioned snapshot in SQLite (`genome_mutations` table). If win rate drops >10% over the next 15 trades after any mutation, the system **auto-reverts** to the pre-mutation genome. Prevents bad updates from cascading.

---

## 7. LLM Model Stack & Routing

All LLM calls route through **OpenRouter** using a single API key stored in Expo SecureStore. The routing principle: use the most capable model only when the stakes justify it. Real money decisions get Opus. Summaries and tool calls get free or near-free models.

### Model Assignment

| Task | Model | Est. Cost | Tier |
|---|---|---|---|
| Trade final decision | Claude Opus | ~$0.075/call | PREMIUM |
| Bot genome generation | Claude Opus | ~$0.15/call | PREMIUM |
| Weekly strategy review | Claude Opus | ~$0.20/call | PREMIUM |
| Post-trade reflection | Claude Sonnet | ~$0.015/call | MID |
| Genome mutation logic | Claude Sonnet | ~$0.015/call | MID |
| News sentiment digest | Claude Haiku | ~$0.002/call | CHEAP |
| Signal confidence score | Claude Haiku | ~$0.002/call | CHEAP |
| Log summaries | Llama 3.1 8B (free) | $0.000 | FREE |
| Calendar parsing | Llama 3.1 8B (free) | $0.000 | FREE |
| Trade DNA text generation | Llama 3.1 8B (free) | $0.000 | FREE |
| Vector embeddings | text-embedding-3-small | ~$0.0001/call | NEAR FREE |

### Monthly Cost Estimate

| Task | Volume | Cost/Call | Monthly |
|---|---|---|---|
| Trade decisions (Opus) | 3–5/day × 22 | $0.075 | ~$5–$8 |
| Bot replacements (Opus) | ~2/month | $0.15 | ~$0.30 |
| Post-trade reflections (Sonnet) | 3–5/day × 22 | $0.015 | ~$1–$1.65 |
| News digests (Haiku) | 12/day × 22 | $0.002 | ~$0.53 |
| Signal scoring (Haiku) | 15/day × 22 | $0.002 | ~$0.66 |
| Free model calls (Llama) | Unlimited | $0 | $0 |
| Embeddings | 10/day × 22 | $0.0001 | ~$0.02 |
| **TOTAL** | | | **~$7–$12/month** |

> ✓ Even at maximum trade volume, LLM costs stay under $12/month.

---

## 8. Live News & Market Intelligence

News is a leading indicator. The ATLAS News Engine runs continuously, aggregating signals from multiple sources, classifying them by asset and sentiment, and feeding structured digests to the LLM decision layer.

### News Sources

| Source | Description | Coverage | Cost |
|---|---|---|---|
| Alpaca News API | Built-in, pre-tagged by ticker | Stocks, macro | Free |
| CryptoPanic API | 100+ crypto sources, pre-scored sentiment | Crypto | Free (50 req/day) |
| NewsAPI.org | Financial and economic headlines | Macro, stocks | Free (100 req/day) |
| RSS (Reuters/FT) | Scraped every 30 min | Macro | Free |
| Finnhub Free Tier | Earnings calendar, economic events | Stocks, macro | Free |
| CNN Fear & Greed | Market sentiment index | Crypto, overall | Free |

### News Processing Pipeline

```
Every 15 minutes (continuous):
  1. Fetch from all sources
  2. Deduplicate by headline similarity
  3. Haiku classifies each item:
     → asset: ['BTC','ETH','NVDA','macro','crypto_broad','stock_broad']
     → sentiment: 'strong_bullish'|'bullish'|'neutral'|'bearish'|'strong_bearish'
     → urgency: 'breaking'|'normal'|'background'
     → trade_relevant: true|false
  4. Build NewsDigest for each active bot's asset universe
  5. Store in SQLite news_events table
  6. If urgency == 'breaking' AND trade_relevant == true:
     → Immediate interrupt: pause pending orders
     → Opus evaluates: 'does this change any open position thesis?'
     → Push notification to app

Before each trade decision:
  → Bot receives last-4h NewsDigest filtered to its asset universe
  → Opus reads digest as part of decision context

Hard rules from news:
  → Never open position within 30min of scheduled high-impact macro event
  → Auto-close positions if 'strong_bearish' breaking news hits open position asset
  → Earnings within 48h (stocks): block all new long entries
```

### NewsDigest Schema

```typescript
interface NewsDigest {
  generated_at:   string;
  lookback_hours: number;
  asset_filter:   string[];
  overall_tone:   SentimentType;
  items: Array<{
    headline:    string;
    source:      string;
    asset:       string;
    sentiment:   SentimentType;
    urgency:     'breaking' | 'normal' | 'background';
    published_at: string;
  }>;
  high_impact_events_next_4h: Array<{
    event:  string;   // 'CPI Release', 'Fed Meeting', etc.
    time:   string;
    impact: 'high' | 'medium' | 'low';
  }>;
  trade_recommendation: 'proceed' | 'caution' | 'avoid';
  reasoning: string;  // 1 sentence from Haiku
}
```

---

## 9. Risk Management Engine

> ⚠️ **Risk rules are implemented in TypeScript, not prompt instructions. No LLM output can override them. They execute before any order reaches Alpaca.**

### Hard Rules (Immutable)

| Rule | Definition |
|---|---|
| STOP LOSS MANDATORY | Every trade must have a stop_loss. Trades without one are auto-rejected at code level |
| MAX 20% PER TRADE | No single trade may use more than 20% of the bot's allocated capital. Dynamically capped: `confidence × 20%` |
| 1% PORTFOLIO RISK RULE | Stop-loss hit on any trade = max 1% of total portfolio loss. Position sized accordingly |
| DAILY LOSS LIMIT | If total portfolio drops >5% in one day, all bots halt for rest of day. Positions held, no new entries |
| TOTAL DRAWDOWN LIMIT | If portfolio drops >20% from all-time-high, ALL trading halts. Requires manual resume in app |
| CORRELATION GUARD | If two open positions have >0.80 rolling correlation, reject any signal increasing exposure to that correlated move |
| CRASH REGIME LOCK | HMM CRASH regime: zero new positions. Existing positions protected by trailing stops only |
| EARNINGS BLACKOUT | No new stock positions within 48 hours of scheduled earnings. Checked against Finnhub on every signal |
| BREAKING NEWS PAUSE | Strong bearish breaking news on open position asset: Opus evaluates within 60 seconds whether to close |

### Confidence-Gated Position Sizing

| Confidence Score | Label | Max Position Size | Rationale |
|---|---|---|---|
| < 0.50 | Signal rejected | 0% | Below minimum threshold |
| 0.50–0.64 | Micro position | 5% | Weak conviction |
| 0.65–0.74 | Small position | 10% | Moderate conviction |
| 0.75–0.84 | Normal position | 15% | Good conviction |
| 0.85–1.00 | Full position | 20% | High conviction — hard cap |

### Market Regime → Size Multiplier

| Regime | Size Multiplier | Trading Behaviour |
|---|---|---|
| CRASH | 0% | No new positions at all |
| BEAR | 25% | Severely reduced, short-bias only |
| NEUTRAL | 75% | Slightly reduced, mean-reversion favoured |
| BULL | 100% | Full size, momentum favoured |
| EUPHORIA | 50% | Reduced — watch for reversal |

---

## 10. BTC Compounding & Profit Conversion Engine

Every dollar of profit is working toward the 20 BTC goal. The conversion engine runs after every closed profitable trade, not just at end of day. It is regime-aware and price-aware.

### Conversion Rules

| Rule | Definition |
|---|---|
| 80/20 Split | Every profitable trade close: 80% of profit → BTC conversion queue. 20% → added back to bot's trading capital |
| Conversion Timing | Not end-of-day. Engine watches for BTC intraday dips >0.8% within a 4-hour window and converts during dips |
| Regime Awareness | BTC CRASH regime: hold profits in USDC. Queue accumulates and converts when regime shifts to NEUTRAL+ |
| Minimum Convert Size | $5 minimum per conversion to avoid fees eating the gain |
| BTC Stack Tracking | Every BTC purchase logged: price, amount, date, source trade. Full audit trail in SQLite |
| 20 BTC Progress | Total BTC accumulated tracked in real-time. Progress bar is the hero element of the Home screen |
| No Conversion on Loss | Only profit triggers conversion. Losing trades affect bot capital only, never the BTC stack |

### Profit Lock: Daily High-Water Mark

```typescript
const profitLock = (dayStartValue: number, currentValue: number) => {
  const dayGainPct = (currentValue - dayStartValue) / dayStartValue;
  if (dayGainPct <= 0) return;  // no lock on losing days

  // Protect 70% of gains — never give back more than 30% of day's peak profit
  const lockFloor = dayStartValue + (currentValue - dayStartValue) * 0.70;

  // Tighten all open position stops so portfolio can't fall below lockFloor
  activeBots.forEach(bot => {
    bot.openPositions.forEach(pos => {
      pos.dynamicStopFloor = lockFloor;
    });
  });
};
```

---

## 11. Execution Layer: Alpaca Integration

### Why Alpaca

| Feature | Detail |
|---|---|
| Zero Commission | 0% on stocks AND crypto — every fee matters at small capital |
| Fractional Shares | Buy $10 of NVDA or $25 of BTC — perfect for sub-$500 capital |
| Single Account | One API, one account — covers both crypto and US equities |
| Paper Trading | Full paper environment with identical API — mandatory before live |
| Crypto Coverage | BTC, ETH, SOL, AVAX, LINK, DOGE and more |
| WebSocket Streaming | Real-time price feeds — crypto 24/7, stocks during market hours |

### Key API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /v2/account` | Account equity, buying power, portfolio value |
| `GET /v2/positions` | All open positions across crypto + stocks |
| `POST /v2/orders` | Submit market, limit, stop, trailing-stop orders |
| `DELETE /v2/orders/{id}` | Cancel pending order |
| `GET /v2/assets/{symbol}` | Asset metadata, tradability check |
| `GET /v2/stocks/{sym}/bars` | OHLCV historical bars — stocks |
| `GET /v1beta3/crypto/bars` | OHLCV historical bars — crypto |
| `WSS crypto stream` | Real-time crypto price feed (24/7) |
| `WSS stocks stream` | Real-time stock feed (market hours only) |
| `GET /v1beta1/news` | Alpaca News API — free with account |

### Order Types Per Strategy

| Strategy | Order Types |
|---|---|
| Momentum Breakout | Limit entry, Stop-limit (stop), Limit (take profit) |
| Mean Reversion | Limit entry at VWAP, Trailing stop (exit) |
| News Momentum | Market order (speed critical), Hard stop-limit |
| Gap & Go | Market order at open, OCO (stop + target) immediately after fill |
| BTC Conversion | Market order (small size, acceptable slippage) |

---

## 12. Mobile App: Screen-by-Screen Specification

> **Design philosophy:** Data-rich dashboard. Every number visible on screen should be actionable or informative. Dark theme throughout. Bloomberg-meets-mobile.

### Screen 1: Home — Mission Control

- **20 BTC Progress Bar** (hero element) — animated, shows `X.XXXX BTC / 20 BTC` with % complete
- Total Portfolio Value — large number, green/red delta vs yesterday
- Today's P&L — dollar + percentage, colour coded
- Active Bots mini-cards (2–5) — name, status dot, today's P&L, win/loss streak
- Live Regime Badge — BULL / BEAR / NEUTRAL / CRASH / EUPHORIA with confidence %
- News pulse — scrolling ticker of last 3 classified news items with sentiment colour
- BTC Price widget — live price + 24h change
- Quick stats row: Total trades today | Win rate today | Largest win | Largest loss

### Screen 2: Bot Arena

- Full-width cards for each bot — expandable on tap
- Bot card shows: Name, Generation, Age (days alive), Strategy type, Win rate, Sharpe, P&L
- **Health bar** — composite score of win rate + profit factor + drawdown. Colour shifts red as death approaches
- Death trigger indicators — 3 small icons, each turns amber/red when that trigger is approaching
- Probation badge — `PROBATION: 14/20 trades` for new bots
- Champion crown icon on #1 ranked bot
- Genealogy button — tap to see bot's full ancestry tree
- **Hall of Fame tab** — all terminated bots sorted by longevity + total P&L
- **Kill Feed** — scrolling log of recent deaths and replacements with reason

### Screen 3: Trade Feed

- Chronological list of all trades across all bots
- Trade card: asset, direction badge (LONG/SHORT), bot name, entry/exit prices, P&L badge, duration
- Tap to expand: full Opus reasoning for why trade was taken
- Similar past trades section — the 3 RAG results Opus used in the decision
- Post-trade reflection — Sonnet's analysis of what worked/failed
- Filter bar: by bot, by asset, by outcome, by date range
- Portfolio equity curve chart with regime bands overlaid as colour fills

### Screen 4: Intelligence — News & Regime

- Current Regime card — large, with HMM confidence %, stability indicator, size multiplier
- Regime history chart — past 30 days of regime transitions
- Live News Feed — classified items with sentiment badges, filterable by asset
- Fear & Greed Index gauge — live CNN index with history
- Economic Calendar — next 7 days, high/medium/low impact events, countdown timers
- News impact log — which items caused Opus to change or cancel a trade

### Screen 5: BTC Stack

- Large BTC amount display with USD equivalent
- **20 BTC progress bar** — detailed view with milestones: 0.1 / 0.5 / 1 / 5 / 10 / 20 BTC
- Accumulation chart — BTC owned over time (area chart)
- Average cost basis — weighted average buy price
- Conversion history — every profit-to-BTC conversion with source trade
- Milestone celebrations — animated confetti when hitting 0.1, 0.5, 1 BTC etc.

### Screen 6: Settings & Control

- **API Keys** — OpenRouter key + Alpaca key entry, masked display, SecureStore encrypted
- **Trading Mode toggle** — PAPER / LIVE with confirmation modal before switching to LIVE
- Risk controls — view all hard limits, toggle daily loss halt
- **Emergency Stop All** — halts all bots, closes all positions immediately (single red button)
- Bot pool config — adjust max pool size as capital grows
- News sources — enable/disable individual sources
- Notification preferences — which events trigger push alerts
- Export — download full trade history as CSV

---

## 13. Data Models & Database Schema

### SQLite Tables (On-Device)

```sql
CREATE TABLE bots (
  id                  TEXT PRIMARY KEY,
  generation          INTEGER DEFAULT 1,
  parent_ids          TEXT,              -- JSON array
  genome              TEXT NOT NULL,     -- JSON BotGenome
  status              TEXT DEFAULT 'probation', -- probation|active|champion|dead
  allocation_pct      REAL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  died_at             TIMESTAMP,
  death_reasons       TEXT,              -- JSON array
  total_trades        INTEGER DEFAULT 0,
  win_count           INTEGER DEFAULT 0,
  loss_count          INTEGER DEFAULT 0,
  total_pnl_usd       REAL DEFAULT 0,
  current_drawdown    REAL DEFAULT 0,
  sharpe_30d          REAL,
  consecutive_losses  INTEGER DEFAULT 0
);

CREATE TABLE trades (
  id               TEXT PRIMARY KEY,
  bot_id           TEXT REFERENCES bots(id),
  asset            TEXT NOT NULL,
  asset_class      TEXT,                -- crypto|stock
  direction        TEXT,                -- long|short
  signal_type      TEXT,
  entry_price      REAL,
  exit_price       REAL,
  quantity         REAL,
  stop_loss        REAL NOT NULL,
  take_profit      REAL,
  pnl_usd          REAL,
  pnl_pct          REAL,
  regime           TEXT,
  hmm_confidence   REAL,
  opus_confidence  REAL,
  opus_reasoning   TEXT,
  news_digest_id   TEXT,
  pinecone_id      TEXT,
  what_worked      TEXT,
  what_failed      TEXT,
  rule_update      TEXT,
  status           TEXT DEFAULT 'open',
  opened_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at        TIMESTAMP
);

CREATE TABLE btc_stack (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  btc_amount        REAL NOT NULL,
  usd_spent         REAL NOT NULL,
  btc_price_at_buy  REAL NOT NULL,
  source_trade_id   TEXT,
  purchased_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genome_mutations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id            TEXT,
  mutation_type     TEXT,               -- 'auto'|'manual'
  genome_before     TEXT,               -- JSON snapshot for rollback
  genome_after      TEXT,
  trigger_reason    TEXT,
  performance_delta REAL,               -- win rate change post-mutation
  rolled_back       INTEGER DEFAULT 0,
  applied_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE news_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  headline        TEXT,
  source          TEXT,
  asset           TEXT,
  sentiment       TEXT,
  urgency         TEXT,
  trade_relevant  INTEGER,
  influenced_trade TEXT,               -- trade_id if news affected a decision
  published_at    TIMESTAMP,
  classified_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Pinecone Vector DB (Cloud)

```typescript
// Index configuration
const indexConfig = {
  name:      'atlas-trade-memory',
  dimension: 1536,             // text-embedding-3-small
  metric:    'cosine',
  spec: { serverless: { cloud: 'aws', region: 'us-east-1' } }
  // Free tier: 1 index, 100,000 vectors
  // 100k vectors = years of trading history at 3-5 trades/day
};

// Filterable metadata per vector
interface PineconeMetadata {
  trade_id:       string;
  bot_id:         string;
  bot_generation: number;
  asset:          string;
  asset_class:    'crypto' | 'stock';
  direction:      'long' | 'short';
  signal_type:    string;
  regime:         string;
  outcome:        'win' | 'loss' | 'breakeven';
  pnl_pct:        number;
  bot_status:     'active' | 'terminated';
  timestamp:      string;
}
```

---

## 14. Technical Stack

| Technology | Purpose | Category |
|---|---|---|
| React Native (Expo) | Mobile app — iOS + Android from one codebase | Framework |
| TypeScript | All application code | Language |
| Expo SecureStore | Hardware-backed encrypted API key storage | Security |
| SQLite (expo-sqlite) | On-device relational DB | Data |
| Pinecone JS SDK | Vector DB client — trade DNA + RAG | Memory |
| OpenAI SDK | Used for OpenRouter calls (OpenAI-compatible) | LLM |
| Alpaca JS SDK | Broker integration — orders, positions, data | Execution |
| Victory Native | Charts — portfolio curve, bot health, BTC stack | Charts |
| React Query | Async data fetching, caching, background refresh | State |
| Zustand | Global app state — bot pool, positions, regime | State |
| Expo Notifications | Push notifications for kills, alerts, milestones | Alerts |
| dayjs | Date/time — market hours, session detection | Utils |
| zod | Runtime schema validation for all LLM JSON responses | Safety |

### Why No Backend Server

ATLAS is intentionally serverless from the user's perspective. All computation runs on-device or via third-party APIs. Expo SecureStore provides hardware-backed encryption equivalent to iOS Keychain / Android Keystore.

**The trade-off:** If the phone is offline, the bot pauses. This is acceptable — it also prevents runaway trading during connectivity loss, which is a safety feature.

---

## 15. Development Phases & Milestones

### Phase 1: Foundation (Weeks 1–3)

- [ ] Expo project setup, TypeScript config, navigation structure
- [ ] Alpaca SDK integration — paper account, fetch positions, place test orders
- [ ] OpenRouter integration — test all model tiers, verify SecureStore key storage
- [ ] SQLite schema creation + migration system
- [ ] Pinecone index creation + basic vector write/read
- [ ] Regime detection — rule-based proxy (VIX levels + price trend) for V1
- [ ] Home screen with live Alpaca data

### Phase 2: Bot Engine (Weeks 4–6)

- [ ] Bot DNA schema + genome validator (zod)
- [ ] Seed genome creation (atlas_001 and atlas_002)
- [ ] Signal generators: momentum breakout, mean reversion, VWAP reversion
- [ ] Death trigger monitoring — 3 conditions, 24h confirmation window
- [ ] Replacement Engine — Opus prompt + genome parser + zod validation
- [ ] Probation system — 20-trade window, auto-promote/kill logic
- [ ] Bot Arena screen with live data

### Phase 3: Intelligence Layer (Weeks 7–9)

- [ ] News Engine — all sources, Haiku classifier, NewsDigest builder
- [ ] Trade DNA writer — embedding generation, Pinecone upsert
- [ ] RAG query — pre-trade similarity search, top-10 retrieval
- [ ] Full Opus decision prompt with RAG context + news digest
- [ ] Post-trade reflection — Sonnet analysis, SQLite storage
- [ ] Genome mutation system + rollback mechanism
- [ ] Trade Feed screen — full Opus reasoning visible per trade

### Phase 4: Risk & Compounding (Weeks 10–11)

- [ ] Full risk engine — all 9 hard rules in TypeScript
- [ ] Confidence-gated position sizing
- [ ] BTC conversion engine — dip-aware, regime-aware, 80/20 split
- [ ] Profit lock — daily high-water mark protection
- [ ] Daily loss halt + total drawdown circuit breaker
- [ ] BTC Stack screen with progress bar and milestone celebrations

### Phase 5: Polish & Launch (Weeks 12–14)

- [ ] Intelligence screen — regime history, news feed, F&G gauge
- [ ] Settings screen — all controls, Emergency Stop button
- [ ] Push notifications — kills, milestones, risk alerts
- [ ] Paper trading for minimum 30 days
- [ ] Performance validation vs acceptance criteria
- [ ] Live trading switch — guarded by confirmation modal
- [ ] App Store + Play Store submission

---

## 16. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Trade decision pipeline (signal → Opus → risk → order) completes in <10 seconds |
| Performance | App UI renders with <100ms response on user interaction |
| Performance | News digest refresh every 15 minutes including background |
| Reliability | Zero lost trades — all orders logged before submission, reconciled after |
| Reliability | App crash does not leave orphaned open positions — recovery on relaunch |
| Reliability | If Alpaca unreachable: pause trading, notify user, retry with exponential backoff |
| Security | API keys stored in Expo SecureStore only — never in AsyncStorage, never logged |
| Security | All LLM prompts sanitised — no API keys or secrets in prompt text |
| Security | Genome JSON validated with zod before any execution — no code injection via LLM |
| Observability | Every Opus decision logged with full prompt context to SQLite |
| Observability | Every trade has complete audit trail: signal → RAG → decision → execution → outcome |
| Compatibility | iOS 16+ and Android 13+ minimum |
| Offline | App remains viewable offline. Trading pauses gracefully. Auto-resumes on reconnect |

---

## 17. Open Questions & Future Scope

### Open Questions (Require Decisions Before Build)

**HMM Implementation**
Running a true Hidden Markov Model requires Python (hmmlearn has no JS port). Options: (a) pure rule-based regime proxy using VIX levels + price trend for V1, add real HMM via lightweight Python microservice for V2, or (b) use a cloud function. **Recommendation: rule-based proxy for MVP.**

**Background Execution (Critical)**
iOS kills background apps after ~30 seconds. A trading bot needs to run continuously. Options: (a) Expo Background Fetch (limited, 15-minute intervals — may miss fast moves), (b) a lightweight free-tier worker on Render.com that triggers the phone via push notification. **This needs an architecture decision before Phase 1 begins.**

**Short Selling Stocks**
Alpaca requires a margin account for shorting. Paper accounts support it. Live accounts need approval. **Design for long-only initially; add short as V2 upgrade.**

**Genome Complexity Cap**
Strategies can grow arbitrarily complex over many generations — too many rules = overfitting to past data. A complexity budget is needed. **Recommendation: max 8 entry conditions, max 4 exit conditions, enforced by zod schema.**

### Future Scope (Post-MVP)

| Feature | Description |
|---|---|
| V2: True HMM Brain | Replace rule-based regime proxy with full Gaussian HMM trained on SPY/BTC data |
| V2: Options Strategies | Alpaca supports options. Covered calls + protective puts as standalone bot strategies |
| V2: Social Sentiment | Crypto Twitter/X sentiment via API as additional news engine source |
| V2: Multi-Device Sync | Supabase free tier to sync bot state across phone + tablet |
| V3: Autonomous Backtesting | Bots generate and backtest their own successor strategies before deployment |
| V3: On-Device Small LLM | 1–3B parameter model on-device for signal scoring. Eliminate Haiku costs entirely |
| V3: Inter-Bot Signalling | Bots share signals — if 2 bots independently flag same asset, position size increases |
| V3: Forex via OANDA | Add OANDA as third broker for EUR/USD, GBP/USD, USD/JPY during relevant sessions |

---

*ATLAS PRD v1.0 · Autonomous Trading & Learning Agent System*
*Paper trade first. Let the bots earn the right to your capital.*
