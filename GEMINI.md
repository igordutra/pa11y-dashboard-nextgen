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
Ensure MongoDB is running (e.g. via Docker: `docker-compose up -d mongo`).

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
- **Client**: `cd client && npm run test`
- **Server**: `cd server && npm run test`

### Linting & Formatting
- **Client**: `cd client && npm run lint`

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
- **Accessibility Score**: Calculated using Lighthouse for the initial load and a custom rule-based deduction algorithm for intermediate steps (based on Pa11y issue count and impact).
- **Scheduler**: Runs every 60 seconds to check for URLs where `lastScanAt` is older than the most recent cron schedule execution. Disabled if `DEMO_MODE=true`.
