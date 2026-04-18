# Inbox Guardian Starter

Starter code for an **automation-first email triage app** focused on:
- scam detection
- opportunity detection
- personal vs transactional separation
- safe unsubscribe / report / quarantine recommendations

This repo gives you a **working starter** with:
- **FastAPI** backend
- **Next.js App Router** frontend
- deterministic **rules-first classifier**
- optional **OpenAI Responses API** explanation enhancer
- Gmail OAuth + recent inbox sync
- local SQLite-backed classified record store
- simple demo login with per-user record and Gmail token scoping

## What works now

- classify pasted email content through the backend
- connect a Gmail account with OAuth
- sync recent inbox messages from Gmail
- classify synced messages automatically
- store manual and Gmail-synced records in SQLite
- get:
  - category
  - risk score
  - confidence score
  - plain-English reasons
  - recommended action
- basic dashboard UI to test the classifier and run sync
- seeded sample inbox records for a smoother first demo
- seeded sample inbox records for a smoother first demo

## What still needs to be built

- production auth, passwordless login, and encrypted token storage
- background workers / scheduled sync
- safe unsubscribe executor
- provider spam/phishing reporting executor
- quarantine and hold-window workflow
- richer Gmail actions (archive, label, report)

## Folder structure

```text
backend/
  app/
    api/
    core/
    services/
  tests/
frontend/
  app/
  components/
```

## Fast demo

1. Start the backend and frontend.
2. Open `http://localhost:3000/login`.
3. Sign in as `mbma2264@gmail.com`.
4. Click **Load demo sample data** to populate the dashboard instantly.
5. Optionally connect Gmail and run a live sync.

A simple helper script is included for Mac/Linux: `./run-demo.sh`.

## Local setup

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend runs on `http://localhost:3000`  
Backend runs on `http://localhost:8000`

## Environment variables

### backend/.env

```env
APP_ENV=development
APP_NAME=Inbox Guardian API
FRONTEND_ORIGIN=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.1-mini
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/gmail/oauth/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify
GMAIL_TOKEN_STORE_PATH=./data/gmail-oauth.json
```

### frontend/.env.local

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
BACKEND_API_BASE_URL=http://localhost:8000
```

## Demo login

- Open `/login` and use the preset demo email `mbma2264@gmail.com` or another email for a separate demo session.
- The frontend stores a simple demo session cookie.
- Saved records and Gmail OAuth tokens are now scoped by the signed-in email.

## Gmail setup

1. Enable the Gmail API for your Google Cloud project.
2. Create a **Web application** OAuth client.
3. Add the backend callback URL as an authorized redirect URI.
4. Put the client ID and secret in `backend/.env`.
5. Open the dashboard and use **Connect Gmail**.

## API endpoints

- `GET /health`
- `POST /api/classify`
- `GET /api/gmail/status`
- `GET /api/gmail/oauth/start`
- `GET /api/gmail/oauth/callback`
- `POST /api/gmail/sync`

## Notes

- The OpenAI step is optional. If no API key is set, the backend uses rules-only classification.
- Gmail OAuth tokens are stored in a local JSON file for this starter, keyed by signed-in email. Replace that with encrypted per-user storage before production.
- Synced Gmail messages are deduped locally by Gmail message ID.
- The frontend SQLite record store uses Node's built-in `node:sqlite` module.

## Recommended next steps

1. Replace the single-user token file with real user accounts and encrypted token storage.
2. Add pagination + incremental sync using Gmail history IDs.
3. Add archive, label, and quarantine actions from the dashboard.
4. Add audit logs and safer automation rules.
5. Move sync into a background job.
