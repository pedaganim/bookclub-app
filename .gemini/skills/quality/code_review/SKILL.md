---
name: code_review
description: Runs a comprehensive review on local git changes before a new pull request is created.
triggers:
  - user_intent: "review my code"
  - user_intent: "create a pull request"
  - user_intent: "perform a code review"
  - post_action: "task_completion"
evals:
  - check: "the static review checklists have been executed against the git diff"
  - check: "a review markdown report summary is produced and displayed to the user"
---

# Code Review

Use this skill whenever you or the user is preparing to create a new Pull Request (PR). This ensures the code changes are clean, well-tested, secure, and properly documented.

## When to Use This Skill

- **MUST use** when a task is completed and a PR is about to be created.
- Can be used during development to perform a self-review of current diffs.

## Trigger Points

This skill is automatically activated when:
1. The user asks to: `"review my code"`, `"create a pull request"`, or `"perform a code review"`.
2. A task completes, prompting the creation of the walkthrough and git branch finalization.

## Steps

### Step 1: Run Git Diff
Examine the changes made in the branch compared to the target branch (e.g. `release` or `main`).
```bash
git diff release...HEAD
```
Or simply check current changes:
```bash
git diff
```

### Step 2: Analyze the Code
Review the diff against the following checklist:
1. **Quality & Cleanliness**:
   - Are there any leftover debugging statements, unused imports, or `console.log`s?
   - Is formatting consistent?
2. **Architecture & Patterns**:
   - Do the changes follow existing patterns in the codebase?
   - Is logic clean and separated?
3. **Security**:
   - Are there any hardcoded secrets, keys, or credentials?
   - Are inputs properly sanitized?
4. **Testing**:
   - Were new tests added for the new files/logic?
   - Did all existing tests pass?
5. **Documentation**:
   - Are JSDoc comments or README files updated if interfaces changed?

### Step 3: Run Linter
If applicable, run the project's linter to verify formatting:
- Frontend: `npm run lint` in `bookclub-app/frontend/`

### Step 4: Write PR Description
Generate a concise review report in markdown format. If everything is clean, prepare a PR summary:
- **Summary**: High-level explanation of what the PR accomplishes.
- **Key Changes**: Bulleted list of modified modules and their changes.
- **Test Evidence**: Confirmation that tests were run and passed.
- **Review Notes**: Any considerations or suggestions for the reviewer.

## Evals

To evaluate whether this skill was executed correctly:
1. Verify that the reviewer outputs a markdown analysis containing a checklist of Quality, Architecture, Security, Testing, and Linter checks.
2. Confirm the PR description template is outputted with valid Test Evidence.
