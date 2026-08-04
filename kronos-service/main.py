import logging, time, os, asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from schemas import ForecastRequest, KronosForecast, HealthResponse
from kronos_predictor import KronosService
from cache import ForecastCache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("atlas-kronos")

service: KronosService = None
cache = ForecastCache(ttl_seconds=300, max_size=50)
START_TIME = time.time()
KRONOS_API_KEY = os.environ.get("KRONOS_API_KEY", "")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global service
    logger.info("Initializing Kronos forecasting service...")
    service = KronosService()
    logger.info("✓ Kronos forecasting service ready!")
    yield
    logger.info("Shutting down Kronos service.")

app = FastAPI(
    title="ATLAS Kronos Service",
    description="Kronos time-series forecasting microservice for ATLAS trading engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def verify_api_key(request: Request):
    if not KRONOS_API_KEY:
        return  # Dev mode — open access
    key = request.headers.get("X-ATLAS-Key", "")
    if key != KRONOS_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid X-ATLAS-Key header")

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
    return {"status": "ok", "ts": time.time()}

@app.post("/forecast", response_model=KronosForecast, dependencies=[Depends(verify_api_key)])
async def forecast(req: ForecastRequest):
    if not service or not service.is_ready:
        raise HTTPException(status_code=503, detail="Kronos model not loaded yet")

    last_ts = req.bars[-1].timestamp
    cached = cache.get(req.asset, req.timeframe.value, last_ts)
    if cached:
        logger.info(f"Cache hit: {req.asset} {req.timeframe.value}")
        return cached

    try:
        result = await asyncio.get_event_loop().run_in_executor(None, service.forecast, req)
        cache.set(req.asset, req.timeframe.value, last_ts, result)
        logger.info(f"Forecast generated: {req.asset} -> {result.direction} ({result.direction_confidence*100:.0f}%) in {result.inference_ms}ms")
        return result
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast/batch", dependencies=[Depends(verify_api_key)])
async def forecast_batch(requests: list[ForecastRequest]):
    if len(requests) > 10:
        raise HTTPException(status_code=400, detail="Max 10 assets per batch request")

    results = []
    for req in requests:
        try:
            last_ts = req.bars[-1].timestamp
            cached = cache.get(req.asset, req.timeframe.value, last_ts)
            if cached:
                results.append(cached)
                continue

            result = await asyncio.get_event_loop().run_in_executor(None, service.forecast, req)
            cache.set(req.asset, req.timeframe.value, last_ts, result)
            results.append(result)
        except Exception as e:
            logger.error(f"Batch forecast error for {req.asset}: {e}")
            results.append({"error": str(e), "asset": req.asset})
    return results
