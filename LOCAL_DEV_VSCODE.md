# VS Code Launch & Task Configuration — Local Dev

> This document explains every entry in `.vscode/launch.json` and `.vscode/tasks.json`,
> what each one does, when to use it, and why each setting exists.

---

## File locations

```
bookclub-app/              ← repo root (where docker-compose.yml lives)
└── .vscode/
    ├── launch.json        ← debug/run configurations (F5 menu)
    └── tasks.json         ← background tasks (preLaunchTask, Terminal > Run Task)
```

---

## launch.json — Full annotated file

```jsonc
{
  "version": "0.2.0",
  "configurations": [ ... ],
  "compounds": [ ... ]
}
```

A **configuration** is one runnable entry in the F5 dropdown.  
A **compound** groups multiple configurations to launch together with one click.

---

## Configurations

### 1. `Backend (local DynamoDB)` ⭐ Daily driver

```jsonc
{
  "name": "Backend (local DynamoDB)",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "${workspaceFolder}/bookclub-app/backend/node_modules/.bin/serverless",
  "runtimeArgs": [
    "offline", "start",
    "--config", "serverless-offline.yml",
    "--stage", "local",
    "--noPrependStageInUrl"
  ],
  "cwd": "${workspaceFolder}/bookclub-app/backend",
  "env": {
    "SLS_TELEMETRY_DISABLED": "1",
    "APP_ENV": "local",
    "NODE_ENV": "development",
    "AWS_ACCESS_KEY_ID": "local",
    "AWS_SECRET_ACCESS_KEY": "local",
    "AWS_REGION": "us-east-1",
    "AWS_SDK_LOAD_CONFIG": "0"
  },
  "console": "integratedTerminal",
  "sourceMaps": true,
  "restart": true,
  "skipFiles": ["<node_internals>/**"]
}
```

**What it does:**  
Starts `serverless-offline` — a local HTTP server that emulates AWS Lambda + API Gateway.  
All API routes (`/books`, `/users/me`, `/clubs`, etc.) are served at `http://localhost:4000`.

**When to use:**  
This is your go-to for day-to-day development. Docker (DynamoDB + LocalStack) must already be running.

**Line-by-line explanation:**

| Setting | Value | Why |
|---------|-------|-----|
| `type: node` | — | This is a Node.js process |
| `request: launch` | — | VS Code starts the process (not attaching to an existing one) |
| `runtimeExecutable` | `node_modules/.bin/serverless` | Runs the local serverless binary, not a global install |
| `--config serverless-offline.yml` | — | Uses the local-only config (not `serverless.yml` which is for AWS deploy) |
| `--stage local` | — | Sets `${opt:stage}` = `local` → table names like `bookclub-local-books` |
| `--noPrependStageInUrl` | — | Routes are `/books` not `/local/books`. **Critical** — without this every API call 404s |
| `APP_ENV=local` | — | Master switch: tells `aws-config.js` to point DynamoDB → `localhost:8000`, S3 → `localhost:4566` |
| `NODE_ENV=development` | — | Enables dev logging, disables some prod-only guards |
| `AWS_ACCESS_KEY_ID=local` | — | Fake credential — DynamoDB Local and LocalStack accept any value |
| `AWS_SECRET_ACCESS_KEY=local` | — | Same — just needs to be non-empty |
| `AWS_REGION=us-east-1` | — | Must match what's in `app.local.json` and table name prefixes |
| `AWS_SDK_LOAD_CONFIG=0` | — | Prevents AWS SDK from reading `~/.aws/config` — avoids accidentally picking up your real AWS profile |
| `SLS_TELEMETRY_DISABLED=1` | — | Stops serverless from phoning home on every start |
| `console: integratedTerminal` | — | Output shows in VS Code terminal panel (not the Debug Console) |
| `sourceMaps: true` | — | Breakpoints in `.js` source files work correctly |
| `restart: true` | — | If the process crashes, VS Code restarts it automatically |
| `skipFiles` | `<node_internals>/**` | Debugger won't step into Node.js core internals |

---

### 2. `Debug Backend (local DynamoDB)` — With Docker auto-start

```jsonc
{
  "name": "Debug Backend (local DynamoDB)",
  ...same as above plus:
  "env": {
    ...
    "STAGE": "local",            // ← extra
    "AWS_DEFAULT_REGION": "us-east-1"  // ← extra
  },
  "preLaunchTask": "Start DynamoDB Local"
}
```

**What it does:**  
Same as config #1 but **automatically starts Docker containers first** via `preLaunchTask`.

**When to use:**  
First time of the day, or after a reboot when Docker containers aren't running yet.

**Extra env vars explained:**

| Var | Why |
|-----|-----|
| `STAGE=local` | Some older parts of the codebase read `process.env.STAGE` directly instead of `provider.stage`. Belt-and-suspenders. |
| `AWS_DEFAULT_REGION` | Some AWS SDK v2 calls use `AWS_DEFAULT_REGION` instead of `AWS_REGION`. Set both to be safe. |

