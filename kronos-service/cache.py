import hashlib, time
from typing import Optional, Dict, Tuple
from schemas import KronosForecast

class ForecastCache:
    def __init__(self, ttl_seconds: int = 300, max_size: int = 50):
        self._cache: Dict[str, Tuple[KronosForecast, float]] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size

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
            oldest = min(self._cache.items(), key=lambda x: x[1][1])
            del self._cache[oldest[0]]
        key = self._key(asset, timeframe, last_bar_ts)
        self._cache[key] = (result, time.time())
