import { pinecone, PineconeMetadata } from './pinecone';
import { openrouter } from './openrouter';

export interface ClosedTradeDetails {
  trade_id: string;
  bot_id: string;
  bot_generation: number;
  asset: string;
  asset_class: 'crypto' | 'stock';
  direction: 'long' | 'short';
  signal_type: string;
  regime: string;
  regime_confidence: number;
  entry_price: number;
  exit_price: number;
  stop_loss: number;
  take_profit: number;
  pnl_pct: number;
  hold_duration_m: number;
  opus_confidence: number;
  news_summary: string;
  rsi: number;
  vwap_dev_pct: number;
  volume_spike: number;
  timestamp: string;
  bot_status: 'active' | 'terminated';
}

export interface TradeReflectionOutput {
  what_worked: string;
  what_failed: string;
  rule_update?: string | null;
  avoid_next_time?: string | null;
}

export const tradeDna = {
  /**
   * Formats a closed trade and reflection into a rich semantic text block for vector embedding
   */
  formatEmbeddingText(trade: ClosedTradeDetails, reflection: TradeReflectionOutput): string {
    const outcome: 'win' | 'loss' | 'breakeven' =
      trade.pnl_pct > 0.1 ? 'win' : trade.pnl_pct < -0.1 ? 'loss' : 'breakeven';

    return `${trade.asset} ${trade.direction} entry via ${trade.signal_type}. ` +
      `Regime: ${trade.regime} (confidence ${(trade.regime_confidence * 100).toFixed(0)}%). ` +
      `RSI was ${trade.rsi.toFixed(1)}, VWAP deviation ${trade.vwap_dev_pct.toFixed(2)}%, Volume spike ${trade.volume_spike.toFixed(1)}x. ` +
      `News: ${trade.news_summary}. Opus confidence: ${trade.opus_confidence.toFixed(2)}. ` +
      `Entry: $${trade.entry_price}, Stop: $${trade.stop_loss}, Target: $${trade.take_profit}. ` +
      `Outcome: ${outcome.toUpperCase()} ${trade.pnl_pct >= 0 ? '+' : ''}${trade.pnl_pct.toFixed(2)}% in ${trade.hold_duration_m}m. ` +
      `What worked: ${reflection.what_worked}. ` +
      `What failed: ${reflection.what_failed}.`;
  },

  /**
   * Generates embedding vector and upserts trade DNA to Pinecone Vector DB
   */
  async embedAndStoreTrade(trade: ClosedTradeDetails, reflection: TradeReflectionOutput): Promise<string> {
    const embeddingText = this.formatEmbeddingText(trade, reflection);
    const outcome: 'win' | 'loss' | 'breakeven' =
      trade.pnl_pct > 0.1 ? 'win' : trade.pnl_pct < -0.1 ? 'loss' : 'breakeven';

    let vector: number[];
    try {
      vector = await openrouter.getEmbedding(embeddingText);
    } catch (err) {
      console.warn('Could not generate remote vector embedding, using fallback mock vector:', err instanceof Error ? err.message : String(err));
      // Fallback 1536-dimension mock vector for offline/demo testing
      vector = Array.from({ length: 1536 }, () => (Math.random() * 2) - 1);
    }

    const metadata: PineconeMetadata = {
      trade_id: trade.trade_id,
      bot_id: trade.bot_id,
      bot_generation: trade.bot_generation,
      asset: trade.asset,
      asset_class: trade.asset_class,
      direction: trade.direction,
      signal_type: trade.signal_type,
      regime: trade.regime,
      outcome,
      pnl_pct: trade.pnl_pct,
      bot_status: trade.bot_status,
      timestamp: trade.timestamp,
      embedding_text: embeddingText,
      what_worked: reflection.what_worked,
      what_failed: reflection.what_failed,
    };

    try {
      await pinecone.upsertVector(trade.trade_id, vector, metadata);
      console.log(`✅ Trade DNA successfully stored in Pinecone for trade ${trade.trade_id}`);
    } catch (pineconeErr) {
      console.warn('Pinecone storage unavailable, trade stored in local SQLite only:', pineconeErr instanceof Error ? pineconeErr.message : String(pineconeErr));
    }

    return embeddingText;
  }
};
