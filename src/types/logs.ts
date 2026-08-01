export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'system';

export type LogCategory =
  | 'signal'
  | 'decision'
  | 'execution'
  | 'risk'
  | 'kronos'
  | 'regime'
  | 'news'
  | 'bot_lifecycle'
  | 'btc'
  | 'system';

export interface LogEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  bot_id?: string;
  trade_id?: string;
  asset?: string;
  title: string; // short summary
  detail?: string; // expandable bull/bear/risk reasoning, JSON, stack trace
  metadata?: Record<string, string | number>;
  is_read: boolean;
}
