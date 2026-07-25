import { secureStore, SECURE_KEYS } from './secureStore';

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  crypto_status: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_equity: string;
  daytrade_count: number;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: 'crypto' | 'us_equity';
  qty: string;
  avg_entry_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaOrderRequest {
  symbol: string;
  qty?: string;
  notional?: string; // For fractional shares
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
  limit_price?: string;
  stop_price?: string;
  trail_percent?: string;
  trail_price?: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string | null;
  notional: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
}

export interface MarketBar {
  t: string; // Timestamp
  o: number; // Open
  h: number; // High
  l: number; // Low
  c: number; // Close
  v: number; // Volume
}

// Config Helper
export const getAlpacaHeaders = async () => {
  const apiKey = await secureStore.getItem(SECURE_KEYS.ALPACA_API_KEY);
  const secretKey = await secureStore.getItem(SECURE_KEYS.ALPACA_SECRET_KEY);

  if (!apiKey || !secretKey) {
    throw new Error('Alpaca API keys are not configured. Please set them in Settings.');
  }

  return {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': secretKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
};

export const alpaca = {
  // Config state
  isLive: false, // Default to Paper Trading for safety

  setMode(isLive: boolean): void {
    this.isLive = isLive;
  },

  getBaseUrl(): string {
    return this.isLive 
      ? 'https://api.alpaca.markets' 
      : 'https://paper-api.alpaca.markets';
  },

  getDataUrl(): string {
    // Data endpoint is unified but handles auth differently based on live/paper
    return 'https://data.alpaca.markets';
  },

  async getAccount(): Promise<AlpacaAccount> {
    const baseUrl = this.getBaseUrl();
    const headers = await getAlpacaHeaders();
    
    const response = await fetch(`${baseUrl}/v2/account`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca Account Fetch Failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async getPositions(): Promise<AlpacaPosition[]> {
    const baseUrl = this.getBaseUrl();
    const headers = await getAlpacaHeaders();

    const response = await fetch(`${baseUrl}/v2/positions`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca Positions Fetch Failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async placeOrder(order: AlpacaOrderRequest): Promise<AlpacaOrder> {
    const baseUrl = this.getBaseUrl();
    const headers = await getAlpacaHeaders();

    const response = await fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca Order Placement Failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  async cancelOrder(orderId: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const headers = await getAlpacaHeaders();

    const response = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca Order Cancelation Failed: ${response.status} - ${errorText}`);
    }
  },

  async getAsset(symbol: string): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const headers = await getAlpacaHeaders();

    const response = await fetch(`${baseUrl}/v2/assets/${symbol}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca Asset Fetch Failed for ${symbol}: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  /**
   * Fetches historical bars for stock or crypto
   * @param symbol Asset symbol (e.g. "BTC/USD" or "NVDA")
   * @param assetClass 'crypto' or 'stock'
   * @param timeframe '1Min' | '5Min' | '15Min' | '1Hour' | '1Day'
   * @param limit Number of bars (max 1000)
   */
  async getBars(
    symbol: string,
    assetClass: 'crypto' | 'stock',
    timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day' = '1Hour',
    limit: number = 100
  ): Promise<MarketBar[]> {
    const dataUrl = this.getDataUrl();
    const headers = await getAlpacaHeaders();

    let endpoint = '';
    let params = `timeframe=${timeframe}&limit=${limit}`;

    if (assetClass === 'crypto') {
      // E.g., https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=BTC/USD&timeframe=1Hour&limit=100
      endpoint = `${dataUrl}/v1beta3/crypto/us/bars`;
      params += `&symbols=${encodeURIComponent(symbol)}`;
    } else {
      // E.g., https://data.alpaca.markets/v2/stocks/bars?symbols=NVDA&timeframe=1Hour&limit=100
      endpoint = `${dataUrl}/v2/stocks/bars`;
      params += `&symbols=${encodeURIComponent(symbol)}`;
    }

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca Bars Fetch Failed for ${symbol}: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // Alpaca returns bars grouped by symbol key
    if (assetClass === 'crypto') {
      return result.bars?.[symbol] || [];
    } else {
      return result.bars?.[symbol] || [];
    }
  },

  /**
   * Fetches financial news for symbol
   */
  async getNews(symbols?: string[], limit: number = 10): Promise<any[]> {
    const dataUrl = this.getDataUrl();
    const headers = await getAlpacaHeaders();
    
    let url = `${dataUrl}/v1beta1/news?limit=${limit}`;
    if (symbols && symbols.length > 0) {
      url += `&symbols=${encodeURIComponent(symbols.join(','))}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alpaca News Fetch Failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.news || [];
  }
};