**`preLaunchTask: "Start DynamoDB Local"`** → runs this task from `tasks.json` before the backend starts:
```json
{
  "label": "Start DynamoDB Local",
  "command": "docker compose up -d dynamodb-local localstack"
}
```
So it spins up both DynamoDB Local and LocalStack, then launches the backend.

> ⚠️ It does NOT wait for LocalStack to be healthy before starting the backend.  
> If the backend starts before LocalStack is ready, the first S3 upload may fail.  
> Run `node scripts/setup-localstack.js` manually after first boot.

---

### 3. `Debug Backend (serverless-offline)` — Pure offline mode

```jsonc
{
  "name": "Debug Backend (serverless-offline)",
  // identical to config #2 but no preLaunchTask
}
```

**What it does:**  
Same env and args as config #2 but **does not start Docker**.

**When to use:**  
When you want to debug the backend and Docker is already running, but you don't want the `preLaunchTask` overhead.  
Functionally identical to config #1 except it also sets `STAGE` and `AWS_DEFAULT_REGION`.

---

### 4. `Debug Frontend (Chrome)`

```jsonc
{
  "name": "Debug Frontend (Chrome)",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000/dev-bookmarklet.html",
  "webRoot": "${workspaceFolder}/bookclub-app/frontend/src",
  "sourceMapPathOverrides": {
    "webpack:///src/*": "${webRoot}/*"
  },
  "preLaunchTask": "Start Frontend Dev Server"
}
```

**What it does:**  
1. Runs `npm start` in `bookclub-app/frontend` (via `preLaunchTask`)
2. Opens Chrome at the dev login page `http://localhost:3000/dev-bookmarklet.html`
3. Attaches VS Code debugger to Chrome — breakpoints in `.tsx` files work

**When to use:**  
When you want to set breakpoints in React components and step through frontend code.

**Settings explained:**

| Setting | Why |
|---------|-----|
| `url: .../dev-bookmarklet.html` | Opens the local login helper page directly — you can log in and then navigate to any route |
| `webRoot` | Maps Chrome's source files back to your actual `.tsx` files on disk |
| `sourceMapPathOverrides` | webpack emits `webpack:///src/*` source map paths — this remaps them to actual file paths so breakpoints work |
| `preLaunchTask: "Start Frontend Dev Server"` | Starts `npm start` and waits until it sees `Compiled successfully` before opening Chrome |

---

### 5. `Open Dev Login Page`

```jsonc
{
  "name": "Open Dev Login Page",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000/dev-bookmarklet.html",
  "webRoot": "${workspaceFolder}/bookclub-app/frontend/src"
}
```

**What it does:**  
Just opens Chrome at the dev login page — no task, no debugger attach.

**When to use:**  
Quick shortcut to open the login page when the frontend is already running and you just need a browser window.  
No source map setup, no waiting for compilation.

---

### 6. `Debug Backend Tests`

```jsonc
{
  "name": "Debug Backend Tests",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": ".../node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "cwd": "${workspaceFolder}/bookclub-app/backend",
  "env": {
    "IS_OFFLINE": "true",
    "NODE_ENV": "test",
    "AWS_ACCESS_KEY_ID": "local",
    "AWS_SECRET_ACCESS_KEY": "local",
    "AWS_REGION": "us-east-1"
  }
}
```

**What it does:**  
Runs Jest tests with the VS Code debugger attached — you can set breakpoints inside test files and handler code.

**When to use:**  
When a test is failing and you want to step through it rather than read `console.log` output.

**Settings explained:**

