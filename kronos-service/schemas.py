from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum

class Timeframe(str, Enum):
    ONE_MIN   = "1min"
    FIVE_MIN  = "5min"
    FIFTEEN   = "15min"
    ONE_HOUR  = "1h"
    FOUR_HOUR = "4h"
    ONE_DAY   = "1d"

class OHLCVBar(BaseModel):
    timestamp: str
    open:      float
    high:      float
    low:       float
    close:     float
    volume:    Optional[float] = 0.0

class ForecastRequest(BaseModel):
    asset:        str
    timeframe:    Timeframe = Timeframe.FIFTEEN
    bars:         List[OHLCVBar]
    pred_len:     int = Field(24, ge=1, le=96)
    sample_count: int = Field(5, ge=1, le=20)

    @field_validator("bars")
    def validate_min_bars(cls, v):
        if len(v) < 10:
            raise ValueError("Minimum 10 bars required for forecast computation")
        return v[-400:]

class ForecastBar(BaseModel):
    timestamp:  str
    open:       float
    high:       float
    low:        float
    close:      float

class KronosForecast(BaseModel):
    asset:                str
    timeframe:            str
    pred_len:             int
    forecast_bars:        List[ForecastBar]
    direction:            str
    direction_confidence: float
    predicted_change_pct: float
    predicted_high_pct:   float
    predicted_low_pct:    float
    volatility_score:     float
    volatility_regime:    str
    peak_volatility_bar:  int
    forecast_confidence:  float
    path_agreement:       float
    model_used:           str
    inference_ms:         int
    bars_used:            int

class HealthResponse(BaseModel):
    status:       str
    model_loaded: bool
    model_name:   str
    uptime_s:     int
    last_request: Optional[str] = None
