# Pa11y Dashboard NextGen - GEMINI.md

This project is a modern accessibility monitoring dashboard built with React and Node.js. It enables users to schedule accessibility scans using `pa11y` and `lighthouse`, supporting multi-step scripted interactions and automated issue tracking.

## Project Overview

- **Purpose**: Automated accessibility testing and monitoring with trend tracking and visual reports.
- **Architecture**: 
  - **Frontend**: React SPA (Vite-based) located in `/client`.
  - **Backend**: Fastify API with a background scheduler and scanner engine located in `/server`.
  - **Database**: MongoDB (Mongoose) for storing URLs, scan results, categories, and settings.
  - **Scanner**: Puppeteer-based engine that executes `pa11y` and `lighthouse` audits.

## Tech Stack

### Frontend (`/client`)
- **Framework**: React 19 (TypeScript, Vite)
- **Styling**: Tailwind CSS 4.2, Radix UI (Shadcn UI)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router 7
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Vitest, React Testing Library

### Backend (`/server`)
- **Framework**: Fastify (with Zod for type-safe validation)
- **Database**: MongoDB + Mongoose
- **Audit Tools**: Pa11y, Lighthouse, Puppeteer
- **Image Processing**: Sharp (for screenshots and thumbnails)
- **Scheduling**: Cron-based background tasks
- **Testing**: Vitest, Supertest, MongoDB Memory Server

## Key Commands

### Development (Local)
The **preferred** way to develop is using Docker, which provides a full environment with **hot-reloading** for both services:

```bash
# Start the full environment
npm run dev

# View logs
npm run logs

# Run tests inside Docker
npm run docker:test

# Stop the environment
npm run stop
```

Alternatively, you can run services manually for debugging or if Docker is unavailable (ensure MongoDB is running):

- **Server**: 
  ```bash
  cd server && npm install && npm run dev
  ```
- **Client**: 
  ```bash
  cd client && npm install && npm run dev
  ```

### Production Deployment
The application is designed to be deployed as a single, unified container where the Fastify backend serves both the `/api` routes and the static compiled React frontend.

- **Unified Docker Build**: `docker-compose -f docker-compose.oracle.yml up -d --build`
- See `ORACLE_CLOUD_DEPLOYMENT.md` for full VPS hosting instructions.

### Testing
- **Docker (Preferred)**: `npm run docker:test`
- **Manual (Local)**: `npm run test`
- **Client only**: `cd client && npm run test`
- **Server only**: `cd server && npm run test`

### Linting & Formatting
- **Client**: `cd client && npm run lint`
- **Server**: `cd server && npm run lint`

### Pre-commit Hooks
The project uses **Husky** and **lint-staged** to ensure code quality. Before every commit, the following tasks are automatically executed on staged files:
- **Linting**: Runs ESLint to check for code style and potential errors.
- **Typechecking**: Runs `tsc --noEmit` to ensure TypeScript types are valid.
- **Tests**: Runs Vitest for related tests using the `--related` flag.

To manually trigger the pre-commit checks on all staged files, run:
```bash
npx lint-staged
```

To initialise or repair hooks (e.g. after a fresh clone):
```bash
npm run prepare
```

## Core Directory Structure

- `/client/src/components/`: Reusable UI components (URL list, modals, layout).
- `/client/src/pages/`: Main application pages (Dashboard/Home, Report, Settings).
- `/server/lib/runner.ts`: The core scanning engine (Lighthouse + Pa11y logic).
- `/server/lib/scheduler.ts`: Background task manager for periodic scans.
- `/server/models/`: Mongoose schemas for `Url`, `Scan`, `Category`, and `Settings`.
- `/server/index.ts`: Fastify server setup and API route definitions.
- `/server/screenshots/`: Local storage for generated scan screenshots.

## Development Conventions

1.  **Type Safety**: Use Zod schemas for API validation in the backend and TypeScript types across the codebase.
2.  **Component Library**: Prefer Radix UI / Shadcn components for UI consistency.
3.  **Styling**: Use utility-first Tailwind CSS 4.2.
4.  **Testing**: Write Vitest tests for new features (especially scanner logic and API endpoints).
5.  **API Client**: Use Axios for backend communication, typically wrapped in TanStack Query hooks.
6.  **Environment Variables**: Managed via `.env` files and `docker-compose.yml`. Key variables include `MONGO_URI`, `PORT`, and `CLIENT_URL`.
7.  **Ethos**: Maintain a clean, modular codebase. Prioritise accessibility (a11y) within the dashboard itself, adhering to the mission of the project. Use British English for documentation.

## Important Implementation Details

- **Screenshots**: Full-page screenshots are captured using Puppeteer by adjusting the viewport to match the document height.
- **Multi-Step Scans**: Defined via actions (`wait`, `click`, `type`, `wait-for-url`) and processed sequentially in `runner.ts`.
    - **Iframe Support**: Actions like `click` and `type` support a special syntax to interact with elements inside iframes: `iframe_selector >>> element_selector` (e.g. `#my-iframe >>> .login-btn`).
- **Focused Issue Snippets**: The scanner automatically crops screenshots to the bounding box of each identified issue (using `sharp`). These snippets are displayed in the UI and included in exported reports for easier remediation.
- **Analytics Engine**:
    - Aggregates data across all monitored targets using MongoDB aggregation pipelines.
    - Tracks global health metrics, issue severity distribution, failing rule frequency, and category-wise performance.
    - Provides a 30-day historical score trend for overall visibility.
- **Accessibility Score**: Calculated using Lighthouse for the initial load and a custom rule-based deduction algorithm for intermediate steps (based on Pa11y issue count and impact).
- **Demo & Read-Only Mode**:
    - `DEMO_MODE=true` disables background scans AND enforces read-only mode for all mutation APIs.
    - Frontend automatically detects `readonly` status from `/api/environment` and disables all mutation buttons with appropriate tooltips.
- **Authentication & RBAC**:
    - Supports local email/password login and GitHub OAuth.
    - RBAC with `admin`, `editor`, and `viewer` roles.
    - `AUTH_ENABLED` toggle in `.env` allows for public or private access.
    - JWT-based stateless session management.
    - `npm run setup-auth` CLI script for initial provisioning.
- **Security & Sandboxing**:
    - **XSS Prevention**: All dynamic content (URLs, names, issue messages) is HTML-escaped in reports and the dashboard.
    - **Rate Limiting**: Global API limits (100 req/min) and strict scan trigger limits (2 req/min) using `@fastify/rate-limit`.
    - **Vite Proxy Architecture**: In development, Vite (port 8080) proxies `/api` and `/screenshots` to the backend container (`http://api:3000`), allowing for a single-origin experience and simplifying OAuth callbacks.
    - **Puppeteer Sandbox**: Runs with the built-in sandbox enabled for better isolation; configurable via `PUPPETEER_NO_SANDBOX`.
- **Startup Recovery**: The system automatically detects and resets URLs stuck in the `scanning` state back to `active` upon server restart.
    - **Timeout Enforcement**: A global timeout is enforced at the Puppeteer page level, synchronized with the user-defined scan timeout.
    - **Atomic Status Updates**: The scanner re-validates the database state before final status updates to prevent race conditions during long-running audits. The background queue uses immediate flag setting and `try...finally` blocks to ensure `maxConcurrent` limits are strictly respected.
- **Scheduler**: Runs every 60 seconds to check for URLs where `lastScanAt` is older than the most recent cron schedule execution. Disabled if `DEMO_MODE=true`. Includes a comprehensive unit test suite in `server/test/scheduler.test.ts`.
