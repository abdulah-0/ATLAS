# ATLAS Complete API Keys & Microservice Deployment Guide

This guide provides step-by-step instructions to obtain every required API key for **ATLAS (Autonomous Trading & Learning Agent System)** and deploy the **Kronos Deep-Learning Microservice** on Render.com for **$0/month**.

---

## Table of Contents

1. [OpenRouter API Key (LLM Decision Gateway)](#1-openrouter-api-key-llm-decision-gateway)
2. [Alpaca API Key & Secret Key (Paper & Live Trading)](#2-alpaca-api-key--secret-key-paper--live-trading)
3. [Pinecone API Key & Host Endpoint (Vector Memory RAG)](#3-pinecone-api-key--host-endpoint-vector-memory-rag)
4. [Kronos Microservice Deployment on Render.com](#4-kronos-microservice-deployment-on-rendercom)
5. [Supabase Project URL & Anon Key (Optional Data Layer)](#5-supabase-project-url--anon-key-optional-data-layer)
6. [Configuring Credentials in the ATLAS App](#6-configuring-credentials-in-the-atlas-app)

---

## 1. OpenRouter API Key (LLM Decision Gateway)

OpenRouter serves as the single multi-model API gateway powering Claude Opus 4.6 (Trade Decisions), Claude Sonnet 4.6 (Post-Trade Reflection), Claude Haiku (News Classification), Gemini, DeepSeek, and Llama.

### Step-by-Step Instructions:

1. **Create an Account**:
   - Go to **[https://openrouter.ai](https://openrouter.ai)**.
   - Click **Sign In** at the top right and log in using Google, GitHub, or Email.

2. **Generate API Key**:
   - Click your profile icon at the top right -> select **Keys** (or navigate to [https://openrouter.ai/keys](https://openrouter.ai/keys)).
   - Click **Create Key**.
   - Enter Name: `ATLAS Trading Bot`.
   - Leave Credit Limit blank (or set a budget limit if desired).
   - Click **Create**.
   - Copy your key immediately (starts with `sk-or-v1-...`).

3. **Add Credits**:
   - Navigate to **Credit / Balance** ([https://openrouter.ai/credits](https://openrouter.ai/credits)).
   - Add $5–$10 to your balance. (Estimated trading LLM cost is ~$7–$12/month).

---

## 2. Alpaca API Key & Secret Key (Paper & Live Trading)

Alpaca is the commission-free broker powering paper trading and live market execution for US Equities and Crypto.

### Step-by-Step Instructions:

1. **Create an Account**:
   - Go to **[https://alpaca.markets](https://alpaca.markets)**.
   - Click **Sign Up** and complete registration.

2. **Access Paper Trading Dashboard**:
   - Log in to your Alpaca Dashboard ([https://app.alpaca.markets](https://app.alpaca.markets)).
   - On the left sidebar or top right toggle, ensure **Paper Trading** is selected (starts with $100,000 virtual paper balance).

3. **Generate API Keys**:
   - On the right panel under **API Keys**, click **Generate New Key** (or **Reset API Key**).
   - Copy both:
     - **API Key ID** (starts with `PK...`)
     - **Secret Key** (starts with secret characters; visible only once).

---

## 3. Pinecone API Key & Host Endpoint (Vector Memory RAG)

Pinecone is the vector database storing trade DNA embeddings so Claude Opus can recall past wins/losses during trade evaluations.

### Step-by-Step Instructions:

1. **Create an Account**:
   - Go to **[https://www.pinecone.io](https://www.pinecone.io)**.
   - Click **Sign Up Free** and log in.

2. **Get API Key**:
   - On the left navigation menu, click **API Keys** ([https://app.pinecone.io/organizations/-/keys](https://app.pinecone.io/organizations/-/keys)).
   - Click **Create API Key** -> Name it `ATLAS Key`.
   - Copy your API Key (starts with `pcsk_...`).

3. **Create Serverless Index**:
   - On the left menu, click **Indexes** -> click **Create Index**.
   - **Index Name**: `atlas-trade-memory`
   - **Dimensions**: `1536` (matches OpenAI `text-embedding-3-small` vector size).
   - **Metric**: `Cosine`
   - **Cloud Provider**: `AWS` or `GCP`
   - **Region**: `us-east-1` (Free Tier).
   - Click **Create Index**.

4. **Copy Host Endpoint**:
   - Click on your new `atlas-trade-memory` index.
   - Under **Host**, copy the full HTTPS endpoint URL (e.g. `https://atlas-trade-memory-xxxx.svc.us-east1-aws.pinecone.io`).

---

## 4. Kronos Microservice Deployment on Render.com

The Kronos deep-learning forecasting microservice runs on a free Python + FastAPI server on Render.com.

### Step-by-Step Deployment Instructions:

#### Step 1: Ensure Code is Pushed to GitHub
The `kronos-service/` subfolder is already committed to your repository: **`https://github.com/abdulah-0/ATLAS.git`**.

#### Step 2: Create Render Web Service
1. Go to **[https://render.com](https://render.com)** and log in (or create a free account).
2. On your Render dashboard, click **New +** (top right) -> select **Web Service**.
3. Under **Connect a repository**, select your GitHub repository: **`abdulah-0/ATLAS`**.

#### Step 3: Configure Deployment Fields
Fill in the exact fields below:

| Field Name | Exact Value to Enter |
|---|---|
| **Name** | `atlas-kronos` |
| **Language / Runtime** | `Python 3` |
| **Branch** | `main` |
| **Root Directory** | `kronos-service` *(CRITICAL: enter `kronos-service` so Render deploys from the subfolder)* |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1` |
| **Instance Type** | **Free** ($0/month) |

#### Step 4: Add Environment Variables
Scroll down to **Environment Variables** -> click **Add Environment Variable**:

1. **`KRONOS_API_KEY`**: Set any secret password you choose (e.g., `kronos_secret_998877`).
2. **`HF_HOME`**: Set value to `/tmp/huggingface`.

#### Step 5: Deploy & Get Live Service URL
1. Click **Create Web Service**.
2. First deployment takes **4–6 minutes** as Render installs PyTorch CPU and loads model weights.
3. Once status displays **Live**, copy your service URL from the top left (e.g., `https://atlas-kronos-xxxx.onrender.com`).

#### Step 6: Test Deployment Health
Run in your computer's terminal:
```bash
curl https://atlas-kronos-xxxx.onrender.com/health
```
Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "kronos-small",
  "uptime_s": 120,
  "last_request": null
}
```

---

## 5. Supabase Project URL & Anon Key (Optional Data Layer)

Supabase provides remote database synchronization and user state persistence.

### Step-by-Step Instructions:

1. **Create an Account**:
   - Go to **[https://supabase.com](https://supabase.com)**.
   - Click **Start your project** and sign in with GitHub.

2. **Create a New Project**:
   - Click **New Project**.
   - Project Name: `ATLAS Database`.
   - Region: Select closest region (e.g. `US East`).
   - Click **Create New Project**.

3. **Get API Credentials**:
   - In your project dashboard, navigate to **Project Settings** (gear icon at bottom left) -> **API**.
   - Copy:
     - **Project URL** (e.g. `https://xxxx.supabase.co`)
     - **Project API Key / anon public** (starts with `eyJhbG...`).

---

## 6. Configuring Credentials in the ATLAS App

Once you have gathered your API keys, open your ATLAS Mobile App:

1. Open the **Settings** tab (6th icon on the bottom navigation bar).
2. Scroll to **5. Encrypted API Credentials**.
3. Fill in each field:

```text
• OpenRouter API Key (Claude / Gemini):
  sk-or-v1-...

• Alpaca API Key (Paper & Live):
  PK...

• Alpaca Secret Key:
  Your secret key...

• Pinecone API Key (Vector RAG Memory):
  pcsk_...

• Pinecone Index Host Endpoint:
  https://atlas-trade-memory-xxxx.svc.us-east1-aws.pinecone.io

• Kronos Service URL (Render Microservice):
  https://atlas-kronos-xxxx.onrender.com

• Kronos API Key (X-ATLAS-Key Header):
  kronos_secret_998877

• Supabase Project URL:
  https://xxxx.supabase.co

• Supabase Anon Key:
  eyJhbG...
```

4. Tap **SAVE CREDENTIALS TO SECURE STORE**.
5. Your credentials are now encrypted on-device using hardware-backed SecureStore (Android Keystore / iOS Keychain)! 🚀
