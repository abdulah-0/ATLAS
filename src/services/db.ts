import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await SQLite.openDatabaseAsync('atlas.db');
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL journal mode and foreign keys
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Create bots table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bots (
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
  `);

  // Create trades table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trades (
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
      mutation_type     TEXT,               -- 'auto'|'manual'
      genome_before     TEXT,               -- JSON snapshot for rollback
      genome_after      TEXT,
      trigger_reason    TEXT,
      performance_delta REAL,               -- win rate change post-mutation
      rolled_back       INTEGER DEFAULT 0,
      applied_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create news_events table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS news_events (
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
  `);
}

// Utility operations to simplify data access
export const dbOperations = {
  // Bots
  async insertBot(bot: any): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO bots (id, generation, parent_ids, genome, status, allocation_pct, sharpe_30d) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      bot.id,
      bot.generation ?? 1,
      JSON.stringify(bot.parent_ids ?? []),
      JSON.stringify(bot.genome),
      bot.status ?? 'probation',
      bot.allocation_pct ?? 0,
      bot.sharpe_30d ?? 0
    );
  },

  async getActiveBots(): Promise<any[]> {
    const db = await getDb();
    return db.getAllAsync(`SELECT * FROM bots WHERE status IN ('active', 'probation', 'champion')`);
  },

  async updateBotPerformance(
    botId: string, 
    pnlUsd: number, 
    isWin: boolean, 
    currentDrawdown: number, 
    consecutiveLosses: number
  ): Promise<void> {
    const db = await getDb();
    const winIncrement = isWin ? 1 : 0;
    const lossIncrement = isWin ? 0 : 1;

    await db.runAsync(
      `UPDATE bots 
       SET total_trades = total_trades + 1,
           win_count = win_count + ?,
           loss_count = loss_count + ?,
           total_pnl_usd = total_pnl_usd + ?,
           current_drawdown = ?,
           consecutive_losses = ?
       WHERE id = ?`,
      winIncrement,
      lossIncrement,
      pnlUsd,
      currentDrawdown,
      consecutiveLosses,
      botId
    );
  },

  async killBot(botId: string, deathReasons: string[]): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE bots 
       SET status = 'dead', 
           died_at = CURRENT_TIMESTAMP, 
           death_reasons = ? 
       WHERE id = ?`,
      JSON.stringify(deathReasons),
      botId
    );
  },

  // Trades
  async insertTrade(trade: any): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO trades (
        id, bot_id, asset, asset_class, direction, signal_type, entry_price, 
        stop_loss, take_profit, quantity, status, regime, hmm_confidence, 
        opus_confidence, opus_reasoning, news_digest_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)`,
      trade.id,
      trade.bot_id,
      trade.asset,
      trade.asset_class,
      trade.direction,
      trade.signal_type,
      trade.entry_price,
      trade.stop_loss,
      trade.take_profit ?? null,
      trade.quantity,
      trade.regime,
      trade.hmm_confidence ?? 1.0,
      trade.opus_confidence,
      trade.opus_reasoning,
      trade.news_digest_id ?? null
    );
  },

  async closeTrade(
    tradeId: string, 
    exitPrice: number, 
    pnlUsd: number, 
    pnlPct: number, 
    whatWorked: string | null, 
    whatFailed: string | null, 
    ruleUpdate: string | null
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE trades 
       SET status = 'closed',
           exit_price = ?,
           pnl_usd = ?,
           pnl_pct = ?,
           what_worked = ?,
           what_failed = ?,
           rule_update = ?,
           closed_at = CURRENT_TIMESTAMP
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

  async getTrades(limit: number = 50): Promise<any[]> {
    const db = await getDb();
    return db.getAllAsync(`SELECT * FROM trades ORDER BY opened_at DESC LIMIT ?`, limit);
  },

  // BTC Stack
  async logBtcPurchase(btcAmount: number, usdSpent: number, price: number, sourceTradeId: string | null): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO btc_stack (btc_amount, usd_spent, btc_price_at_buy, source_trade_id) 
       VALUES (?, ?, ?, ?)`,
      btcAmount,
      usdSpent,
      price,
      sourceTradeId
    );
  },

  async getBtcStackTotal(): Promise<number> {
    const db = await getDb();
    const result: any = await db.getFirstAsync(`SELECT SUM(btc_amount) as total FROM btc_stack`);
    return result?.total ?? 0;
  },

  // News Events
  async insertNewsEvents(events: any[]): Promise<void> {
    const db = await getDb();
    for (const event of events) {
      await db.runAsync(
        `INSERT INTO news_events (headline, source, asset, sentiment, urgency, trade_relevant, published_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        event.headline,
        event.source,
        event.asset,
        event.sentiment,
        event.urgency,
        event.trade_relevant ? 1 : 0,
        event.published_at
      );
    }
  }
};
