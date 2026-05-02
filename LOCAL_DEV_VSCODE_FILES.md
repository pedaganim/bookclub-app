# VS Code Config Files — Copy-Paste Ready

Create these two files under `.vscode/` at the **repo root** (same level as `docker-compose.yml`):

```
bookclub-app/          ← repo root
└── .vscode/
    ├── launch.json
    └── tasks.json
```

---

## `.vscode/launch.json`

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      // ─────────────────────────────────────────────────────────────
      // DAILY DRIVER — Docker must already be running
      // Starts serverless-offline on localhost:4000
      // ─────────────────────────────────────────────────────────────
      "name": "Backend (local DynamoDB)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/bookclub-app/backend/node_modules/.bin/serverless",
      "runtimeArgs": [
        "offline",
        "start",
        "--config",
        "serverless-offline.yml",
        "--stage",
        "local",
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
    },
    {
      // ─────────────────────────────────────────────────────────────
      // AUTO-STARTS DOCKER first via preLaunchTask, then starts backend
      // Use this on first start of day / after reboot
      // ─────────────────────────────────────────────────────────────
      "name": "Debug Backend (local DynamoDB)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/bookclub-app/backend/node_modules/.bin/serverless",
      "runtimeArgs": [
        "offline",
        "start",
        "--config",
        "serverless-offline.yml",
        "--stage",
        "local",
        "--noPrependStageInUrl"
      ],
      "cwd": "${workspaceFolder}/bookclub-app/backend",
      "env": {
        "SLS_TELEMETRY_DISABLED": "1",
        "APP_ENV": "local",
        "STAGE": "local",
        "NODE_ENV": "development",
        "AWS_ACCESS_KEY_ID": "local",
        "AWS_SECRET_ACCESS_KEY": "local",
        "AWS_REGION": "us-east-1",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_SDK_LOAD_CONFIG": "0"
      },
      "preLaunchTask": "Start DynamoDB Local",
      "console": "integratedTerminal",
      "sourceMaps": true,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      // ─────────────────────────────────────────────────────────────
      // Same as above but does NOT auto-start Docker
      // Use when Docker is running but you want explicit control
      // ─────────────────────────────────────────────────────────────
      "name": "Debug Backend (serverless-offline)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/bookclub-app/backend/node_modules/.bin/serverless",
      "runtimeArgs": [
        "offline",
        "start",
        "--config",
        "serverless-offline.yml",
        "--stage",
        "local",
        "--noPrependStageInUrl"
      ],
      "cwd": "${workspaceFolder}/bookclub-app/backend",
      "env": {
        "SLS_TELEMETRY_DISABLED": "1",
        "APP_ENV": "local",
        "STAGE": "local",
        "NODE_ENV": "development",
        "AWS_ACCESS_KEY_ID": "local",
        "AWS_SECRET_ACCESS_KEY": "local",
        "AWS_REGION": "us-east-1",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_SDK_LOAD_CONFIG": "0"
      },
      "console": "integratedTerminal",
      "sourceMaps": true,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      // ─────────────────────────────────────────────────────────────
      // Starts npm start for the frontend + opens Chrome with debugger
      // Breakpoints in .tsx files work
      // ─────────────────────────────────────────────────────────────
      "name": "Debug Frontend (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000/dev-bookmarklet.html",
      "webRoot": "${workspaceFolder}/bookclub-app/frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      },
      "preLaunchTask": "Start Frontend Dev Server"
    },
    {
      // ─────────────────────────────────────────────────────────────
      // Just opens Chrome at the dev login page — no task, no debugger
      // Frontend must already be running on localhost:3000
      // ─────────────────────────────────────────────────────────────
      "name": "Open Dev Login Page",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000/dev-bookmarklet.html",
      "webRoot": "${workspaceFolder}/bookclub-app/frontend/src"
    },
    {
      // ─────────────────────────────────────────────────────────────
      // Run Jest tests with VS Code debugger attached
      // Set breakpoints inside test files or handler code
      // NOTE: uses IS_OFFLINE=true → JSON file storage, NOT DynamoDB
      // ─────────────────────────────────────────────────────────────
      "name": "Debug Backend Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/bookclub-app/backend/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-coverage"],
      "cwd": "${workspaceFolder}/bookclub-app/backend",
      "env": {
        "IS_OFFLINE": "true",
        "NODE_ENV": "test",
        "AWS_ACCESS_KEY_ID": "local",
        "AWS_SECRET_ACCESS_KEY": "local",
        "AWS_REGION": "us-east-1"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ],
  "compounds": [
    {
      // ─────────────────────────────────────────────────────────────
      // One-click full stack — Docker must already be running
      // Launches backend + frontend + Chrome debugger together
      // ─────────────────────────────────────────────────────────────
      "name": "Full Stack Local (DynamoDB + Backend + Frontend)",
      "configurations": ["Backend (local DynamoDB)", "Debug Frontend (Chrome)"]
    },
    {
      // ─────────────────────────────────────────────────────────────
      // Cold start full stack — starts Docker, then backend + frontend
      // ─────────────────────────────────────────────────────────────
      "name": "Full Stack (Backend + Frontend)",
      "configurations": ["Debug Backend (local DynamoDB)", "Debug Frontend (Chrome)"]
    }
  ]
}
```

---

## `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start DynamoDB Local",
      "type": "shell",
      "command": "docker compose up -d dynamodb-local localstack",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "problemMatcher": []
    },
    {
      "label": "Setup Local S3 (LocalStack)",
      "type": "shell",
      "command": "sleep 4 && npm run local:setup-s3",
      "options": {
        "cwd": "${workspaceFolder}/bookclub-app/backend"
      },
      "dependsOn": "Start DynamoDB Local",
      "problemMatcher": []
    },
    {
      "label": "Setup Local DynamoDB Tables",
      "type": "shell",
      "command": "npm run local:setup",
      "options": {
        "cwd": "${workspaceFolder}/bookclub-app/backend"
      },
      "dependsOn": "Start DynamoDB Local",
      "problemMatcher": []
    },
    {
      "label": "Seed Local DynamoDB",
      "type": "shell",
      "command": "npm run local:seed",
      "options": {
        "cwd": "${workspaceFolder}/bookclub-app/backend"
      },
      "dependsOn": "Setup Local DynamoDB Tables",
      "problemMatcher": []
    },
    {
      "label": "Start Frontend Dev Server",
      "type": "shell",
      "command": "npm start",
      "options": {
        "cwd": "${workspaceFolder}/bookclub-app/frontend"
      },
      "isBackground": true,
      "problemMatcher": {
        "owner": "react",
        "pattern": {
          "regexp": "^(.*)$",
          "file": 1,
          "location": 1,
          "message": 1
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "Starting the development server",
          "endsPattern": "Compiled successfully"
        }
      }
    }
  ]
}
```

---

## After copying the files

Run these once to initialise the local database and S3 bucket:

```bash
# 1. Start Docker containers
docker compose up -d dynamodb-local localstack

# 2. Wait ~5s for LocalStack to be ready, then create S3 bucket + CORS
cd bookclub-app/backend
node scripts/setup-localstack.js

# 3. Create DynamoDB tables
npm run local:setup

# 4. (Optional) Seed sample data
npm run local:seed
```

Then press **F5** in VS Code and pick **"Debug Backend (local DynamoDB)"**.
