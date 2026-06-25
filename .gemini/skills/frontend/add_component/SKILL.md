---
name: add_frontend_component
description: Guidelines and architectural instructions to add or modify React components and pages in the BookClub frontend.
triggers:
  - user_intent: "add a frontend component"
  - user_intent: "create a new React page"
  - user_intent: "add a page"
  - file_creation: "bookclub-app/frontend/src/components/**/*.tsx"
  - file_creation: "bookclub-app/frontend/src/pages/**/*.tsx"
evals:
  - check: "the component compiles successfully within the React TypeScript build"
  - check: "Tailwind CSS mappings are used for layouts and colors (minimum touch target 'touch' for buttons/forms)"
  - check: "a unit/integration test file exists under src/__tests__/ and passes with npm test"
---

# Add Frontend Component

Use this skill when you need to add or modify a user interface view, page, or reusable component in the React Single-Page Application (SPA). The frontend is built on **React**, **TypeScript**, **Tailwind CSS**, and **React Testing Library**.

## Workflow Steps

### Step 1: Initialize Git Branch (Use `branch_workflow` Skill)
Before creating any styling or code structure:
1. Invoke the **[branch_workflow](file:///Users/maddy/.gemini/config/skills/git/branch_workflow/SKILL.md)** skill to checkout a descriptive task branch derived from the latest release code.

---

### Step 2: Implement Component & Declare Types
1. Declare TypeScript models in `bookclub-app/frontend/src/types/index.ts` first if custom interfaces are required.
2. Implement components under the correct workspace paths:
   - **Pages**: `bookclub-app/frontend/src/pages/`
   - **Reusable Components**: `bookclub-app/frontend/src/components/`
3. Style layout with Tailwind CSS. Apply mobile touch target spacing (touch targets at least `h-touch`) and the custom teal color schemes (`bg-indigo-600` / `indigo-900`).

---

### Step 3: Interface with the Backend API
Connect your UI component to the server:
1. Import `apiService` from `src/services/api` to query or submit updates to Lambda functions.
2. If new endpoints are needed, configure them on the Axios `ApiService` instance first.

---

### Step 4: Write Component Tests (Use `add_tests` Skill)
Verify component state rendering and interaction handlers:
1. Use the **[add_tests](file:///Users/maddy/.gemini/config/skills/quality/add_tests/SKILL.md)** skill to create a test file inside `src/__tests__/components/` or `src/__tests__/pages/`.
2. Mock the `ApiService` backend queries to keep rendering verification fast and isolated.

---

### Step 5: Validate and Compile (Use `run_tests` Skill)
Compile files and verify code logic:
1. Invoke the **[run_tests](file:///Users/maddy/.gemini/config/skills/quality/run_tests/SKILL.md)** skill to run frontend tests.
2. Confirm there are no compilation, console, or linting errors by running the linter (`npm run lint`).
3. Boot the local React server via `npm start` (port 3000) for visual layout checks.

---

### Step 6: Code Review & PR Preparation (Use `code_review` Skill)
Verify guidelines compliance:
1. Execute the **[code_review](file:///Users/maddy/.gemini/config/skills/quality/code_review/SKILL.md)** skill.
2. Self-inspect the git diff, resolve any formatting issues, and generate a code review summary.

## Evals

To evaluate whether this skill was executed correctly:
1. Confirm that the component loads/renders in the application routing (e.g. declared in `App.tsx` if it's a page).
2. Verify that Tailwind classes match design tokens (uses `touch` target height/spacing, uses custom teal-mapped colors).
3. Confirm that component test suites pass and API service methods are properly mocked.
