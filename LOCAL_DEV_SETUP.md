# BookClub App — Local Development Setup Guide

> Written for a fresh Mac setup. Everything here reflects the actual working state of the codebase as of **May 2026**.  
> This guide also explains how local dev differs from production (AWS), and which services use Lambda vs not.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Docker Services (DynamoDB + S3)](#3-docker-services-dynamodb--s3)
4. [Backend Configuration](#4-backend-configuration)
5. [Frontend Configuration](#5-frontend-configuration)
6. [Starting Everything](#6-starting-everything)
7. [Logging In Locally](#7-logging-in-locally)
8. [Architecture: Local vs Production](#8-architecture-local-vs-production)
9. [Request Flow Walkthrough](#9-request-flow-walkthrough)
10. [Lambda in AWS vs Local](#10-lambda-in-aws-vs-local)
11. [Key Design Decisions & Fixes Made](#11-key-design-decisions--fixes-made)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install the following on your Mac:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18.x | `brew install node@18` |
| npm | 9+ | Comes with Node |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| VS Code | Latest | https://code.visualstudio.com |

Verify:
```bash
node --version    # v18.x.x
docker --version  # Docker version 24+
```

---

## 2. Clone & Install

```bash
# Clone the repo
git clone https://github.com/pedaganim/bookclub-app.git
cd bookclub-app/bookclub-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## 3. Docker Services (DynamoDB + S3)

The app needs two local AWS service emulators running in Docker.

### What runs in Docker

| Container | Port | Purpose |
|-----------|------|---------|
| `dynamodb-local` | `8000` | Local DynamoDB — stores all app data |
| `bookclub-localstack` | `4566` | LocalStack — emulates S3 for image uploads |
| `bookclub-dynamodb-admin` | `8001` | DynamoDB Admin GUI (optional, read-only browser UI) |

### Start the containers

```bash
# From the root of the repo (where docker-compose.yml lives)
cd /path/to/bookclub-app   # the root, NOT bookclub-app/bookclub-app

docker compose up -d dynamodb-local localstack dynamodb-admin
```

> ⚠️ **Important:** Use `localstack/localstack:3.8` (pinned in docker-compose.yml).  
> `localstack:latest` as of May 2026 requires a paid license and will exit with code 55.

### Create DynamoDB tables

```bash
cd bookclub-app/backend
npm run local:seed   # creates tables + seeds sample data
```

Tables created: `bookclub-local-books`, `bookclub-local-users`, `bookclub-local-bookclubs`, `bookclub-local-bookclub-members`, `bookclub-local-toy-listings`, `bookclub-local-messages`, `bookclub-local-conversations`, `bookclub-local-metadata-cache`

### Create the S3 bucket in LocalStack

```bash
cd bookclub-app/backend
node scripts/setup-localstack.js
```

This script:
- Creates bucket `bookclub-app-local-book-covers` in LocalStack
- Sets CORS to allow `localhost:3000`, `localhost:3001`, `localhost:3002`
- Sets a public-read bucket policy so uploaded images render in the browser

> Run this once after every `docker compose down` + `up` cycle (LocalStack doesn't persist bucket metadata across restarts by default).

### DynamoDB Admin GUI

Open http://localhost:8001 in a browser to visually browse/edit DynamoDB tables.

---

## 4. Backend Configuration

### `config/app.local.json`

This file tells the backend where to find local services. Create it at:

```
bookclub-app/backend/config/app.local.json
```

Contents:
```json
{
  "region": "us-east-1",
  "dynamodbEndpoint": "http://localhost:8000",
  "localstackEndpoint": "http://localhost:4566",
  "awsAccessKeyId": "local",
  "awsSecretAccessKey": "local"
}
```

> This file is read by `src/lib/aws-config.js` when `APP_ENV=local`. It is **never** deployed to AWS — it's gitignored.

### How `aws-config.js` works

```
APP_ENV=local  →  DynamoDB → localhost:8000
                  S3       → localhost:4566  (LocalStack)
                  Lambda   → localhost:4566  (LocalStack)
                  EventBridge → localhost:4566 (LocalStack)

APP_ENV=dev/prod → All services → real AWS endpoints (credentials from IAM/env)
```

The key guard in `src/lib/aws-config.js`:
```js
const isLocal = process.env.APP_ENV === 'local';
if (isLocal) {
  AWS.config.update({ dynamodb: { endpoint: '...' }, s3: { ... }, ... });
}
```

Production never sets `APP_ENV=local`, so this block is **never executed in production**.

---

## 5. Frontend Configuration

Create the file `bookclub-app/frontend/.env.local`:

```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_SKIP_AUTH=true
```

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | Points frontend to the local backend (no `/dev` or `/local` stage prefix) |
| `REACT_APP_SKIP_AUTH=true` | Bypasses Cognito — uses a local user automatically |

> ⚠️ `.env.local` is gitignored. Each developer creates their own copy.

---

## 6. Starting Everything

### Option A — VS Code (recommended)

Open VS Code in `bookclub-app/bookclub-app`. Press `F5` and select **"Debug Backend (local DynamoDB)"**.

This launch config:
- Sets `APP_ENV=local`
- Sets fake AWS credentials (`local`/`local`)
- Runs `serverless offline start --stage local --noPrependStageInUrl`
- Backend listens on `http://localhost:4000`

Then in a second terminal:
```bash
cd bookclub-app/frontend
npm start
# Frontend → http://localhost:3000
```

### Option B — Terminal

**Terminal 1 — Backend:**
```bash
cd bookclub-app/backend
APP_ENV=local \
AWS_ACCESS_KEY_ID=local \
AWS_SECRET_ACCESS_KEY=local \
AWS_REGION=us-east-1 \
npx serverless offline start \
  --config serverless-offline.yml \
  --stage local \
  --noPrependStageInUrl
```

**Terminal 2 — Frontend:**
```bash
cd bookclub-app/frontend
npm start
```

### Port summary

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| DynamoDB Local | http://localhost:8000 |
| LocalStack (S3) | http://localhost:4566 |
| DynamoDB Admin UI | http://localhost:8001 |

---

## 7. Logging In Locally

With `REACT_APP_SKIP_AUTH=true`, the frontend auto-logs you in as a local dev user — **no Cognito, no Google OAuth, no password needed**.

### What happens on startup

1. `AuthContext.tsx` sees `config.skipAuth === true`
2. It looks for an existing `local-token-*` in `localStorage`
3. If none found, it auto-calls `POST http://localhost:4000/auth/login` with:
   ```json
   { "email": "local-local-user@dev", "password": "local" }
   ```
4. Backend's local login handler creates/returns a user with `userId: local-user`
5. Tokens are stored in `localStorage` (`idToken`, `accessToken`)
6. App considers you logged in — no page refresh needed

### Manual login (if needed)

Open http://localhost:3000/dev-bookmarklet.html — click the login button.

Or via curl:
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"local-local-user@dev","password":"local"}'
```

---

## 8. Architecture: Local vs Production

### High-level diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LOCAL DEVELOPMENT                            │
│                                                                     │
│  Browser (localhost:3000)                                           │
│       │                                                             │
│       │ HTTP (axios)                                                │
│       ▼                                                             │
│  serverless-offline (localhost:4000)                                │
│  ┌──────────────────────────────────────────────┐                  │
│  │  Node.js Lambda handlers (same code as prod) │                  │
│  │  Books, Users, Clubs, DMs, Files, Contact    │                  │
│  └───────────┬──────────────────────────────────┘                  │
│              │                                                      │
│    ┌─────────┴───────────┐                                          │
│    ▼                     ▼                                          │
│  DynamoDB Local        LocalStack S3                                │
│  (localhost:8000)      (localhost:4566)                             │
│  [all tables]          [book-covers bucket]                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION (AWS)                            │
│                                                                     │
│  Browser / Mobile                                                   │
│       │                                                             │
│       │ HTTPS                                                       │
│       ▼                                                             │
│  AWS API Gateway (api.yourdomain.com)                               │
│       │                                                             │
│       ▼                                                             │
│  AWS Lambda (one function per route)                                │
│  ┌──────────────────────────────────────────────┐                  │
│  │  Same handler code — deployed via Serverless │                  │
│  └───────────┬──────────────────────────────────┘                  │
│              │                                                      │
│    ┌─────────┴──────────────┬───────────────────┐                  │
│    ▼                        ▼                   ▼                   │
│  AWS DynamoDB           AWS S3              AWS Cognito             │
│  (real tables)          (book-covers)       (auth)                  │
│                              │                                      │
│                    S3 Event → Lambda (processUpload)                │
│                              │                                      │
│                    AWS Textract / Bedrock (AI analysis)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key difference: Auth

| | Local | Production |
|--|-------|-----------|
| Auth provider | None (skip) | AWS Cognito + Google OAuth |
| Token type | `local-token-<userId>` or `local-id-<userId>` | Cognito JWT |
| Token verification | String prefix match in `local-storage.js` | Cognito JWKS verification |
| User creation | Auto-created on first login call | Cognito User Pool |

### Key difference: Storage routing

The models (`book.js`, `bookclub.js`, `user.js`, `dm.js`, `toyListing.js`) have an `isOffline()` guard:

```js
// Returns true only for legacy JSON-file mode (tests)
// When APP_ENV=local, this always returns false → real DynamoDB code path is used
const isOffline = () =>
  process.env.APP_ENV !== 'local' &&
  (process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true' || process.env.NODE_ENV === 'test');
```

| `isOffline()` = `true` | `isOffline()` = `false` |
|------------------------|------------------------|
| Read/write from `.local-storage/*.json` files | Read/write from DynamoDB |
| Only used in unit tests (`NODE_ENV=test`) | Used in both local dev AND production |

This means **local dev uses the exact same DynamoDB code path as production** — just pointed at a different endpoint.

---

## 9. Request Flow Walkthrough

### Example: User uploads a toy image

```
1. User picks image in browser (CreateListingModal)
   
2. Frontend → POST http://localhost:4000/upload-url
   body: { context: 'library', libraryType: 'toy', fileType: 'image/jpeg' }
   
3. Backend (generateUploadUrl.js):
   - Generates presigned S3 PUT URL pointing to LocalStack
     → http://localhost:4566/bookclub-app-local-book-covers/library-images/toy/<userId>/<uuid>.jpg?...
   - Pre-creates a draft ToyListing in DynamoDB with status='draft'
   - Returns: { uploadUrl, fileUrl, fileKey, listingId }

4. Frontend → PUT http://localhost:4566/...presigned-url...
   (Direct browser-to-LocalStack S3 upload, no backend involved)
   
5. Frontend → POST http://localhost:4000/books
   body: { coverImage: fileUrl, s3Key, s3Bucket, title, libraryType, extractFromImage: false }
   
6. Backend (create.js):
   - Saves ToyListing to DynamoDB with all fields
   - In production: would also trigger Textract/Bedrock AI analysis via EventBridge
   - In local: extractFromImage=false, so AI pipeline is skipped entirely
   
7. Frontend receives the created listing → shows in My Library
```

### Example: User adds a book

```
1. Frontend → POST http://localhost:4000/upload-url
   body: { context: 'book', fileType: 'image/jpeg' }
   
2. Backend returns presigned URL (no draft listing created for books)

3. Frontend → PUT <presigned URL>  (direct to LocalStack)

4. Frontend → POST http://localhost:4000/books
   body: { title, author, coverImage, s3Key, s3Bucket, extractFromImage: false }

5. Backend saves Book to DynamoDB → returns book record

6. In production: S3 event fires → processUpload Lambda → Textract reads text from image
   → Bedrock identifies book metadata → book record enriched automatically
   In local: this AI pipeline does NOT run (no S3 event wiring in LocalStack)
```

### Example: Auth flow (local)

```
1. App starts → AuthContext reads REACT_APP_SKIP_AUTH=true
2. Checks localStorage for existing local-token-* or local-id-*
3. Not found → calls POST /auth/login { email: "local-local-user@dev", password: "local" }
4. Backend local-storage.js verifyToken: sees "local-id-" prefix → resolves to userId=local-user
5. User object returned → stored in AuthContext.user
6. All subsequent API calls send Authorization: Bearer local-id-local-user header
7. Each handler calls User.getCurrentUser(token) → same prefix check → returns local user
```

---

## 10. Lambda in AWS vs Local

### In Production (AWS)

Every API route is a **separate Lambda function** invoked by API Gateway:

| Lambda Function | Route | What it does |
|----------------|-------|-------------|
| `createBook` | `POST /books` | Create book + trigger AI enrichment |
| `getBook` | `GET /books/{id}` | Fetch single book |
| `listBooks` | `GET /books` | List books for a user |
| `updateBook` | `PUT /books/{id}` | Update book fields |
| `deleteBook` | `DELETE /books/{id}` | Delete book |
| `register` | `POST /auth/register` | Create Cognito user |
| `login` | `POST /auth/login` | Auth (local only — prod uses Cognito) |
| `getProfile` | `GET /users/me` | Get logged-in user's profile |
| `generateUploadUrl` | `POST /upload-url` | Generate S3 presigned PUT URL |
| `createClub` | `POST /clubs` | Create a book club |
| `listClubs` | `GET /clubs` | List clubs for user |
| `browseClubs` | `GET /clubs/browse` | Public club discovery |
| `joinClub` | `POST /clubs/{id}/join` | Join a club |
| `createConversation` | `POST /messages` | Start a DM thread |
| `sendMessage` | `POST /messages/{id}` | Send a message |
| `submitContact` | `POST /contact` | Contact/feedback form |
| `processUpload` *(S3 trigger)* | — | Triggered by S3 `ObjectCreated` event → runs Textract + Bedrock AI |

### In Local Dev (serverless-offline)

The **same handler code** runs inside a single Node.js process — `serverless-offline` emulates Lambda + API Gateway locally. There is no real Lambda invocation; it's just an HTTP server that routes requests to the right handler function.

```
Browser → HTTP → serverless-offline (port 4000) → handler function → DynamoDB Local / LocalStack S3
```

### What does NOT work locally

| Feature | Why |
|---------|-----|
| **Textract / Bedrock AI** | Requires real AWS services — not emulated locally |
| **S3 → Lambda triggers** | LocalStack can do this in theory but we skip it; `extractFromImage: false` is sent locally |
| **Cognito auth** | No local Cognito emulator — replaced with `REACT_APP_SKIP_AUTH=true` |
| **SES email** | Real AWS SES only — contact form won't send emails locally |
| **CloudFront CDN** | Production-only — local images served directly from LocalStack |

---

## 11. Key Design Decisions & Fixes Made

### A. `isOffline()` guard in models

**Problem:** `serverless-offline` auto-sets `SERVERLESS_OFFLINE=true` → all models detected this and routed to JSON file storage (`.local-storage/*.json`) instead of DynamoDB.

**Fix:** Added `APP_ENV !== 'local'` guard so the JSON file path is only taken in tests:

```js
// In book.js, bookclub.js, user.js, dm.js, toyListing.js:
const isOffline = () =>
  process.env.APP_ENV !== 'local' &&
  (process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true' || process.env.NODE_ENV === 'test');
```

### B. DynamoDB rejects `null` attribute values

**Problem:** `PUT` operations failed with `ValidationException: Invalid attribute value type` because optional fields like `coverImage`, `isbn10`, `categories` were set to `null`.

**Fix:** Added `stripNulls()` in `dynamodb.js` — only runs when `APP_ENV=local` to avoid touching production behaviour:

```js
function stripNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  );
}
// In put():
Item: process.env.APP_ENV === 'local' ? stripNulls(item) : item,
```

### C. S3 upload was being skipped locally

**Problem:** `CreateListingModal` and `AddBookModal` had `if (!isLocal) { uploadToS3() }` — meaning images were never uploaded locally; listings were created with no image URL.

**Fix:** Local now uploads to LocalStack S3 via a presigned URL:

```ts
if (isLocal) {
  const urlData = await apiService.getLibraryUploadUrl(libraryType, file.type);
  await apiService.uploadToS3(urlData.uploadUrl, file);  // → localhost:4566
  uploadResult = { fileUrl: urlData.fileUrl, key: urlData.fileKey, ... };
} else {
  uploadResult = await apiService.uploadAnySize(file, ...);  // → real AWS S3
}
```

### D. API URL has no stage prefix

**Problem:** serverless-offline defaults to `/local/books`, `/local/clubs` etc. Frontend was calling `/books` → 404.

**Fix:** `--noPrependStageInUrl` flag in both `serverless-offline.yml` and the launch command:
```yaml
custom:
  serverless-offline:
    noPrependStageInUrl: true
```

### E. LocalStack version requires paid license

**Problem:** `localstack:latest` (v2026.5.x) exits immediately with `License activation failed`.

**Fix:** Pinned to last free version in `docker-compose.yml`:
```yaml
image: localstack/localstack:3.8
```

### F. CORS for LocalStack S3

The browser does a CORS preflight (OPTIONS) before a direct S3 PUT. The bucket CORS must allow your frontend's origin.

**Fix:** `scripts/setup-localstack.js` sets:
```js
AllowedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
```

Run `node scripts/setup-localstack.js` after every LocalStack restart.

---

## 12. Troubleshooting

### Backend won't start (Exit Code 1)

```bash
# Kill anything on port 4000 and retry
lsof -ti :4000 | xargs kill -9 2>/dev/null
```

### `ValidationException: Invalid attribute value type`

DynamoDB Local is running but a field is `null`. The `stripNulls` fix in `dynamodb.js` should handle this. If it persists, check that `APP_ENV=local` is set in the launch config.

### `net::ERR_CONNECTION_REFUSED` on S3 upload

LocalStack is not running.
```bash
docker compose up -d localstack
node backend/scripts/setup-localstack.js
```

### `net::ERR_FAILED` / CORS error on S3 upload

Old CORS config on the bucket. Re-run:
```bash
node backend/scripts/setup-localstack.js
```

### LocalStack exits immediately (code 55)

You're running `localstack:latest` which requires a paid license. Fix: ensure `docker-compose.yml` has `image: localstack/localstack:3.8`.

### Auth tokens wiped after refresh

Check that `REACT_APP_SKIP_AUTH=true` is in `frontend/.env.local`. Without it, the app calls `GET /users/me`, gets a 401, and calls `logout()`.

### Tables don't exist

```bash
cd bookclub-app/backend
npm run local:seed
```

### DynamoDB Admin UI shows nothing

Make sure `dynamodb-local` container is running:
```bash
docker compose up -d dynamodb-local dynamodb-admin
```
Then open http://localhost:8001.
