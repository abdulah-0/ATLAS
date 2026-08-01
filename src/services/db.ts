import * as SQLite from 'expo-sqlite';
import { StoredForecast } from '../types/kronos';
import { LogEvent } from '../types/logs';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('atlas.db');
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Create bots table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bots (
      id                  TEXT PRIMARY KEY,
      generation          INTEGER DEFAULT 1,
      parent_ids          TEXT,
      genome              TEXT NOT NULL,
      status              TEXT DEFAULT 'probation',
      allocation_pct      REAL,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      died_at             TIMESTAMP,
      death_reasons       TEXT,
      total_trades        INTEGER DEFAULT 0,
      win_count           INTEGER DEFAULT 0,
      loss_count          INTEGER DEFAULT 0,
      total_pnl_usd       REAL DEFAULT 0,
      current_drawdown    REAL DEFAULT 0,
      sharpe_30d          REAL,
      consecutive_losses  INTEGER DEFAULT 0
    );
  `);

  // Create trades table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trades (
      id               TEXT PRIMARY KEY,
      bot_id           TEXT REFERENCES bots(id),
      asset            TEXT NOT NULL,
      asset_class      TEXT,
      direction        TEXT,
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
      bull_case        TEXT,
      bear_case        TEXT,
      risk_flags       TEXT,
      kronos_alignment TEXT,
      news_digest_id   TEXT,
      pinecone_id      TEXT,
      what_worked      TEXT,
      what_failed      TEXT,
      rule_update      TEXT,
      status           TEXT DEFAULT 'open',
      opened_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at        TIMESTAMP
    );
  `);

  // Create btc_stack table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS btc_stack (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      btc_amount        REAL NOT NULL,
      usd_spent         REAL NOT NULL,
      btc_price_at_buy  REAL NOT NULL,
      source_trade_id   TEXT,
      purchased_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create genome_mutations table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS genome_mutations (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id            TEXT,
      mutation_type     TEXT,
      genome_before     TEXT,
      genome_after      TEXT,
      trigger_reason    TEXT,
      performance_delta REAL,
      rolled_back       INTEGER DEFAULT 0,
      applied_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create news_events table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS news_events (
      id            TEXT PRIMARY KEY,
      asset         TEXT,
      headline      TEXT NOT NULL,
      sentiment     TEXT,
      impact_score  REAL,
      published_at  TIMESTAMP
    );
  `);

  // Create kronos_forecasts table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kronos_forecasts (
      id                   TEXT PRIMARY KEY,
      trade_id             TEXT,
      bot_id               TEXT,
      asset                TEXT NOT NULL,
      timeframe            TEXT NOT NULL,
      direction            TEXT NOT NULL,
      direction_confidence REAL,
      predicted_change_pct REAL,
      predicted_high_pct   REAL,
      predicted_low_pct    REAL,
      volatility_regime    TEXT,
      volatility_score     REAL,
      forecast_confidence  REAL,
      path_agreement       REAL,
      model_used           TEXT,
      bars_used            INTEGER,
      actual_change_pct    REAL,
      was_correct          INTEGER,
      requested_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at         TIMESTAMP,
      latency_ms           INTEGER
    );
  `);

  // Create ohlcv_cache table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ohlcv_cache (
      asset       TEXT NOT NULL,
      timeframe   TEXT NOT NULL,
      timestamp   TEXT NOT NULL,
      open        REAL NOT NULL,
      high        REAL NOT NULL,
      low         REAL NOT NULL,
      close       REAL NOT NULL,
      volume      REAL,
      PRIMARY KEY (asset, timeframe, timestamp)
    );
  `);

  // Create trim_ohlcv_cache trigger
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS trim_ohlcv_cache AFTER INSERT ON ohlcv_cache
    BEGIN
      DELETE FROM ohlcv_cache
      WHERE asset = NEW.asset AND timeframe = NEW.timeframe
        AND timestamp NOT IN (
          SELECT timestamp FROM ohlcv_cache
          WHERE asset = NEW.asset AND timeframe = NEW.timeframe
          ORDER BY timestamp DESC LIMIT 500
        );
    END;
  `);

  // Create log_events table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS log_events (
      id          TEXT PRIMARY KEY,
      timestamp   TIMESTAMP NOT NULL,
      level       TEXT NOT NULL,
      category    TEXT NOT NULL,
      bot_id      TEXT,
      trade_id    TEXT,
      asset       TEXT,
      title       TEXT NOT NULL,
      detail      TEXT,
      metadata    TEXT,
      is_read     INTEGER DEFAULT 0
    );
  `);

  // Create trim_log_events trigger
  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS trim_log_events AFTER INSERT ON log_events
    BEGIN
      DELETE FROM log_events
      WHERE id NOT IN (SELECT id FROM log_events ORDER BY timestamp DESC LIMIT 2000);
    END;
  `);

  // Create kronos_accuracy view
  await db.execAsync(`
    CREATE VIEW IF NOT EXISTS kronos_accuracy AS
    SELECT
      asset,
      timeframe,
      model_used,
      COUNT(*) AS total_forecasts,
      SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) AS correct,
      ROUND(100.0 * SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS accuracy_pct,
      ROUND(AVG(latency_ms), 0) AS avg_latency_ms
    FROM kronos_forecasts
    WHERE was_correct IS NOT NULL
    GROUP BY asset, timeframe, model_used;
  `);
}

