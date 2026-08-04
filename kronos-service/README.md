# ATLAS Kronos Time-Series Forecasting Microservice

FastAPI + PyTorch CPU microservice serving Kronos time-series price forecasts for the ATLAS Autonomous Trading Engine.

## Endpoints

- `GET /health` — Returns status, loaded model name, and uptime.
- `GET /ping` — Keep-alive endpoint (called every 10 min to prevent free-tier cold starts).
- `POST /forecast` — Generates a 24-bar forecast given input OHLCV candles.
- `POST /forecast/batch` — Batch forecasts up to 10 assets simultaneously.

## Deployment on Render.com

This directory contains `render.yaml` pre-configured for Render.com free tier deployment.
