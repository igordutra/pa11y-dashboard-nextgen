# Pa11y Dashboard NextGen - Server

The backend API for the Pa11y Dashboard, built with Fastify, MongoDB, and Puppeteer.

## Tech Stack

- **Framework**: Fastify (with Zod for type-safe validation)
- **Database**: MongoDB + Mongoose
- **Audit Tools**: Pa11y, Lighthouse, Puppeteer
- **Image Processing**: Sharp (for screenshots and thumbnails)
- **Scheduling**: Cron-based background tasks
- **Testing**: Vitest, Supertest, MongoDB Memory Server

## Key Features

- **Robust Scanning Engine**: Combines **Lighthouse** (for standard scores) and **Pa11y/Axe** (for multi-step auditing).
- **Multi-Step Puppeteer Scripting**: Processes sequential actions (`click`, `type`, `wait`) whilst maintaining browser state.
- **Concurrent Scheduler**: Efficiently manages background tasks with a configurable concurrency limit to prevent resource exhaustion. Disabled if `DEMO_MODE=true`.
- **Image Processing**: On-the-fly thumbnail and issue snippet generation using **Sharp**.
- **Type-Safe API**: Built with **Fastify** and **Zod** for high-performance, contract-first API design.
- **Dynamic Configuration**: Support for environment-based overrides, optimised for containerised environments.

## Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000`.

3. **Build for production**:
   ```bash
   npm run build
   ```

## Configuration

Configuration is managed via environment variables.

- **PORT**: API port (default: 3000)
- **MONGO_URI**: MongoDB connection string.
- **CLIENT_URL**: Frontend URL (required for CORS).
- **NOINDEX**: Set to `true` to disable search engine indexing.
- **READONLY**: Set to `true` to disable write operations.
- **DEMO_MODE**: Set to `true` to disable background scheduling.

## Testing & Quality

- **Run tests**: `npm run test`

## API Documentation

The API includes built-in Swagger documentation. When the server is running, visit:
`http://localhost:3000/documentation`

## Architecture

- **`index.ts`**: Fastify server setup and API route definitions.
- **`lib/runner.ts`**: The core scanning engine (Lighthouse + Pa11y logic).
- **`lib/scheduler.ts`**: Background task manager for periodic scans.
- **`models/`**: Mongoose schemas for `Url`, `Scan`, `Category`, and `Settings`.
- **`screenshots/`**: Local storage for generated scan screenshots.
