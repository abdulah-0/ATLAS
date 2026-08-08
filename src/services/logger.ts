import { LogEvent, LogLevel, LogCategory } from '../types/logs';
import { dbOperations } from './db';

type LogSubscriber = (event: LogEvent) => void;
const subscribers: Set<LogSubscriber> = new Set();

export const subscribeToLogs = (subscriber: LogSubscriber): (() => void) => {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
};

function emit(partial: Omit<LogEvent, 'id' | 'timestamp' | 'is_read'>): LogEvent {
  const event: LogEvent = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    is_read: false,
    ...partial,
  };

  // Asynchronously save to SQLite
  dbOperations.insertLogEvent(event).catch(err => console.warn('Failed to insert log event:', err));

  // Synchronously notify subscribers
  subscribers.forEach(sub => {
    try {
      sub(event);
    } catch (e) {
      console.warn('Log subscriber error:', e);
    }
  });

  return event;
}

export const logger = {
  info: (category: LogCategory, title: string, detail?: string) =>
    emit({
      level: 'info',
      category,
      title,
      detail,
    }),

  success: (category: LogCategory, title: string, detail?: string) =>
    emit({
      level: 'success',
      category,
      title,
      detail,
    }),

  warning: (category: LogCategory, title: string, detail?: string) =>
    emit({
      level: 'warning',
      category,
      title,
      detail,
    }),

  systemInfo: (title: string, detail?: string) =>
    emit({
      level: 'system',
      category: 'system',
      title,
      detail,
    }),

  tradeExecuted: (tradeId: string, botId: string, asset: string, direction: string, price: number, qty: number) =>
    emit({
      level: 'success',
      category: 'execution',
      trade_id: tradeId,
      bot_id: botId,
      asset,
      title: `${direction} ${qty} ${asset} @ $${price.toFixed(2)}`,
      detail: `Trade ID: ${tradeId} | Bot: ${botId}`,
    }),

  signalEvaluated: (botId: string, asset: string, hasSignal: boolean, confidence: number, reasoning: string) =>
    emit({
      level: hasSignal ? 'info' : 'system',
      category: 'signal',
      bot_id: botId,
      asset,
      title: `Signal [${botId} / ${asset}]: ${hasSignal ? 'TRIGGERED 🟢' : 'NO SIGNAL ⚪'} (${(confidence * 100).toFixed(0)}%)`,
      detail: reasoning,
    }),

  riskLimitTriggered: (reason: string, action: string) =>
    emit({
      level: 'warning',
      category: 'risk',
      title: `Risk Boundary Fired: ${action}`,
      detail: reason,
    }),

  regimeShift: (from: string, to: string, confidence: number) =>
    emit({
      level: 'info',
      category: 'regime',
      title: `Regime Shift: ${from} → ${to} (${(confidence * 100).toFixed(0)}% conf)`,
    }),

  tradeApproved: (tradeId: string, botId: string, asset: string, decision: any) =>
    emit({
      level: 'success',
      category: 'decision',
      trade_id: tradeId,
      bot_id: botId,
      asset,
      title: `${asset} ${decision.action || 'APPROVED'} — conf ${((decision.confidence || 0.85) * 100).toFixed(0)}%`,
      detail: JSON.stringify(
        {
          bull_case: decision.bull_case,
          bear_case: decision.bear_case,
          risk_flags: decision.risk_flags,
          kronos_alignment: decision.kronos_alignment,
        },
        null,
        2
      ),
    }),

  tradeRejected: (tradeId: string, botId: string, asset: string, reason: string) =>
    emit({
      level: 'warning',
      category: 'decision',
      trade_id: tradeId,
      bot_id: botId,
      asset,
      title: `${asset} REJECTED — ${reason}`,
    }),

  orderFilled: (tradeId: string, asset: string, pnl?: number) =>
    emit({
      level: 'success',
      category: 'execution',
      trade_id: tradeId,
      asset,
      title: pnl != null ? `${asset} closed, P&L ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%` : `${asset} order filled`,
    }),

  riskFired: (rule: string, detail: string) =>
    emit({
      level: 'warning',
      category: 'risk',
      title: `Risk Rule Fired: ${rule}`,
      detail,
    }),

  kronosForecast: (asset: string, direction: string, confidence: number, changePct?: number) =>
    emit({
      level: 'info',
      category: 'kronos',
      asset,
      title: `Kronos: ${asset} ${direction} (${(confidence * 100).toFixed(0)}% conf, ${changePct && changePct > 0 ? '+' : ''}${(changePct || 0).toFixed(1)}%)`,
    }),

  regimeChanged: (from: string, to: string) =>
    emit({
      level: 'info',
      category: 'regime',
      title: `Regime Shift: ${from} → ${to}`,
    }),

  botDied: (botId: string, cause: string) =>
    emit({
      level: 'error',
      category: 'bot_lifecycle',
      bot_id: botId,
      title: `Bot ${botId} Died — ${cause}`,
    }),

  btcConverted: (usd: number, btc: number) =>
    emit({
      level: 'success',
      category: 'btc',
      title: `Converted $${usd.toFixed(2)} → ${btc.toFixed(6)} BTC`,
    }),

  error: (source: string, message: string, stack?: string) =>
    emit({
      level: 'error',
      category: 'system',
      title: `${source}: ${message}`,
      detail: stack || message,
    }),
};
