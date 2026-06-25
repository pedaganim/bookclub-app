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

## When to Use This Skill

- Use this when adding new UI pages under `src/pages/`.
- Use this when developing reusable subcomponents under `src/components/`.
- Use this when styling components to ensure consistent layouts.

## Trigger Points

This skill is automatically activated when:
1. The user asks to: `"add component"`, `"create a page"`, `"build UI"`, or `"new frontend view"`.
2. A file is created or modified under `bookclub-app/frontend/src/components/` or `bookclub-app/frontend/src/pages/`.

## Workflow Steps

### Step 1: Declare Types
If the component handles custom data models (e.g. reviews, ratings, group events), define the corresponding TypeScript interfaces in `bookclub-app/frontend/src/types/index.ts` first.

### Step 2: Implement the Component
Create the component file:
- **Pages (routes)**: Place them in `bookclub-app/frontend/src/pages/` (e.g. `src/pages/BookDetails.tsx`).
- **Reusable widgets/views**: Place them in `bookclub-app/frontend/src/components/` (e.g. `src/components/BookCard.tsx`).

Ensure you adhere to the following design system practices:
1. **Touch Targets**: Apply the custom `touch` spacing classes for interactive elements to ensure mobile friendliness:
   ```tsx
   <button className="h-touch px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
     Submit
   </button>
   ```
2. **Teal Branding**: The tailwind config maps `indigo` to the custom `teal` scale. Use `bg-indigo-600` / `hover:bg-indigo-700` for primary actions, and `indigo-900` for dark themes.
3. **Responsive Layouts**: Design with mobile-first screens in mind using Tailwind prefixes (e.g. `grid grid-cols-1 md:grid-cols-3`).

---

### Step 3: Interface with the Backend API
For remote server operations (fetching or pushing data):
1. Use the pre-configured `ApiService` instance by importing it from `src/services/api`:
   ```typescript
   import { apiService } from '../services/api';
   ```
2. If adding a new query or command, declare it inside the `ApiService` class in `src/services/api.ts` using Axios.

---

### Step 4: Write Component Tests
Create a test file under `bookclub-app/frontend/src/__tests__/components/` or `bookclub-app/frontend/src/__tests__/pages/` matching the component path:
1. Mock any external service calls:
   ```typescript
   import { render, screen, fireEvent } from '@testing-library/react';
   import { apiService } from '../../services/api';
   
   jest.mock('../../services/api');
   ```
2. Wrap components with contexts if they depend on Auth or Brand context:
   ```tsx
   import { AuthContext } from '../../contexts/AuthContext';
   
   render(
     <AuthContext.Provider value={mockAuthValue}>
       <MyComponent />
     </AuthContext.Provider>
   );
   ```

---

### Step 5: Validate and Compile
Verify the code quality:
1. Run local tests:
   ```bash
   cd bookclub-app/frontend && npm test
   ```
2. Run the linter:
   ```bash
   cd bookclub-app/frontend && npm run lint
   ```
3. Start the local server (port 3000):
   ```bash
   cd bookclub-app/frontend && npm start
   ```

## Evals

To evaluate whether this skill was executed correctly:
1. Confirm that the component loads/renders in the application routing (e.g. declared in `App.tsx` if it's a page).
2. Verify that Tailwind classes match design tokens (uses `touch` target height/spacing, uses custom teal-mapped colors).
3. Confirm that component test suites pass and API service methods are properly mocked.
