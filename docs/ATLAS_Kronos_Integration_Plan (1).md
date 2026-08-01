# ATLAS × Kronos Integration Plan
## Implementation Plan v1.1

> **What this document covers:** Every file, every function, every decision needed to integrate Kronos as a live forecasting layer inside ATLAS — from deploying the Python microservice to wiring the forecast into the Opus decision prompt to showing it in the mobile UI.

---

## Table of Contents

1. [Architecture Decision: Why a Microservice](#1-architecture-decision-why-a-microservice)
2. [High-Level Integration Map](#2-high-level-integration-map)
3. [Phase 1: Kronos Microservice (Python + FastAPI)](#3-phase-1-kronos-microservice-python--fastapi)
4. [Phase 2: Deployment on Render.com](#4-phase-2-deployment-on-rendercom)
5. [Phase 3: ATLAS App — Kronos Client Service](#5-phase-3-atlas-app--kronos-client-service)
6. [Phase 4: Signal Pipeline Integration](#6-phase-4-signal-pipeline-integration)
7. [Phase 5: Opus Prompt Enhancement](#7-phase-5-opus-prompt-enhancement)
8. [Phase 6: Database Schema Additions](#8-phase-6-database-schema-additions)
9. [Phase 7: UI Integration](#9-phase-7-ui-integration)
10. [Phase 8: Forecast Accuracy Tracking](#10-phase-8-forecast-accuracy-tracking)
11. [Phase 9: Fine-Tuning on ATLAS Trade Data](#11-phase-9-fine-tuning-on-atlas-trade-data)
12. [Failure Modes & Fallback Logic](#12-failure-modes--fallback-logic)
13. [Cost & Resource Reference](#13-cost--resource-reference)
14. [Implementation Timeline](#14-implementation-timeline)
15. [Testing Checklist](#15-testing-checklist)
16. [Logs Screen](#16-logs-screen)
17. [Icon-Only Bottom Navbar](#17-icon-only-bottom-navbar)
18. [Intelligence Screen Responsive Fix](#18-intelligence-screen-responsive-fix)

---

## 1. Architecture Decision: Why a Microservice

Kronos runs on **Python + PyTorch**. ATLAS is **React Native (TypeScript)**. These cannot share a process. Three integration options exist:

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Python microservice (our choice) | Clean separation, easy to update, deploy once | Requires HTTP call latency, Render free tier cold starts | ✅ **Use this** |
| ONNX on-device | No network call, works offline | No React Native ONNX runtime for PyTorch models, complex conversion | ❌ Skip for now |
| Run on every user's phone | Zero infra cost | PyTorch not available in RN, model download per user (100MB+) | ❌ Not feasible |

**The microservice lives at:** `https://atlas-kronos.onrender.com`
**It does exactly one thing:** Receive OHLCV bars, return a forecast object.
**The ATLAS app calls it** before every Opus trade decision.

### Cold Start Problem (Important)

Render's free tier spins down after 15 minutes of inactivity. First request after idle takes ~60 seconds to wake up. Solution: a **keep-alive ping** from the ATLAS app every 10 minutes when the trading engine is active. This costs nothing and prevents cold starts entirely during trading hours.

---

## 2. High-Level Integration Map

```
ATLAS Mobile App
     │
     ├── Every 15 min (background) ──► Alpaca WebSocket ──► fresh OHLCV bars stored in SQLite
     │
     ├── On each bot signal ─────────► [1] Fetch last 400 bars from SQLite
     │                                 [2] POST to Kronos microservice
     │                                 [3] Receive KronosForecast object
     │                                 [4] Build combined context (indicators + Kronos + news)
     │                                 [5] Send to Opus for final decision
     │                                 [6] Store forecast + outcome in SQLite + Pinecone
     │
     └── UI renders:
          ├── Kronos forecast chart overlay on price chart
          ├── Direction badge (UP/DOWN/NEUTRAL + confidence)
          ├── Volatility warning banner when high vol predicted
          └── "Kronos powered" badge on each trade card
```

---

## 3. Phase 1: Kronos Microservice (Python + FastAPI)

### 3.1 — Repository Structure

Create a **separate GitHub repository** for the microservice:

```
atlas-kronos-service/
├── main.py                  # FastAPI app + all endpoints
├── kronos_predictor.py      # Wrapper around Kronos model
├── schemas.py               # Pydantic request/response models
├── cache.py                 # In-memory LRU cache for repeated requests
├── health.py                # Health check + model status endpoints
├── requirements.txt
├── render.yaml              # Render deployment config
├── Dockerfile               # For local development
└── README.md
```

---

### 3.2 — Pydantic Schemas

**File:** `schemas.py`

```python
# schemas.py
from pydantic import BaseModel, Field, validator
from typing import Optional
from enum import Enum

class Timeframe(str, Enum):
    ONE_MIN   = "1min"
    FIVE_MIN  = "5min"
    FIFTEEN   = "15min"
    ONE_HOUR  = "1h"
    FOUR_HOUR = "4h"
    ONE_DAY   = "1d"

class OHLCVBar(BaseModel):
    timestamp: str              # ISO 8601
    open:      float
    high:      float
    low:       float
    close:     float
    volume:    Optional[float] = 0.0

class ForecastRequest(BaseModel):
    asset:        str                  # "BTC/USD", "NVDA", etc.
    timeframe:    Timeframe = Timeframe.FIFTEEN
    bars:         list[OHLCVBar]       # historical OHLCV, max 400
    pred_len:     int = Field(24, ge=1, le=96)  # bars to predict
    sample_count: int = Field(5, ge=1, le=20)   # paths to average

    @validator("bars")
    def min_bars(cls, v):
        if len(v) < 50:
            raise ValueError("Minimum 50 bars required for reliable forecast")
        return v[-400:]  # always cap at 400

class ForecastBar(BaseModel):
    timestamp:  str
    open:       float
    high:       float
    low:        float
    close:      float

class KronosForecast(BaseModel):
    # Core forecast
    asset:             str
    timeframe:         str
    pred_len:          int
    forecast_bars:     list[ForecastBar]

    # Derived signals (pre-computed for Opus)
    direction:         str    # "UP" | "DOWN" | "NEUTRAL"
    direction_confidence: float  # 0.0–1.0
    predicted_change_pct: float  # % change from last close to last forecast close
    predicted_high_pct:   float  # max predicted high vs current close
    predicted_low_pct:    float  # min predicted low vs current close

    # Volatility
    volatility_score:     float  # 0.0–1.0, higher = more volatile
    volatility_regime:    str    # "LOW" | "NORMAL" | "HIGH" | "EXTREME"
    peak_volatility_bar:  int    # which bar has highest predicted range

    # Uncertainty
    forecast_confidence:  float  # 1 - (std/mean) of close predictions
    path_agreement:       float  # how similar the N sampled paths were

    # Meta
    model_used:      str     # "kronos-small" | "kronos-mini" | "kronos-base"
    inference_ms:    int     # how long inference took
    bars_used:       int     # how many input bars were used

class HealthResponse(BaseModel):
    status:       str   # "healthy" | "degraded" | "loading"
    model_loaded: bool
    model_name:   str
    uptime_s:     int
    last_request: Optional[str]
```

---

### 3.3 — Kronos Predictor Wrapper

**File:** `kronos_predictor.py`

```python
# kronos_predictor.py
import sys, os, time, logging
sys.path.insert(0, os.path.dirname(__file__))

import numpy as np
import pandas as pd
import torch
from model import Kronos, KronosTokenizer, KronosPredictor
from schemas import ForecastRequest, KronosForecast, ForecastBar
from datetime import datetime, timedelta

logger = logging.getLogger("kronos")

# ── Model selection logic ─────────────────────────────────────────────────
# Use kronos-small for best accuracy within free tier memory limits
# kronos-mini as fallback if OOM
MODEL_PRIORITY = [
    ("NeoQuasar/Kronos-small",  "NeoQuasar/Kronos-Tokenizer-base", "kronos-small"),
    ("NeoQuasar/Kronos-mini",   "NeoQuasar/Kronos-Tokenizer-2k",   "kronos-mini"),
]

TIMEFRAME_FREQ = {
    "1min":  "1min",
    "5min":  "5min",
    "15min": "15min",
    "1h":    "1h",
    "4h":    "4h",
    "1d":    "1d",
}

class KronosService:
    def __init__(self):
        self.predictor  = None
        self.model_name = None
        self.start_time = time.time()
        self.last_req   = None
        self._load_model()

    def _load_model(self):
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading Kronos on device: {device}")

        for model_id, tokenizer_id, name in MODEL_PRIORITY:
            try:
                logger.info(f"Attempting to load {name}...")
                tokenizer = KronosTokenizer.from_pretrained(tokenizer_id)
                model     = Kronos.from_pretrained(model_id)
                # Use max_context based on model
                max_ctx = 2048 if "mini" in name else 512
                self.predictor  = KronosPredictor(model, tokenizer,
                                                   device=device,
                                                   max_context=max_ctx)
                self.model_name = name
                logger.info(f"✓ Loaded {name} successfully on {device}")
                return
            except Exception as e:
                logger.warning(f"Failed to load {name}: {e}")
                continue

        raise RuntimeError("Could not load any Kronos model variant")

    def forecast(self, req: ForecastRequest) -> KronosForecast:
        t0 = time.time()
        self.last_req = datetime.utcnow().isoformat()

        # Build DataFrames
        df = pd.DataFrame([{
            "open":   b.open,
            "high":   b.high,
            "low":    b.low,
            "close":  b.close,
            "volume": b.volume or 0.0,
            "timestamps": pd.to_datetime(b.timestamp),
        } for b in req.bars])

        x_timestamp = df["timestamps"]
        last_ts     = df["timestamps"].iloc[-1]
        freq        = TIMEFRAME_FREQ[req.timeframe.value]

        # Build future timestamps
        y_timestamp = pd.date_range(
            start=last_ts, periods=req.pred_len + 1, freq=freq
        )[1:]

        # Run multiple sample paths for uncertainty quantification
        all_closes = []
        all_highs  = []
        all_lows   = []

        for _ in range(req.sample_count):
            pred = self.predictor.predict(
                df=df[["open","high","low","close","volume"]],
                x_timestamp=x_timestamp,
                y_timestamp=y_timestamp,
                pred_len=req.pred_len,
                T=1.0,
                top_p=0.9,
                sample_count=1,
            )
            all_closes.append(pred["close"].values)
            all_highs.append(pred["high"].values)
            all_lows.append(pred["low"].values)

        # Aggregate paths
        mean_close = np.mean(all_closes, axis=0)
        mean_high  = np.mean(all_highs,  axis=0)
        mean_low   = np.mean(all_lows,   axis=0)
        std_close  = np.std(all_closes,  axis=0)

        last_close = df["close"].iloc[-1]

        # ── Derive signals ───────────────────────────────────────────────
        final_close     = float(mean_close[-1])
        change_pct      = (final_close - last_close) / last_close * 100
        max_high_pct    = (float(mean_high.max()) - last_close) / last_close * 100
        min_low_pct     = (float(mean_low.min())  - last_close) / last_close * 100

        # Direction with dead zone (avoid calling ±0.3% as directional)
        if change_pct > 0.3:
            direction = "UP"
        elif change_pct < -0.3:
            direction = "DOWN"
        else:
            direction = "NEUTRAL"

        dir_confidence = min(1.0, abs(change_pct) / 2.0)  # caps at ±2% = 1.0

        # Volatility
        bar_ranges      = mean_high - mean_low
        vol_score       = float(np.mean(bar_ranges) / last_close * 100)
        norm_vol        = min(1.0, vol_score / 3.0)       # 3%+ range = score 1.0
        peak_vol_bar    = int(np.argmax(bar_ranges))

        if norm_vol < 0.25:    vol_regime = "LOW"
        elif norm_vol < 0.55:  vol_regime = "NORMAL"
        elif norm_vol < 0.80:  vol_regime = "HIGH"
        else:                  vol_regime = "EXTREME"

        # Confidence & path agreement
        mean_std         = float(np.mean(std_close))
        forecast_conf    = max(0.0, 1.0 - (mean_std / (abs(final_close) + 1e-8)))
        path_ranges      = [np.ptp(path) for path in all_closes]
        path_agreement   = max(0.0, 1.0 - (np.std(path_ranges) / (np.mean(path_ranges) + 1e-8)))

        # Build forecast bars
        forecast_bars = []
        for i, ts in enumerate(y_timestamp):
            forecast_bars.append(ForecastBar(
                timestamp=ts.isoformat(),
                open=float(mean_close[i-1] if i > 0 else last_close),
                high=float(mean_high[i]),
                low=float(mean_low[i]),
                close=float(mean_close[i]),
            ))

        inference_ms = int((time.time() - t0) * 1000)

        return KronosForecast(
            asset=req.asset,
            timeframe=req.timeframe.value,
            pred_len=req.pred_len,
            forecast_bars=forecast_bars,
            direction=direction,
            direction_confidence=round(dir_confidence, 3),
            predicted_change_pct=round(change_pct, 3),
            predicted_high_pct=round(max_high_pct, 3),
            predicted_low_pct=round(min_low_pct, 3),
            volatility_score=round(norm_vol, 3),
            volatility_regime=vol_regime,
            peak_volatility_bar=peak_vol_bar,
            forecast_confidence=round(forecast_conf, 3),
            path_agreement=round(path_agreement, 3),
            model_used=self.model_name,
            inference_ms=inference_ms,
            bars_used=len(req.bars),
        )

    @property
    def is_ready(self) -> bool:
        return self.predictor is not None
```

---

### 3.4 — LRU Cache

**File:** `cache.py`

Kronos inference on CPU takes 2–8 seconds. Cache identical asset+timeframe requests for 5 minutes so rapid repeated calls don't re-run inference.

```python
# cache.py
import hashlib, json, time
from typing import Optional
from schemas import KronosForecast

class ForecastCache:
    def __init__(self, ttl_seconds: int = 300, max_size: int = 50):
        self._cache:   dict[str, tuple[KronosForecast, float]] = {}
        self._ttl     = ttl_seconds
        self._max_size= max_size

    def _key(self, asset: str, timeframe: str, last_bar_ts: str) -> str:
        raw = f"{asset}:{timeframe}:{last_bar_ts}"
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, asset: str, timeframe: str, last_bar_ts: str) -> Optional[KronosForecast]:
        key = self._key(asset, timeframe, last_bar_ts)
        if key not in self._cache:
            return None
        result, cached_at = self._cache[key]
        if time.time() - cached_at > self._ttl:
            del self._cache[key]
            return None
        return result

    def set(self, asset: str, timeframe: str, last_bar_ts: str, result: KronosForecast):
        if len(self._cache) >= self._max_size:
            # Evict oldest
            oldest = min(self._cache.items(), key=lambda x: x[1][1])
            del self._cache[oldest[0]]
        key = self._key(asset, timeframe, last_bar_ts)
        self._cache[key] = (result, time.time())
```

---

### 3.5 — FastAPI Main Application

**File:** `main.py`

```python
# main.py
import logging, time, asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from schemas import ForecastRequest, KronosForecast, HealthResponse
from kronos_predictor import KronosService
from cache import ForecastCache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("atlas-kronos")

# ── App state ─────────────────────────────────────────────────────────────
service: KronosService = None
cache   = ForecastCache(ttl_seconds=300, max_size=50)
START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global service
    logger.info("Starting Kronos service — loading model...")
    service = KronosService()
    logger.info("Kronos service ready")
    yield
    logger.info("Shutting down Kronos service")

app = FastAPI(
    title="ATLAS Kronos Service",
    description="Kronos price forecasting microservice for ATLAS trading system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Lock to your app domain in production
    allow_methods=["POST","GET"],
    allow_headers=["*"],
)

# ── API Key middleware ────────────────────────────────────────────────────
import os
KRONOS_API_KEY = os.environ.get("KRONOS_API_KEY", "")

async def verify_api_key(request: Request):
    if not KRONOS_API_KEY:
        return  # No key configured — open access (dev mode)
    key = request.headers.get("X-ATLAS-Key", "")
    if key != KRONOS_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

# ── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy" if (service and service.is_ready) else "loading",
        model_loaded=bool(service and service.is_ready),
        model_name=service.model_name if service else "none",
        uptime_s=int(time.time() - START_TIME),
        last_request=service.last_req if service else None,
    )

@app.get("/ping")
async def ping():
    """Keep-alive endpoint — called every 10min by ATLAS to prevent cold starts."""
    return {"status": "ok", "ts": time.time()}

@app.post("/forecast", response_model=KronosForecast,
          dependencies=[Depends(verify_api_key)])
async def forecast(req: ForecastRequest):
    if not service or not service.is_ready:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # Check cache first
    last_ts = req.bars[-1].timestamp
    cached  = cache.get(req.asset, req.timeframe.value, last_ts)
    if cached:
        logger.info(f"Cache hit: {req.asset} {req.timeframe}")
        return cached

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,           # default thread pool
            service.forecast,
            req
        )
        cache.set(req.asset, req.timeframe.value, last_ts, result)
        logger.info(
            f"Forecast: {req.asset} {req.timeframe} "
            f"dir={result.direction} conf={result.direction_confidence:.2f} "
            f"vol={result.volatility_regime} time={result.inference_ms}ms"
        )
        return result
    except Exception as e:
        logger.error(f"Forecast failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast/batch", dependencies=[Depends(verify_api_key)])
async def forecast_batch(requests: list[ForecastRequest]):
    """Forecast multiple assets simultaneously — used at market open."""
    if len(requests) > 10:
        raise HTTPException(status_code=400, detail="Max 10 assets per batch")
    results = []
    for req in requests:
        try:
            last_ts = req.bars[-1].timestamp
            cached  = cache.get(req.asset, req.timeframe.value, last_ts)
            if cached:
                results.append(cached)
                continue
            result = await asyncio.get_event_loop().run_in_executor(
                None, service.forecast, req
            )
            cache.set(req.asset, req.timeframe.value, last_ts, result)
            results.append(result)
        except Exception as e:
            logger.error(f"Batch forecast failed for {req.asset}: {e}")
            results.append({"error": str(e), "asset": req.asset})
    return results
```

---

### 3.6 — Requirements & Render Config

**File:** `requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
torch==2.3.0+cpu          # CPU-only — saves ~1.5GB vs CUDA version
numpy==1.26.4
pandas==2.2.2
transformers==4.42.0
huggingface-hub==0.23.4
python-multipart==0.0.9
```

**File:** `render.yaml`

```yaml
services:
  - type: web
    name: atlas-kronos
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
    # 1 worker only — model loaded once in memory
    envVars:
      - key: KRONOS_API_KEY
        generateValue: true    # Render auto-generates a secret
      - key: HF_HOME
        value: /tmp/huggingface   # Cache models in /tmp on Render
    healthCheckPath: /health
    autoDeploy: true
```

**File:** `Dockerfile` (for local testing)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU first (avoids downloading CUDA variant)
RUN pip install torch==2.3.0+cpu --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN grep -v "torch" requirements.txt | pip install -r /dev/stdin

# Copy Kronos model code from the original repo
# Run: git clone https://github.com/shiyu-coder/Kronos /tmp/kronos
# Then copy the model/ directory
COPY model/ ./model/
COPY *.py .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 4. Phase 2: Deployment on Render.com

### Step-by-step deployment

```
Step 1: Clone Kronos repo locally
$ git clone https://github.com/shiyu-coder/Kronos /tmp/kronos

Step 2: Create atlas-kronos-service/ directory
$ mkdir atlas-kronos-service
$ cd atlas-kronos-service

Step 3: Copy the Kronos model/ directory (needed for imports)
$ cp -r /tmp/kronos/model ./model

Step 4: Create all files from Phase 1 above
$ touch main.py kronos_predictor.py schemas.py cache.py health.py
$ touch requirements.txt render.yaml Dockerfile README.md

Step 5: Create GitHub repo and push
$ git init
$ git add .
$ git commit -m "Initial Kronos microservice"
$ git remote add origin https://github.com/yourname/atlas-kronos-service
$ git push -u origin main

Step 6: Deploy on Render
>> Go to: https://render.com
>> New → Web Service
>> Connect GitHub → select atlas-kronos-service
>> Render auto-detects render.yaml configuration
>> Click: Deploy

Step 7: First deploy downloads models from HuggingFace (~200MB for kronos-small)
        This takes 5–10 minutes on first deploy only.
        Subsequent deploys use cached model.

Step 8: Note your service URL
        Format: https://atlas-kronos-XXXX.onrender.com
        Note the auto-generated KRONOS_API_KEY from Render dashboard
        → Environment → KRONOS_API_KEY → Reveal value

Step 9: Test the deployment
$ curl https://atlas-kronos-XXXX.onrender.com/health
# Expected: {"status":"healthy","model_loaded":true,"model_name":"kronos-small",...}
```

### Expected Free Tier Behaviour

| Metric | Value |
|---|---|
| RAM available | 512MB (Render free) |
| Kronos-small RAM usage | ~250MB (24.7M params × float32) |
| Kronos-mini RAM usage | ~50MB (4.1M params) |
| CPU inference time (small) | 3–8 seconds |
| CPU inference time (mini) | 0.5–2 seconds |
| Cold start after idle | ~60 seconds |
| With keep-alive ping | No cold starts during trading |
| Monthly cost | $0 (free tier) |

> If Kronos-small consistently OOMs on Render free tier, fall back to Kronos-mini automatically. The `MODEL_PRIORITY` list in `kronos_predictor.py` handles this.

---

## 5. Phase 3: ATLAS App — Kronos Client Service

### 5.1 — TypeScript Types

**File:** `src/types/kronos.ts`

```typescript
// src/types/kronos.ts

export type ForecastDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type VolatilityRegime  = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
export type Timeframe = '1min' | '5min' | '15min' | '1h' | '4h' | '1d';

export interface OHLCVBar {
  timestamp: string;
  open:      number;
  high:      number;
  low:       number;
  close:     number;
  volume?:   number;
}

export interface ForecastBar {
  timestamp: string;
  open:      number;
  high:      number;
  low:       number;
  close:     number;
}

export interface KronosForecast {
  asset:             string;
  timeframe:         string;
  pred_len:          number;
  forecast_bars:     ForecastBar[];

  // Directional signal
  direction:             ForecastDirection;
  direction_confidence:  number;    // 0.0–1.0
  predicted_change_pct:  number;    // + = up, - = down

  // Range prediction
  predicted_high_pct:   number;    // % above current close
  predicted_low_pct:    number;    // % below current close (negative)

  // Volatility
  volatility_score:     number;    // 0.0–1.0
  volatility_regime:    VolatilityRegime;
  peak_volatility_bar:  number;

  // Confidence
  forecast_confidence:  number;    // 0.0–1.0
  path_agreement:       number;    // 0.0–1.0

  // Meta
  model_used:     string;
  inference_ms:   number;
  bars_used:      number;
}

export interface ForecastRequest {
  asset:        string;
  timeframe:    Timeframe;
  bars:         OHLCVBar[];
  pred_len?:    number;
  sample_count?: number;
}

// What gets stored in SQLite per forecast
export interface StoredForecast {
  id:                string;    // UUID
  trade_id?:         string;    // linked trade if this forecast led to a trade
  asset:             string;
  timeframe:         string;
  direction:         ForecastDirection;
  direction_confidence: number;
  predicted_change_pct: number;
  volatility_regime: VolatilityRegime;
  forecast_confidence:  number;
  actual_change_pct?:   number;    // filled in when trade closes
  was_correct?:         boolean;   // filled in when trade closes
  requested_at:     string;
  responded_at:     string;
  latency_ms:       number;
}
```

---

### 5.2 — Kronos Client Service

**File:** `src/services/kronosClient.ts`

```typescript
// src/services/kronosClient.ts
import * as SecureStore from 'expo-secure-store';
import { KronosForecast, ForecastRequest, StoredForecast } from '../types/kronos';
import { db } from './database';

const KRONOS_BASE_URL = 'https://atlas-kronos-XXXX.onrender.com';  // your URL
const REQUEST_TIMEOUT_MS = 15_000;   // 15s — covers slow CPU inference

export class KronosClient {
  private apiKey: string | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    this.apiKey = await SecureStore.getItemAsync('kronos_api_key');
  }

  async saveApiKey(key: string): Promise<void> {
    await SecureStore.setItemAsync('kronos_api_key', key);
    this.apiKey = key;
  }

  // ── Keep-alive: prevent Render cold starts during trading ──────────
  startKeepAlive(): void {
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(async () => {
      try {
        await fetch(`${KRONOS_BASE_URL}/ping`, { method: 'GET' });
      } catch {}   // silent fail — keep-alive is best-effort
    }, 10 * 60 * 1000);  // every 10 minutes
  }

  stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // ── Core forecast method ──────────────────────────────────────────
  async forecast(req: ForecastRequest): Promise<KronosForecast | null> {
    if (!this.apiKey) {
      console.warn('[Kronos] No API key configured — skipping forecast');
      return null;
    }

    const requestedAt = new Date().toISOString();
    const controller  = new AbortController();
    const timeout     = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const resp = await fetch(`${KRONOS_BASE_URL}/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ATLAS-Key':  this.apiKey,
        },
        body:   JSON.stringify({
          asset:        req.asset,
          timeframe:    req.timeframe,
          bars:         req.bars.slice(-400),   // cap at 400
          pred_len:     req.pred_len ?? 24,
          sample_count: req.sample_count ?? 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        console.error(`[Kronos] HTTP ${resp.status}: ${await resp.text()}`);
        return null;
      }

      const forecast: KronosForecast = await resp.json();
      const respondedAt = new Date().toISOString();

      // Store to SQLite for accuracy tracking
      await this._storeForecast({
        id:                   crypto.randomUUID(),
        asset:                forecast.asset,
        timeframe:            forecast.timeframe,
        direction:            forecast.direction,
        direction_confidence: forecast.direction_confidence,
        predicted_change_pct: forecast.predicted_change_pct,
        volatility_regime:    forecast.volatility_regime,
        forecast_confidence:  forecast.forecast_confidence,
        requested_at:         requestedAt,
        responded_at:         respondedAt,
        latency_ms:           forecast.inference_ms,
      });

      return forecast;

    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.error('[Kronos] Request timed out after 15s');
      } else {
        console.error('[Kronos] Request failed:', err.message);
      }
      return null;  // always return null on error — never block trading
    }
  }

  // ── Batch forecast for all active bot assets at market open ──────
  async forecastBatch(requests: ForecastRequest[]): Promise<Map<string, KronosForecast>> {
    const results = new Map<string, KronosForecast>();
    if (!this.apiKey || requests.length === 0) return results;

    try {
      const resp = await fetch(`${KRONOS_BASE_URL}/forecast/batch`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-ATLAS-Key': this.apiKey },
        body:    JSON.stringify(requests.map(r => ({
          ...r, bars: r.bars.slice(-400),
        }))),
      });
      if (!resp.ok) return results;
      const batch: (KronosForecast | { error: string; asset: string })[] = await resp.json();
      for (const item of batch) {
        if ('error' in item) continue;
        results.set(item.asset, item as KronosForecast);
      }
    } catch (err) {
      console.error('[Kronos] Batch forecast failed:', err);
    }
    return results;
  }

  private async _storeForecast(f: StoredForecast): Promise<void> {
    await db.runAsync(
      `INSERT INTO kronos_forecasts
       (id, asset, timeframe, direction, direction_confidence,
        predicted_change_pct, volatility_regime, forecast_confidence,
        requested_at, responded_at, latency_ms)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [f.id, f.asset, f.timeframe, f.direction, f.direction_confidence,
       f.predicted_change_pct, f.volatility_regime, f.forecast_confidence,
       f.requested_at, f.responded_at, f.latency_ms]
    );
  }
}

export const kronosClient = new KronosClient();
```

---

## 6. Phase 4: Signal Pipeline Integration

### 6.1 — Where Kronos Fits in the Bot Decision Flow

```typescript
// src/services/botDecisionEngine.ts  (modified)

async function evaluateSignal(
  signal:  BotSignal,
  bot:     ActiveBot,
  regime:  RegimeState,
  news:    NewsDigest,
): Promise<TradeDecision> {

  // STEP 1: Fetch last 400 bars for this asset from SQLite cache
  const bars = await db.getAllAsync<OHLCVBar>(
    `SELECT timestamp, open, high, low, close, volume
     FROM ohlcv_cache
     WHERE asset = ? AND timeframe = ?
     ORDER BY timestamp DESC LIMIT 400`,
    [signal.asset, bot.genome.preferred_timeframe]
  );
  bars.reverse();  // oldest first (Kronos expects chronological order)

  // STEP 2: Get Kronos forecast (non-blocking — null if service unavailable)
  const kronos = await kronosClient.forecast({
    asset:        signal.asset,
    timeframe:    bot.genome.preferred_timeframe,
    bars,
    pred_len:     24,     // forecast next 24 bars
    sample_count: 5,
  });

  // STEP 3: Compute RAG context (existing Pinecone query)
  const similarTrades = await pinecone.querySimilar({
    asset:       signal.asset,
    direction:   signal.direction,
    signalType:  signal.type,
    regime:      regime.regime,
    topK:        10,
  });

  // STEP 4: Build Opus decision context
  const context = buildOpusContext({
    signal,
    bot,
    regime,
    news,
    kronos,        // ← new addition
    similarTrades,
  });

  // STEP 5: Opus makes the final decision
  const decision = await llmRouter.route('tradeDecision', context);

  // STEP 6: Store forecast linkage for accuracy tracking
  if (kronos && decision.action === 'APPROVE') {
    await db.runAsync(
      `UPDATE kronos_forecasts SET trade_id = ? WHERE asset = ? ORDER BY requested_at DESC LIMIT 1`,
      [decision.tradeId, signal.asset]
    );
  }

  return decision;
}
```

---

### 6.2 — Context Builder (Kronos Section)

**File:** `src/services/contextBuilder.ts`

```typescript
// The Kronos section of the Opus context string
function buildKronosSection(kronos: KronosForecast | null): string {
  if (!kronos) {
    return `=== KRONOS FORECAST ===
Kronos model unavailable — proceed on technical indicators and news alone.`;
  }

  const dirEmoji = kronos.direction === 'UP' ? '📈' : kronos.direction === 'DOWN' ? '📉' : '↔️';
  const volWarn  = kronos.volatility_regime === 'HIGH' || kronos.volatility_regime === 'EXTREME'
    ? `\n⚠️ HIGH VOLATILITY PREDICTED: Peak volatility at bar ${kronos.peak_volatility_bar}. Consider reducing position size.`
    : '';

  return `=== KRONOS FORECAST ===
Model: ${kronos.model_used} (trained on 12B candles, 45 exchanges)
Timeframe: ${kronos.timeframe} | Bars predicted: ${kronos.pred_len}

${dirEmoji} Direction: ${kronos.direction} (confidence: ${(kronos.direction_confidence * 100).toFixed(0)}%)
Predicted price change: ${kronos.predicted_change_pct > 0 ? '+' : ''}${kronos.predicted_change_pct.toFixed(2)}%
Predicted range: Low ${kronos.predicted_low_pct.toFixed(2)}% to High +${kronos.predicted_high_pct.toFixed(2)}%

Volatility: ${kronos.volatility_regime} (score: ${(kronos.volatility_score * 100).toFixed(0)}/100)${volWarn}

Forecast confidence: ${(kronos.forecast_confidence * 100).toFixed(0)}%
Path agreement: ${(kronos.path_agreement * 100).toFixed(0)}% (how consistent the model's predictions were)

IMPORTANT: Kronos forecasts price movement, not trade outcomes.
Use it to calibrate conviction, not as a standalone signal.`;
}
```

---

## 7. Phase 5: Opus Prompt Enhancement

### Design Note: Internal Bull/Bear/Risk Debate (v2)

The original prompt asked Opus to weigh four data streams (technicals, Kronos, news, RAG memory) and jump straight to a verdict — a flat judgment call with no adversarial pressure-testing.

**TradingAgents** (TauricResearch's open-source multi-agent trading framework) solves this with separate LLM agents — a bull researcher, a bear researcher, and a risk management team — that debate before a portfolio manager agent decides. That structure improves decision quality, but running it as literally separate agents means separate API calls per role, which is the wrong trade for ATLAS: it would multiply LLM spend past the $7–12/month budget and requires a multi-agent orchestration layer with no reason to exist inside a React Native app that has "no backend except Kronos."

**What ATLAS does instead:** the debate happens *inside* Opus's own reasoning, in the same single API call. The prompt forces Opus to explicitly construct a bull case, a bear case, and a risk assessment as JSON fields — in that order — before it's allowed to output a verdict. Same adversarial-reasoning benefit as TradingAgents, zero new infra, zero new cost. Cost per decision is unchanged from the original single-call design (~$0.075/trade decision).

### Updated Trade Decision Prompt

```typescript
// src/services/prompts.ts  (updated tradeDecision prompt — v2, bull/bear/risk debate)

export const TRADE_DECISION_PROMPT = (ctx: OpusContext) => `
You are the ATLAS trade decision engine. Evaluate this trade signal and make a final decision.

You will reason through this in three internal stages — BULL CASE, BEAR CASE, RISK ASSESSMENT —
before reaching a verdict. Do not skip stages or let the verdict leak into earlier stages.
Each stage must be argued honestly on its own terms, as if you were three different analysts
who do not know what the others concluded.

=== CURRENT MARKET CONTEXT ===
Asset: ${ctx.signal.asset} | Direction: ${ctx.signal.direction}
Regime: ${ctx.regime.regime} (confidence: ${(ctx.regime.confidence * 100).toFixed(0)}%)
Size Multiplier: ${ctx.regime.size_mult}x

=== TECHNICAL SIGNAL ===
Signal Type: ${ctx.signal.type}
Entry Price: $${ctx.signal.entryPrice}
Stop Loss: $${ctx.signal.stopLoss} (${ctx.signal.stopPct.toFixed(2)}% risk)
Take Profit: $${ctx.signal.takeProfit} (${ctx.signal.targetPct.toFixed(2)}% target)
R/R Ratio: ${ctx.signal.rr.toFixed(1)}:1
Indicator Conditions: ${ctx.signal.conditions.join(', ')}

${buildKronosSection(ctx.kronos)}

=== NEWS CONTEXT (last 4h) ===
Overall Tone: ${ctx.news.overall_tone}
Trade Recommendation: ${ctx.news.trade_recommendation}
Key Items: ${ctx.news.items.slice(0, 3).map(i => `${i.sentiment}: ${i.headline}`).join('\n')}
High-Impact Events Next 4h: ${ctx.news.high_impact_events_next_4h.length > 0
  ? ctx.news.high_impact_events_next_4h.map(e => `${e.event} at ${e.time} (${e.impact} impact)`).join(', ')
  : 'None'}

=== 10 MOST SIMILAR PAST TRADES (from memory) ===
${ctx.similarTrades.map((t, i) =>
  `${i+1}. ${t.asset} ${t.direction} ${t.signal_type} | Regime: ${t.regime} | ${t.outcome.toUpperCase()} ${t.pnl_pct > 0 ? '+' : ''}${t.pnl_pct.toFixed(1)}% | ${t.what_worked ?? t.what_failed ?? ''}`
).join('\n')}

=== ACTIVE RULES ===
Hard Rules: Stop loss mandatory. Max 20% position. 1% portfolio risk max.
Adaptive Rules: ${ctx.adaptiveRules}

=== YOUR THREE-STAGE INTERNAL DEBATE ===

STAGE 1 — BULL CASE:
Argue the strongest honest case FOR taking this trade. Cite specific data: which technical
conditions support it, whether Kronos confirms direction, whether news/regime is favorable,
and whether similar past trades in memory succeeded under comparable conditions. If the bull
case is genuinely weak, say so — do not manufacture optimism.

STAGE 2 — BEAR CASE:
Argue the strongest honest case AGAINST taking this trade, independent of Stage 1. Cite
specific counter-evidence: conflicting Kronos signal, unfavorable regime multiplier, bearish
or high-impact news in the window, similar past trades in memory that failed, poor R/R,
or weak confluence. If the bear case is genuinely weak, say so.

STAGE 3 — RISK ASSESSMENT:
Independent of which case was stronger, assess risk mechanics: does the stop loss respect the
1% portfolio risk rule at the position size implied by signal confidence? Is volatility_regime
HIGH or EXTREME (if so, position size must be reduced)? Is there a correlation or earnings-
blackout conflict? Flag any hard-rule violation explicitly — a hard-rule violation forces REJECT
regardless of how the bull/bear cases came out.

STAGE 4 — VERDICT:
Weigh Stage 1 against Stage 2 through the lens of Stage 3. If Kronos and technicals agree,
that raises conviction; if they disagree, that lowers it and should be visible in how you
weighed the two cases. A hard-rule flag from Stage 3 overrides everything — REJECT.

Return ONLY this JSON, no text outside the JSON object:
{
  "bull_case":     "2–3 sentence strongest case for the trade, or why it's weak",
  "bear_case":     "2–3 sentence strongest case against the trade, or why it's weak",
  "risk_flags":    ["array of specific hard-rule or risk concerns, empty array if none"],
  "action":        "APPROVE" | "REJECT" | "MODIFY",
  "confidence":    0.0–1.0,
  "reasoning":     "1–2 sentence synthesis explaining how bull vs bear was resolved into the verdict",
  "position_size_modifier": 0.5–1.0,
  "modified_stop": null | number,
  "reject_reason": null | string,
  "kronos_alignment": "CONFIRMS" | "CONTRADICTS" | "NEUTRAL" | "UNAVAILABLE"
}
`;
```

### Storage Note

`bull_case`, `bear_case`, and `risk_flags` should be persisted alongside the existing decision fields in the `trades` table (or a new `trade_decisions` table) rather than discarded after parsing. Two reasons: (1) the new Logs screen (Section 16) can show the actual reasoning trail per trade, not just the verdict; (2) Sonnet's post-trade reflection can compare which side of the debate the outcome actually validated, a stronger reflection signal than outcome alone.

---

## 8. Phase 6: Database Schema Additions

**File:** `memory/schema_additions.sql`

```sql
-- Add to existing schema

-- Kronos forecast storage
CREATE TABLE kronos_forecasts (
  id                   TEXT PRIMARY KEY,
  trade_id             TEXT,           -- FK to trades.id (set when trade is approved)
  bot_id               TEXT,
  asset                TEXT NOT NULL,
  timeframe            TEXT NOT NULL,
  direction            TEXT NOT NULL,  -- UP | DOWN | NEUTRAL
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
  -- Accuracy tracking (filled in when trade closes)
  actual_change_pct    REAL,
  was_correct          INTEGER,        -- 1=correct direction, 0=wrong, NULL=pending
  -- Meta
  requested_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at         TIMESTAMP,
  latency_ms           INTEGER
);

-- OHLCV bar cache (refreshed from Alpaca WebSocket)
CREATE TABLE ohlcv_cache (
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

-- Keep only last 500 bars per asset/timeframe
CREATE TRIGGER trim_ohlcv_cache AFTER INSERT ON ohlcv_cache
BEGIN
  DELETE FROM ohlcv_cache
  WHERE asset = NEW.asset AND timeframe = NEW.timeframe
    AND timestamp NOT IN (
      SELECT timestamp FROM ohlcv_cache
      WHERE asset = NEW.asset AND timeframe = NEW.timeframe
      ORDER BY timestamp DESC LIMIT 500
    );
END;

-- Kronos accuracy view (auto-computed)
CREATE VIEW kronos_accuracy AS
SELECT
  asset,
  timeframe,
  model_used,
  COUNT(*)                                          AS total_forecasts,
  SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) AS correct,
  ROUND(
    100.0 * SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) / COUNT(*), 1
  )                                                 AS accuracy_pct,
  ROUND(AVG(latency_ms), 0)                         AS avg_latency_ms,
  MIN(requested_at)                                 AS first_forecast,
  MAX(requested_at)                                 AS last_forecast
FROM kronos_forecasts
WHERE was_correct IS NOT NULL
GROUP BY asset, timeframe, model_used;

CREATE INDEX idx_kf_asset     ON kronos_forecasts(asset);
CREATE INDEX idx_kf_trade     ON kronos_forecasts(trade_id);
CREATE INDEX idx_kf_correct   ON kronos_forecasts(was_correct);
CREATE INDEX idx_ohlcv_lookup ON ohlcv_cache(asset, timeframe, timestamp DESC);
```

---

## 9. Phase 7: UI Integration

### 9.1 — Trade Card: Kronos Badge

Every trade in the Trade Feed gets a Kronos alignment badge:

```typescript
// src/components/trades/KronosAlignmentBadge.tsx

type Alignment = 'CONFIRMS' | 'CONTRADICTS' | 'NEUTRAL' | 'UNAVAILABLE';

const BADGE_CONFIG: Record<Alignment, { label: string; color: string; bg: string }> = {
  CONFIRMS:      { label: 'Kronos ✓',     color: '#3FB950', bg: '#0A1A0A' },
  CONTRADICTS:   { label: 'Kronos ✗',     color: '#F85149', bg: '#1A0A0A' },
  NEUTRAL:       { label: 'Kronos →',     color: '#D29922', bg: '#1A1400' },
  UNAVAILABLE:   { label: 'No Kronos',    color: '#484F58', bg: '#161B22' },
};

export const KronosAlignmentBadge = ({ alignment }: { alignment: Alignment }) => {
  const cfg = BADGE_CONFIG[alignment];
  const r   = useResponsive();
  return (
    <View style={{
      backgroundColor: cfg.bg,
      borderWidth: 1,
      borderColor: cfg.color,
      borderRadius: 4,
      paddingHorizontal: r.spacing.sm,
      paddingVertical:   2,
    }}>
      <Text variant="caption" style={{ color: cfg.color, fontFamily: 'monospace' }}>
        {cfg.label}
      </Text>
    </View>
  );
};
```

---

### 9.2 — Forecast Overlay on Price Chart

On the Trade Feed equity chart, overlay the Kronos forecast as a dashed continuation:

```typescript
// src/components/charts/ForecastOverlay.tsx
// Uses Victory Native for chart rendering

// The overlay renders:
// - Solid line: actual price history
// - Dashed line: Kronos mean forecast path (different color)
// - Shaded band: predicted high/low range (low opacity fill)
// - Vertical dashed line: "NOW" separator
// - Direction arrow: small up/down at the end of the forecast line

// On small screens (isXs/isSm):
// - Shaded band hidden (too noisy on small screen)
// - Only mean forecast line shown
// - Direction badge shown as text below chart instead of arrow overlay

// Responsive chart height:
// - isXs:  160px
// - isSm:  200px
// - isMd:  240px
// - isLg+: 300px
```

---

### 9.3 — Intelligence Screen: Kronos Panel

New panel on the Intelligence screen showing Kronos forecasts for all active bot assets:

```
┌─────────────────────────────────────────────────────┐
│  KRONOS FORECASTS                    kronos-small ↑  │
│  Updated 2 min ago                                   │
├─────────────────────────────────────────────────────┤
│  BTC/USD    📈 UP 73%    +1.8%   Vol: NORMAL         │
│  ETH/USD    📉 DOWN 61%  -0.9%   Vol: HIGH  ⚠️        │
│  NVDA       ↔️  NEUTRAL          Vol: LOW             │
├─────────────────────────────────────────────────────┤
│  Model Accuracy (last 50 forecasts)                  │
│  BTC/USD    ████████░░  64%  correct direction        │
│  ETH/USD    ███████░░░  58%  correct direction        │
│  NVDA       █████████░  71%  correct direction        │
└─────────────────────────────────────────────────────┘
```

---

### 9.4 — Settings: Kronos Configuration

New sub-section in Settings screen:

```typescript
// Fields to add to Settings screen:

// Kronos Service URL    [https://atlas-kronos-XXXX.onrender.com  ]
// Kronos API Key        [••••••••••••••••  ] [Reveal] [Test]
// Model preference      [ kronos-small ▼ ]
// Sample count          [ 5 ▼ ]  (higher = more accurate, slower)
// Forecast horizon      [ 24 bars ▼ ]
// Keep-alive ping       [●] Enabled  (prevents cold starts)
// Fallback behaviour    [ Skip Kronos ▼ ] | [ Use last forecast ▼ ]

// "Test Connection" button:
// → Calls /health endpoint
// → Shows: ✓ Connected | kronos-small | uptime: 4h 32m
//    OR:   ✗ Service unavailable (tap to retry)
```

---

## 10. Phase 8: Forecast Accuracy Tracking

After every trade closes, backfill the accuracy of the Kronos forecast that preceded it:

```typescript
// src/services/kronosAccuracyTracker.ts

export async function recordForecastOutcome(
  tradeId:         string,
  actualChangePct: number,  // actual % change from entry to exit
): Promise<void> {

  // Find the forecast linked to this trade
  const forecast = await db.getFirstAsync<StoredForecast>(
    `SELECT * FROM kronos_forecasts WHERE trade_id = ? LIMIT 1`,
    [tradeId]
  );

  if (!forecast) return;

  // Was the direction correct?
  const predictedUp   = forecast.direction === 'UP';
  const actuallyWentUp= actualChangePct > 0;
  const wasCorrect    = (predictedUp === actuallyWentUp) &&
                        forecast.direction !== 'NEUTRAL';

  await db.runAsync(
    `UPDATE kronos_forecasts
     SET actual_change_pct = ?, was_correct = ?
     WHERE id = ?`,
    [actualChangePct, wasCorrect ? 1 : 0, forecast.id]
  );

  // Feed accuracy into post-trade reflection context for Sonnet
  await db.runAsync(
    `INSERT INTO brain_insights (category, content, source_trade)
     VALUES ('kronos_accuracy', ?, ?)`,
    [
      `Kronos predicted ${forecast.direction} (${(forecast.direction_confidence*100).toFixed(0)}% conf). ` +
      `Actual: ${actualChangePct > 0 ? 'UP' : 'DOWN'} ${actualChangePct.toFixed(2)}%. ` +
      `Result: ${wasCorrect ? 'CORRECT' : 'WRONG'}.`,
      tradeId
    ]
  );
}
```

### Accuracy Feedback Loop

The weekly Opus review now includes Kronos accuracy statistics:

```typescript
const weeklyReviewContext = `
...existing context...

=== KRONOS FORECAST ACCURACY (last 7 days) ===
${kronosAccuracyStats.map(s =>
  `${s.asset}: ${s.accuracy_pct}% correct direction (${s.total_forecasts} forecasts, avg latency ${s.avg_latency_ms}ms)`
).join('\n')}

If Kronos accuracy for an asset is below 50% consistently:
→ Recommend reducing its weight in the decision prompt for that asset
→ Flag for review in adaptive rules
`;
```

---

## 11. Phase 9: Fine-Tuning on ATLAS Trade Data

Once ATLAS has accumulated 500+ closed trades (typically 2–4 months of active trading), fine-tune Kronos on your own trade data to improve its accuracy on your specific assets and timeframes.

### When to Fine-Tune

| Condition | Action |
|---|---|
| < 500 trades | Use pre-trained Kronos as-is |
| 500–2,000 trades | Fine-tune tokenizer only (lighter, faster) |
| > 2,000 trades | Fine-tune tokenizer + predictor together |
| Kronos accuracy < 52% on a key asset after 200+ forecasts | Trigger fine-tuning |

### Fine-Tuning Data Export

```typescript
// src/services/kronosFineTuneExporter.ts
// Exports ATLAS trade bar data in Kronos-compatible format

export async function exportFineTuneData(): Promise<string> {
  const trades = await db.getAllAsync<TradeWithBars>(
    `SELECT t.*, o.open, o.high, o.low, o.close, o.volume, o.timestamp as bar_ts
     FROM trades t
     JOIN ohlcv_cache o ON o.asset = t.asset
     WHERE t.status = 'closed'
     ORDER BY t.asset, o.timestamp`
  );

  // Format as CSV matching Kronos finetune_csv/ expected format:
  // timestamp,open,high,low,close,volume
  const csvRows = trades.map(row =>
    `${row.bar_ts},${row.open},${row.high},${row.low},${row.close},${row.volume}`
  );

  return ['timestamp,open,high,low,close,volume', ...csvRows].join('\n');
  // Export this CSV → run finetune/train_tokenizer.py and train_predictor.py
  // from the Kronos repo → deploy fine-tuned model to your Render service
}
```

---

## 12. Failure Modes & Fallback Logic

**Critical design rule: Kronos failure must never block a trade.**

```typescript
// Every Kronos call follows this pattern:
const kronos = await kronosClient.forecast(req).catch(() => null);
// null = service down, timed out, or model error

// In Opus context:
// - kronos === null → Opus sees "KRONOS UNAVAILABLE" and proceeds
// - This is handled in buildKronosSection()
```

| Failure | Cause | Behaviour |
|---|---|---|
| Service cold start | First request after 15min idle | Keep-alive prevents. If it happens: 60s wait, then timeout → null → trade proceeds without Kronos |
| Render free tier down | Render maintenance | null returned, trade proceeds, Slack alert if >3 consecutive failures |
| Kronos-small OOM | 512MB RAM exceeded | Auto-fall back to Kronos-mini at model load time |
| Inference timeout (>15s) | Overloaded CPU | AbortController fires, null returned |
| Network offline | Device has no internet | null returned immediately |
| Stale cache | Same bars requested twice | Cache returns fresh result within 5 min TTL |
| Invalid bars (< 50) | New asset, insufficient history | Pydantic validator rejects, HTTP 422, null returned |

---

## 13. Cost & Resource Reference

### Microservice Costs

| Resource | Free Tier | What We Use | Cost |
|---|---|---|---|
| Render web service | 750 hrs/month | ~550 hrs (trading hours + keep-alive) | $0 |
| Render RAM | 512MB | ~250MB (Kronos-small) | $0 |
| Egress bandwidth | 100GB/month | ~2GB (forecast responses) | $0 |
| HuggingFace model download | Free | ~200MB one-time | $0 |
| **Total microservice cost** | | | **$0/month** |

### Latency Budget

| Step | Time |
|---|---|
| App → Kronos service (network) | 50–200ms |
| Kronos inference (CPU, small) | 3,000–8,000ms |
| Kronos inference (CPU, mini) | 500–2,000ms |
| Cache hit (no inference) | 50–200ms |
| Service response → app | 50–200ms |
| **Total (cache miss)** | **3–9 seconds** |
| **Total (cache hit)** | **< 0.5 seconds** |

This fits within the 10-second total decision pipeline budget from the NFRs.

---

## 14. Implementation Timeline

```
WEEK 1: Python Microservice
  Day 1:  Create atlas-kronos-service/ repo, write schemas.py
  Day 2:  Write kronos_predictor.py + cache.py
  Day 3:  Write main.py FastAPI app
  Day 4:  Local testing with Docker
          Test with real BTC/USD data from Alpaca
          Verify KronosForecast output shape
  Day 5:  Deploy to Render, get live URL + API key
          End-to-end test: curl /forecast with real data

WEEK 2: ATLAS App Client
  Day 1:  Write src/types/kronos.ts
  Day 2:  Write src/services/kronosClient.ts
          Add OHLCV cache table to SQLite schema
          Add kronos_forecasts table
  Day 3:  Write OHLCV bar streaming from Alpaca WebSocket into SQLite cache
  Day 4:  Wire kronosClient.forecast() into botDecisionEngine.ts
  Day 5:  Write contextBuilder.ts Kronos section
          Write updated Opus trade decision prompt

WEEK 3: Integration & Accuracy
  Day 1:  Full end-to-end test: signal → Kronos → Opus → paper trade
          Verify null fallback works correctly
  Day 2:  Write kronosAccuracyTracker.ts
          Wire into trade close handler
  Day 3:  Keep-alive integration in app lifecycle
          Settings screen: Kronos configuration section
          Test Connection button
  Day 4:  UI: KronosAlignmentBadge on trade cards
          UI: Forecast chart overlay (basic version)
  Day 5:  UI: Intelligence screen Kronos panel
          UI: Model accuracy display

WEEK 4: Hardening & Testing
  Day 1:  All failure mode tests (kill service mid-trade, timeout, OOM simulation)
  Day 2:  Latency profiling — measure P50/P95 inference time on Render
          Cache hit rate optimisation
  Day 3:  Paper trade with Kronos active for 5 full trading days
          Compare decisions with vs without Kronos context
  Day 4:  Edge cases: new asset with <50 bars, NEUTRAL direction handling
          Responsive UI audit for all Kronos components
  Day 5:  Document fine-tuning export flow
          Final review + merge
```

---

## 15. Testing Checklist

### Microservice Tests

- [ ] `/health` returns `model_loaded: true` within 30s of cold start
- [ ] `/ping` returns 200 within 500ms
- [ ] `/forecast` with 400 BTC bars returns valid `KronosForecast`
- [ ] `/forecast` with 49 bars returns HTTP 422 (validation error)
- [ ] `/forecast` with no API key returns HTTP 401
- [ ] `/forecast/batch` with 3 assets returns 3 results
- [ ] Cache hit on identical asset+timeframe+last_bar returns in <500ms
- [ ] If Kronos-small fails to load, Kronos-mini is loaded instead
- [ ] Service stays warm during 10-minute keep-alive interval

### ATLAS App Integration Tests

- [ ] `kronosClient.forecast()` returns `KronosForecast` on successful call
- [ ] `kronosClient.forecast()` returns `null` if service is down (no crash)
- [ ] `kronosClient.forecast()` returns `null` if request times out at 15s
- [ ] Trade decision proceeds normally when Kronos returns `null`
- [ ] Opus prompt includes Kronos section when forecast available
- [ ] Opus prompt includes "KRONOS UNAVAILABLE" when `null`
- [ ] `kronos_forecasts` table populated after each forecast call
- [ ] `was_correct` field updated when trade closes
- [ ] Keep-alive starts when trading engine starts, stops when it stops

### Decision Quality Tests

- [ ] Opus correctly identifies `kronos_alignment: "CONFIRMS"` when directions match
- [ ] Opus correctly identifies `kronos_alignment: "CONTRADICTS"` when directions differ
- [ ] `position_size_modifier < 1.0` when volatility_regime is HIGH
- [ ] `position_size_modifier = 0` (REJECT) possible when Kronos strongly contradicts technicals
- [ ] Trade card shows correct KronosAlignmentBadge
- [ ] Intelligence screen shows live accuracy % per asset

### Responsive UI Tests

- [ ] KronosAlignmentBadge fits on trade card on iPhone SE (375px)
- [ ] Kronos panel on Intelligence screen doesn't overflow on any device
- [ ] Forecast chart overlay renders correctly in both portrait and landscape
- [ ] "Kronos Unavailable" state shown gracefully when service is down
- [ ] All Kronos percentages truncated to 1 decimal place maximum

---

## 16. Logs Screen

### Purpose

A new dedicated screen — 3rd tab in the navbar — providing a real-time, chronological, append-only event feed of everything ATLAS does. This is the primary debugging and monitoring surface; the Intelligence screen's news feed stays capped at the last 20 items, and the Logs screen is where the full unbounded history lives.

### Log Event Structure

```typescript
// src/types/logs.ts

export type LogLevel    = 'info' | 'success' | 'warning' | 'error' | 'system';
export type LogCategory =
  | 'signal' | 'decision' | 'execution' | 'risk' | 'kronos'
  | 'regime' | 'news' | 'bot_lifecycle' | 'btc' | 'system';

export interface LogEvent {
  id:         string;
  timestamp:  string;
  level:      LogLevel;
  category:   LogCategory;
  bot_id?:    string;
  trade_id?:  string;
  asset?:     string;
  title:      string;    // one-line summary — always shown
  detail?:    string;    // expandable — Opus bull/bear/risk reasoning, JSON, etc.
  metadata?:  Record<string, string | number>;
  is_read:    boolean;
}
```

Events are emitted for: signal generated; trade approved/rejected (with full bull/bear/risk reasoning from Section 7 in the expandable `detail`); order submitted/filled/closed (with P&L); risk engine fired; Kronos forecast received; HMM regime changed; breaking news classified; bot born/promoted/warned/died; BTC conversion executed; system errors.

### The `logger` Service

```typescript
// src/services/logger.ts
// Single write path — every other service calls logger.*, nothing writes to
// log_events directly. This keeps the event schema consistent app-wide.

export const logger = {
  tradeApproved:   (tradeId: string, botId: string, asset: string, decision: OpusDecision) =>
    emit({
      level: 'success', category: 'decision', trade_id: tradeId, bot_id: botId, asset,
      title: `${asset} ${decision.action} — confidence ${(decision.confidence * 100).toFixed(0)}%`,
      detail: JSON.stringify({ bull: decision.bull_case, bear: decision.bear_case, risk: decision.risk_flags }, null, 2),
    }),
  tradeRejected:   (tradeId: string, botId: string, asset: string, reason: string) =>
    emit({ level: 'warning', category: 'decision', trade_id: tradeId, bot_id: botId, asset, title: `${asset} REJECTED — ${reason}` }),
  orderFilled:     (tradeId: string, asset: string, pnl?: number) =>
    emit({ level: 'success', category: 'execution', trade_id: tradeId, asset, title: pnl != null ? `${asset} closed, P&L ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%` : `${asset} order filled` }),
  riskFired:       (rule: string, detail: string) =>
    emit({ level: 'warning', category: 'risk', title: `Risk rule fired: ${rule}`, detail }),
  kronosForecast:  (asset: string, direction: string, confidence: number) =>
    emit({ level: 'info', category: 'kronos', asset, title: `Kronos: ${asset} ${direction} (${(confidence * 100).toFixed(0)}%)` }),
  regimeChanged:   (from: string, to: string) =>
    emit({ level: 'info', category: 'regime', title: `Regime shift: ${from} → ${to}` }),
  botDied:         (botId: string, cause: string) =>
    emit({ level: 'error', category: 'bot_lifecycle', bot_id: botId, title: `Bot ${botId} died — ${cause}` }),
  btcConverted:    (usd: number, btc: number) =>
    emit({ level: 'success', category: 'btc', title: `Converted $${usd.toFixed(2)} → ${btc.toFixed(6)} BTC` }),
  error:           (source: string, message: string) =>
    emit({ level: 'error', category: 'system', title: `${source}: ${message}` }),
};

function emit(partial: Omit<LogEvent, 'id' | 'timestamp' | 'is_read'>) {
  const event: LogEvent = { id: uuid(), timestamp: new Date().toISOString(), is_read: false, ...partial };
  db.insert('log_events', event);
  notifySubscribers(event);   // fires subscribeToLogs() callbacks synchronously
}
```

### Real-Time Updates

`subscribeToLogs(callback)` lets the Logs screen (and the navbar unread badge) register a callback that fires synchronously on every `emit()` call — no polling. New events prepend to the top of the list. Auto-scroll to top only if the user is already scrolled to top (don't yank focus away from something they're reading).

### Filtering

Horizontal scroll chips for category (10 options) and level (5 options), combinable. Bot and asset filters available via swipe gestures on individual rows ("show only this bot" / "show only this asset").

### Error Auto-Expand

`error`-level events auto-expand their `detail` field on arrival, so critical failures surface immediately without a tap.

### SQLite Schema Addition

```sql
CREATE TABLE log_events (
  id          TEXT PRIMARY KEY,
  timestamp   TIMESTAMP NOT NULL,
  level       TEXT NOT NULL,
  category    TEXT NOT NULL,
  bot_id      TEXT,
  trade_id    TEXT,
  asset       TEXT,
  title       TEXT NOT NULL,
  detail      TEXT,
  metadata    TEXT,           -- JSON blob
  is_read     INTEGER DEFAULT 0
);

CREATE INDEX idx_log_timestamp ON log_events(timestamp DESC);
CREATE INDEX idx_log_level     ON log_events(level);
CREATE INDEX idx_log_category  ON log_events(category);
CREATE INDEX idx_log_bot       ON log_events(bot_id);
CREATE INDEX idx_log_trade     ON log_events(trade_id);
CREATE INDEX idx_log_unread    ON log_events(is_read);

-- Auto-trim: keep max 2000 events
CREATE TRIGGER trim_log_events AFTER INSERT ON log_events
BEGIN
  DELETE FROM log_events
  WHERE id NOT IN (SELECT id FROM log_events ORDER BY timestamp DESC LIMIT 2000);
END;
```

### Screen Layout

```typescript
// src/screens/LogsScreen.tsx
// Uses Screen primitive (scroll={true}) — NOT a raw FlatList-in-ScrollView (see Section 18, Bug 6).
// FlatList is the top-level scroll container; filter chips are a sticky header via ListHeaderComponent.

// Row layout per event:
// [level icon] [category chip]  title                          [timestamp, flexShrink: 0]
//                                detail (collapsed, tap to expand)
```

---

## 17. Icon-Only Bottom Navbar

### Decision

No text labels rendered on any tab, anywhere. Icons alone communicate meaning. Labels exist only as `accessibilityLabel` for screen readers — WCAG compliance is maintained even though nothing is visually rendered.

### Six Tabs

```typescript
// src/navigation/TabNavigator.tsx

import { LayoutDashboard, Swords, ScrollText, BrainCircuit, Bitcoin, Settings2 } from 'lucide-react-native';

const TABS = [
  { name: 'Home',         icon: LayoutDashboard, a11yLabel: 'Home — Mission Control' },
  { name: 'BotArena',     icon: Swords,           a11yLabel: 'Bot Arena' },
  { name: 'Logs',         icon: ScrollText,       a11yLabel: 'Logs' },
  { name: 'Intelligence', icon: BrainCircuit,     a11yLabel: 'Intelligence' },
  { name: 'BtcStack',     icon: Bitcoin,           a11yLabel: 'BTC Stack' },
  { name: 'Settings',     icon: Settings2,        a11yLabel: 'Settings' },
] as const;

<Tab.Navigator
  screenOptions={{
    tabBarShowLabel: false,   // <-- the key line; global, no per-screen overrides needed
    tabBarActiveTintColor: '#58A6FF',
    tabBarInactiveTintColor: '#484F58',
  }}
>
  {TABS.map(t => (
    <Tab.Screen
      key={t.name}
      name={t.name}
      component={SCREEN_COMPONENTS[t.name]}
      options={{
        tabBarAccessibilityLabel: t.a11yLabel,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon Icon={t.icon} focused={focused} color={color} showUnreadDot={t.name === 'Logs'} />
        ),
      }}
    />
  ))}
</Tab.Navigator>
```

### Active / Inactive State

```typescript
// src/components/nav/TabIcon.tsx

const TabIcon = ({ Icon, focused, color, showUnreadDot }: TabIconProps) => {
  const unread = useLogsStore(s => s.unreadCount);
  return (
    <View style={{ alignItems: 'center' }}>
      {focused && <View style={{ height: 2, width: 20, backgroundColor: '#58A6FF', borderRadius: 1, marginBottom: 4 }} />}
      <View>
        <Icon color={color} strokeWidth={focused ? 2.5 : 1.8} size={24} />
        {showUnreadDot && unread > 0 && (
          <View style={{
            position: 'absolute', top: -2, right: -4,
            width: 8, height: 8, borderRadius: 4, backgroundColor: '#F85149',
          }} />
        )}
      </View>
    </View>
  );
};
```

Active tab: icon colour `#58A6FF`, stroke width 2.5, thin blue indicator bar above the icon.
Inactive tab: icon colour `#484F58`, stroke width 1.8, no indicator.

### Unread Badge

Red dot (8×8px, `#F85149`), Logs icon only, shown when `unreadCount > 0` AND the user is not currently on the Logs screen. No number rendered — avoids overflow past 99 unread. Badge clears when the user navigates to Logs (mark-all-read on screen focus).

### Layout Constraint

All 6 icons must fit on a 375px screen (iPhone SE) simultaneously without a labels row — each tab gets ~62.5px width, which is a comfortable touch target (Apple HIG minimum is 44px).

---

## 18. Intelligence Screen Responsive Fix

Five layout bugs plus one structural scroll bug, all traced to hardcoded pixel values and unconstrained flex containers. Every fix below routes through the existing `useResponsive()` hook (Section 9, `r.cardWidth`, `r.spacing`) rather than introducing new dimension logic.

### Bug 1: Regime Badge Overflow
**Cause:** Fixed-width badge next to the regime label in a row with no flex constraints — badge got pushed off-screen on narrow devices.
**Fix:** Regime label gets `flex: 1`; badge gets `flexShrink: 0` + `minWidth: 80`.

### Bug 2: Regime History Chart Overflow
**Cause:** Chart width hardcoded to ~340px, exceeding card width on iPhone SE.
**Fix:** `chartWidth = r.cardWidth - r.spacing.md * 2` — same pattern already used for the Kronos forecast overlay in Section 9.2.

### Bug 3: Fear & Greed Gauge Overflow
**Cause:** Fixed 280px circle regardless of screen size.
**Fix:** `gaugeDiameter = Math.min(r.cardWidth * 0.7, 220)`. Score label inside the gauge uses `fitFontSize()`.

### Bug 4: News Headlines Running Off Screen
**Cause:** No flex constraint on the headline text container.
**Fix:** Text container gets `flex: 1` + `minWidth: 0` (the `minWidth: 0` is load-bearing — RN flex containers won't shrink below content size without it). Headline: `numberOfLines={2}`. Source + timestamp sit in a `Row` with source `flex: 1`, timestamp `flexShrink: 0`.

### Bug 5: Economic Calendar Time Cutoff
**Cause:** Event name had no width constraint and pushed the time column off-screen.
**Fix:** Event name gets `flex: 1` + `minWidth: 0` + `numberOfLines={2}`; time column gets `flexShrink: 0` + `minWidth: 60`.

### Bug 6: FlatList Nested Inside ScrollView (structural)
**Cause:** The news feed was a `FlatList` nested inside the screen's outer `ScrollView` — React Native explicitly forbids virtualized lists inside scroll containers; causes layout warnings and broken/janky scroll behaviour.
**Fix:** News feed on the Intelligence screen switches to a plain `map()` over the last 20 items (non-virtualized, bounded length — fine for 20 rows). The full unbounded, virtualized feed lives on the new Logs screen (Section 16), which is a top-level `FlatList`, not nested in anything.

### Corrected Screen Structure

```typescript
// src/screens/IntelligenceScreen.tsx

<Screen scroll={true}>
  <Stack gap="md">
    <Card><RegimeBadgeRow /></Card>          {/* Bug 1 fix */}
    <Card><RegimeHistoryChart width={r.cardWidth - r.spacing.md * 2} /></Card>  {/* Bug 2 fix */}
    <Card><FearGreedGauge diameter={Math.min(r.cardWidth * 0.7, 220)} /></Card> {/* Bug 3 fix */}
    <Card>
      {newsItems.slice(0, 20).map(item => <NewsRow key={item.id} item={item} />)} {/* Bug 4 + 6 fix */}
    </Card>
    <Card><EconomicCalendarList /></Card>    {/* Bug 5 fix */}
    <Card><KronosForecastPanel /></Card>      {/* Section 9.3, unchanged */}
  </Stack>
</Screen>
```

All charts and gauges on this screen now derive every dimension from `useResponsive()` — no component on this screen calls `Dimensions.get()` directly, consistent with the rule established for the rest of the app.

---

### Testing Checklist Additions

- [ ] Logs screen: new event appears at top of list within one render frame of `logger.*()` being called, no polling delay
- [ ] Logs screen: unread badge on nav icon clears immediately on navigating to Logs
- [ ] Logs screen: error-level event detail is auto-expanded on arrival
- [ ] Logs screen: filter chips combine (category + level) correctly
- [ ] Navbar: all 6 icons render with no label text, fit on 375px width
- [ ] Navbar: active tab shows blue icon + indicator bar; inactive tabs show muted icon only
- [ ] Navbar: unread dot only shows on Logs tab, only when count > 0, only when not on Logs screen
- [ ] Intelligence screen: no FlatList/ScrollView nesting warning in RN debug console
- [ ] Intelligence screen: all 5 bugs above verified fixed on iPhone SE (375px) and iPad (1024px)
- [ ] Opus prompt: `bull_case`, `bear_case`, `risk_flags` all present and non-empty in every decision response
- [ ] Opus prompt: a hard-rule flag in `risk_flags` always results in `action: "REJECT"`, verified across 20 sample decisions

---

*ATLAS × Kronos Integration Plan v1.1*
*Kronos is a forecasting layer, not a trading strategy. Always route through Opus + risk engine.*
*v1.1 adds: bull/bear/risk debate structure in the Opus trade decision prompt, the Logs screen, the icon-only bottom navbar, and the Intelligence screen responsive fixes.*
