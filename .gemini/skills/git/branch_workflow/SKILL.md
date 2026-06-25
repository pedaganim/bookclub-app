---
name: branch_workflow
description: Automates starting a new development branch off the latest release branch for any new task.
triggers:
  - user_intent: "start a task"
  - user_intent: "create a new branch"
  - user_intent: "work on a new issue"
  - command: "git checkout -b"
evals:
  - check: "the current checked out branch matches the name provided/generated for the task"
  - check: "the branch has pulled the latest changes from the release branch"
---

# Branch Workflow

Use this skill whenever you are about to start working on a new task or issue. This ensures you are always working on a separate feature branch branched off the latest changes from the release branch.

## When to Use This Skill

- **MUST use** at the very beginning of a new task, ticket, or issue.
- **Do NOT use** if you are already on a dedicated task/feature branch and just continuing work.

## Trigger Points

This skill is automatically activated when:
1. The user asks to: `"start a task"`, `"create a new branch"`, `"work on an issue"`, or `"new branch"`.
2. The agent is instructed to execute a new implementation plan.
3. The command `git checkout -b` is proposed or run.

## Steps

### Step 1: Check Current Git Status
Run `git status` to verify that your working tree is clean. If there are uncommitted changes, do NOT proceed. Either commit them, stash them (`git stash`), or ask the user how to handle them.

### Step 2: Fetch and Pull Latest Release Branch
1. Checkout the release branch (which is `release` in this repository).
   ```bash
   git checkout release
   ```
2. Pull the latest updates from the remote:
   ```bash
   git pull origin release
   ```

### Step 3: Create and Checkout the Task Branch
1. Determine a clean, descriptive branch name based on the task description (e.g. `feature/user-auth` or `bugfix/issue-123`).
2. Create and switch to the new branch:
   ```bash
   git checkout -b <new-branch-name>
   ```
3. Inform the user that you are now working on the new branch `<new-branch-name>`.

## Evals

To evaluate whether this skill was executed correctly:
1. Verify the current active branch using:
   ```bash
   git branch --show-current
   ```
   *Expectation: The output must match `<new-branch-name>`.*
2. Check that the branch is up-to-date with `release`:
   ```bash
   git log -1 release
   ```
   *Expectation: The last commit on the `release` branch should be present in the history of `<new-branch-name>`.*
