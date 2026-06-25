---
name: permissions_guard
description: Enforces safeguards around file/system changes, and optimizes tool/model usage.
triggers:
  - pre_command: "any command execution"
  - file_change: "bookclub-app/backend/serverless.yml"
  - file_change: "bookclub-app/backend/terraform/**"
  - file_change: "package.json"
evals:
  - check: "the agent asked for permission or presented an implementation plan before executing any 'Bigger Changes'"
  - check: "cost-efficient models (like Gemini 3.5 Flash) are recommended/used for minor bash/git commands"
---

# Permissions Guard & Model Optimization

This skill acts as a safeguard during agent execution to manage costs, project integrity, and system safety.

## When to Use This Skill

- Continuously active during agent operations to screen execution steps and select the correct model.

## Trigger Points

This skill is automatically activated when:
1. The agent is about to execute any shell command (triggers a cost check to verify if a free/fast model is selected for simple CLI/git tasks).
2. The agent is about to modify critical system config files (e.g. `serverless.yml`, terraform, package dependencies).

## Rules to Enforce

### 1. Cost & Model Optimization
For simple bash commands and Git-related actions:
- Recommend and use **free/fast models** (such as Gemini 3.5 Flash) where possible.
- Avoid using premium models for basic tasks like `git status`, `git diff`, `npm install`, or simple file reads.

### 2. Permissions Guard (Bigger Changes)
Before making any significant or "bigger" changes, the agent **MUST** explicitly request user permission and write an implementation plan. 

What constitutes a **Bigger Change**:
- Modifying infrastructure configuration files (e.g. Terraform `*.tf`, AWS CloudFormation, Serverless Framework `serverless.yml`).
- Database schema changes (e.g. DynamoDB tables, indexes, seeding scripts).
- Modifying security or authentication flows (e.g. AWS Cognito setup, OAuth callback configurations).
- Deleting files or executing complex scripts that modify files globally.
- Modifying dependency lists (e.g. adding large libraries to `package.json`).

## Steps for the Agent

1. **Before Executing a Command or Edit**:
   - Classify the action: Is it a basic CLI command/git operation, or is it a major modification?
2. **If it is a Git/Bash command**:
   - Check if you can switch the active model to a fast/free option if appropriate.
3. **If it is a Big Change**:
   - Write an `implementation_plan.md` outlining the proposed edits, the rationale, and the verification plan.
   - Explain the impact of the change to the user and request their explicit approval before editing any files.

## Evals

To evaluate whether this skill was executed correctly:
1. Verify that no infrastructure files (`serverless.yml`, Terraform files) or package dependency files were edited without prior permission request/plan approval.
2. Verify that fast models were selected for minor command executions.