| Setting | Why |
|---------|-----|
| `IS_OFFLINE=true` | Tells models `isOffline()=true` → uses JSON file storage (`.local-storage/*.json`) instead of DynamoDB — tests are self-contained |
| `NODE_ENV=test` | Jest behaviour, disables some non-test code paths |
| `--runInBand` | Runs tests serially in one process — required for the debugger to work (parallel workers can't be debugged) |
| `--no-coverage` | Skips coverage collection — speeds up the test run and keeps debugger output clean |
| No `APP_ENV=local` | Intentionally absent — tests use JSON file storage, NOT local DynamoDB |

> Note the difference from the backend configs:  
> - Backend configs: `APP_ENV=local` (DynamoDB) + no `IS_OFFLINE`  
> - Test config: `IS_OFFLINE=true` + `NODE_ENV=test` + no `APP_ENV=local` (JSON files)

---

## Compounds

Compounds let you launch multiple configurations simultaneously with one F5 press.

### `Full Stack Local (DynamoDB + Backend + Frontend)`

```jsonc
{
  "name": "Full Stack Local (DynamoDB + Backend + Frontend)",
  "configurations": ["Backend (local DynamoDB)", "Debug Frontend (Chrome)"]
}
```

Launches:
1. `Backend (local DynamoDB)` → backend on port 4000 (Docker must already be running)
2. `Debug Frontend (Chrome)` → starts `npm start`, opens Chrome, attaches debugger

**When to use:**  
When Docker is already running and you want full-stack debugging in one click.

---

### `Full Stack (Backend + Frontend)`

```jsonc
{
  "name": "Full Stack (Backend + Frontend)",
  "configurations": ["Debug Backend (local DynamoDB)", "Debug Frontend (Chrome)"]
}
```

Launches:
1. `Debug Backend (local DynamoDB)` → starts Docker first, then backend
2. `Debug Frontend (Chrome)` → starts frontend, opens Chrome

**When to use:**  
Cold start — Docker not running. Does everything from scratch.

---

## tasks.json — Full annotated file

Tasks run in the background or as `preLaunchTask` dependencies.

### `Start DynamoDB Local`

```json
{
  "label": "Start DynamoDB Local",
  "type": "shell",
  "command": "docker compose up -d dynamodb-local localstack",
  "options": { "cwd": "${workspaceFolder}" },
  "problemMatcher": []
}
```

Starts two Docker containers:
- `dynamodb-local` → DynamoDB on port 8000
- `bookclub-localstack` → LocalStack (S3) on port 4566

Runs from the **workspace root** (where `docker-compose.yml` lives) — not the backend folder.  
`problemMatcher: []` means VS Code won't try to parse output for errors.

---

### `Setup Local S3 (LocalStack)`

```json
{
  "label": "Setup Local S3 (LocalStack)",
  "command": "sleep 4 && npm run local:setup-s3",
  "options": { "cwd": "${workspaceFolder}/bookclub-app/backend" },
  "dependsOn": "Start DynamoDB Local"
}
```

Waits 4 seconds for LocalStack to be ready, then runs `node scripts/setup-localstack.js` which:
- Creates the S3 bucket `bookclub-app-local-book-covers`
- Sets CORS rules (allows `localhost:3000`, `3001`, `3002`)
- Sets public-read bucket policy

`dependsOn: "Start DynamoDB Local"` → VS Code runs the Docker task first automatically.

---

### `Setup Local DynamoDB Tables`

```json
{
  "label": "Setup Local DynamoDB Tables",
  "command": "npm run local:setup",
  "options": { "cwd": "${workspaceFolder}/bookclub-app/backend" },
  "dependsOn": "Start DynamoDB Local"
}
```

Creates all DynamoDB tables in the local container. Only needed once per fresh Docker volume.  
Table names follow the pattern `bookclub-local-<tablename>` (the `local` comes from `--stage local`).

---

### `Seed Local DynamoDB`

```json
{
  "label": "Seed Local DynamoDB",
  "command": "npm run local:seed",
  "options": { "cwd": "${workspaceFolder}/bookclub-app/backend" },
  "dependsOn": "Setup Local DynamoDB Tables"
}
```

Inserts sample data (books, users, clubs) into the local tables.  
`dependsOn` chain: `Seed` → `Setup Tables` → `Start DynamoDB Local` — running Seed alone triggers the full chain.

---

### `Start Frontend Dev Server`

```json
{
  "label": "Start Frontend Dev Server",
  "type": "shell",
  "command": "npm start",
  "options": { "cwd": "${workspaceFolder}/bookclub-app/frontend" },
  "isBackground": true,
  "problemMatcher": {
    "background": {
      "beginsPattern": "Starting the development server",
      "endsPattern": "Compiled successfully"
    }
  }
}
```

Runs `npm start` (Create React App dev server) on port 3000.  
`isBackground: true` means it keeps running — VS Code doesn't wait for it to exit.  
The `problemMatcher.background` patterns tell VS Code when the server is "ready":  
- Starts watching when it sees `"Starting the development server"`  
- Considers it done (unblocks `preLaunchTask` wait) when it sees `"Compiled successfully"`

---

## Quick reference — which config to use when

| Situation | Use |
|-----------|-----|
| Daily backend work (Docker already running) | `Backend (local DynamoDB)` |
| First start of day / after reboot | `Debug Backend (local DynamoDB)` |
| Full stack with frontend debugger | `Full Stack Local (DynamoDB + Backend + Frontend)` |
| Cold start full stack | `Full Stack (Backend + Frontend)` |
| Debug a failing Jest test | `Debug Backend Tests` |
| Just need Chrome open at login page | `Open Dev Login Page` |

---

## Environment variable cheat sheet

| Variable | Value (local) | Effect |
|----------|--------------|--------|
| `APP_ENV` | `local` | `aws-config.js` routes DynamoDB → `localhost:8000`, S3 → `localhost:4566` |
| `NODE_ENV` | `development` | Dev logging on, prod guards off |
| `AWS_ACCESS_KEY_ID` | `local` | Fake credential accepted by DynamoDB Local + LocalStack |
| `AWS_SECRET_ACCESS_KEY` | `local` | Same |
| `AWS_REGION` | `us-east-1` | Must match `app.local.json` and table name region |
| `AWS_SDK_LOAD_CONFIG` | `0` | Prevents SDK reading `~/.aws/config` — stops real AWS profile leaking in |
| `SLS_TELEMETRY_DISABLED` | `1` | No telemetry pings on startup (faster) |
| `STAGE` | `local` | Table name prefix: `bookclub-local-*` |
| `IS_OFFLINE` | `true` (tests only) | Models use JSON file storage instead of DynamoDB |