export const dbOperations = {
  async getActiveBots(): Promise<any[]> {
    const db = await getDb();
    return db.getAllAsync(`SELECT * FROM bots WHERE status != 'dead' ORDER BY created_at DESC`);
  },

  async getTrades(): Promise<any[]> {
    const db = await getDb();
    return db.getAllAsync(`SELECT * FROM trades ORDER BY opened_at DESC LIMIT 50`);
  },

  async insertTrade(t: any): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO trades 
       (id, bot_id, asset, asset_class, direction, signal_type, entry_price, stop_loss, take_profit, quantity, regime, hmm_confidence, opus_confidence, opus_reasoning, bull_case, bear_case, risk_flags, kronos_alignment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t.id,
      t.bot_id,
      t.asset,
      t.asset_class,
      t.direction,
      t.signal_type,
      t.entry_price,
      t.stop_loss,
      t.take_profit ?? null,
      t.quantity,
      t.regime,
      t.hmm_confidence,
      t.opus_confidence,
      t.opus_reasoning,
      t.bull_case ?? null,
      t.bear_case ?? null,
      t.risk_flags ?? null,
      t.kronos_alignment ?? null
    );
  },

  async closeTrade(tradeId: string, exitPrice: number, pnlUsd: number, pnlPct: number, whatWorked: string | null, whatFailed: string | null, ruleUpdate: string | null): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE trades
       SET status = 'closed', exit_price = ?, pnl_usd = ?, pnl_pct = ?, what_worked = ?, what_failed = ?, rule_update = ?, closed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      exitPrice,
      pnlUsd,
      pnlPct,
      whatWorked,
      whatFailed,
      ruleUpdate,
      tradeId
    );
  },

  async insertNewsEvents(events: any[]): Promise<void> {
    const db = await getDb();
    for (const e of events) {
      await db.runAsync(
        `INSERT OR IGNORE INTO news_events (id, asset, headline, sentiment, impact_score, published_at) VALUES (?, ?, ?, ?, ?, ?)`,
        e.id,
        e.asset,
        e.headline,
        e.sentiment,
        e.impact_score,
        e.published_at
      );
    }
  },

  async getBtcStackTotal(): Promise<number> {
    const db = await getDb();
    const result = await db.getFirstAsync<{ total: number }>(`SELECT SUM(btc_amount) as total FROM btc_stack`);
    return result?.total ?? 0;
  },

  async logBtcPurchase(btcAmount: number, usdSpent: number, btcPrice: number, tradeId: string | null): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO btc_stack (btc_amount, usd_spent, btc_price_at_buy, source_trade_id) VALUES (?, ?, ?, ?)`,
      btcAmount,
      usdSpent,
      btcPrice,
      tradeId
    );
  },

  async logKronosForecast(f: StoredForecast): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO kronos_forecasts 
       (id, trade_id, asset, timeframe, direction, direction_confidence, predicted_change_pct, volatility_regime, forecast_confidence, requested_at, responded_at, latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      f.id,
      f.trade_id ?? null,
      f.asset,
      f.timeframe,
      f.direction,
      f.direction_confidence,
      f.predicted_change_pct,
      f.volatility_regime,
      f.forecast_confidence,
      f.requested_at,
      f.responded_at,
      f.latency_ms
    );
  },

  async getKronosAccuracy(): Promise<any[]> {
    const db = await getDb();
    return db.getAllAsync(`SELECT * FROM kronos_accuracy`);
  },

  async insertLogEvent(e: LogEvent): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO log_events (id, timestamp, level, category, bot_id, trade_id, asset, title, detail, metadata, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      e.id,
      e.timestamp,
      e.level,
      e.category,
      e.bot_id ?? null,
      e.trade_id ?? null,
      e.asset ?? null,
      e.title,
      e.detail ?? null,
      e.metadata ? JSON.stringify(e.metadata) : null,
      e.is_read ? 1 : 0
    );
  },

  async getLogEvents(limit = 100): Promise<LogEvent[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(`SELECT * FROM log_events ORDER BY timestamp DESC LIMIT ?`, limit);
    return rows.map(r => ({
      ...r,
      is_read: Boolean(r.is_read),
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    }));
  },

  async markAllLogsRead(): Promise<void> {
    const db = await getDb();
    await db.runAsync(`UPDATE log_events SET is_read = 1 WHERE is_read = 0`);
  },
};
