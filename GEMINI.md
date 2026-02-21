# Pa11y Dashboard NextGen - GEMINI.md

This project is a modern accessibility monitoring dashboard built with React and Node.js. It allows users to schedule accessibility scans using `pa11y` and `lighthouse`, supporting multi-step scripted interactions.

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
- **Styling**: Tailwind CSS 4, Radix UI (Shadcn UI)
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
- **Scheduling**: Cron-based and interval-based tasks
- **Testing**: Vitest, Supertest, MongoDB Memory Server

## Key Commands

### Development (Local)
Ensure MongoDB is running (e.g., via Docker: `docker-compose up -d mongo`).

- **Server**: 
  ```bash
  cd server && npm install && npm run dev
  ```
- **Client**: 
  ```bash
  cd client && npm install && npm run dev
  ```

### Docker
- **Run all services**: `docker-compose up -d`
- **Build services**: `docker-compose build`

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

1. **Type Safety**: Use Zod schemas for API validation in the backend and TypeScript types across the codebase.
2. **Component Library**: Prefer Radix UI / Shadcn components for UI consistency.
3. **Styling**: Use utility-first Tailwind CSS 4.
4. **Testing**: Write Vitest tests for new features (especially scanner logic and API endpoints).
5. **API Client**: Use Axios for backend communication, typically wrapped in TanStack Query hooks.
6. **Environment Variables**: Managed via `.env` files and `docker-compose.yml`. Key variables include `MONGO_URI`, `PORT`, and `VITE_API_URL`.

## Important Implementation Details

- **Screenshots**: Full-page screenshots are captured using Puppeteer by adjusting the viewport to match the document height.
- **Multi-Step Scans**: Defined via actions (`wait`, `click`, `type`, `wait-for-url`) and processed sequentially in `runner.ts`.
- **Accessibility Score**: Calculated using Lighthouse for the initial load and a custom rule-based deduction algorithm for intermediate steps (based on Pa11y issue count and impact).
- **Scheduler**: Runs every 60 seconds to check for due scans.
