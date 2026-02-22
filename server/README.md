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

- **Robust Scanning Engine**: Combines **Lighthouse** (for performance/standard scores) and **Pa11y/Axe** (for multi-step auditing).
- **Multi-Step Puppeteer Scripting**: Processes sequential actions (`click`, `type`, `wait`) while maintaining browser state.
- **Concurrent Scheduler**: Efficiently manages background tasks with a configurable concurrency limit to prevent resource exhaustion.
- **Image Processing**: On-the-fly thumbnail generation using **Sharp** for optimized dashboard performance.
- **Type-Safe API**: Built with **Fastify** and **Zod** for high-performance, contract-first API design.
- **Dynamic Configuration**: Support for environment-based overrides, crucial for testing and containerized environments.

## Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000`.

3. **Build for production**:
   ```bash
   npm run build
   ```

## Configuration

Configuration is managed via environment variables or a configuration loader in `config/index.ts`. See `config/samples/` for example setups.

- **PORT**: API port (default: 3000)
- **MONGO_URI**: MongoDB connection string
- **CLIENT_URL**: Frontend URL (for CORS)
- **NOINDEX**: Set to `true` to disable search engine indexing.
- **READONLY**: Set to `true` to disable write operations.

## Testing & Quality

- **Run tests**: `npm run test`

## API Documentation

The API includes built-in Swagger documentation. When the server is running, visit:
`http://localhost:3000/documentation`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/urls` | List all monitored URLs |
| `POST` | `/api/urls` | Add a new URL (Blocked in `readonly` mode) |
| `PUT` | `/api/urls/:id` | Update a URL configuration |
| `DELETE` | `/api/urls/:id` | Delete a URL and its history |
| `POST` | `/api/urls/:id/scan` | Trigger an immediate manual scan |
| `GET` | `/api/urls/:id/history` | Get the last 20 scan summaries for a URL |
| `GET` | `/api/urls/:id/latest-scan` | Get full details for the most recent scan |
| `GET` | `/api/scans/:scanId` | Get full details for a specific scan |
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a new category |
| `GET` | `/api/settings` | Get global scanning configuration |
| `PUT` | `/api/settings` | Update global scanning configuration |
| `GET` | `/api/environment` | Get server environment info (Pa11y/Node versions) |

## Architecture

- **`index.ts`**: Fastify server setup and API route definitions.
- **`lib/runner.ts`**: The core scanning engine (Lighthouse + Pa11y logic).
- **`lib/scheduler.ts`**: Background task manager for periodic scans.
- **`models/`**: Mongoose schemas for `Url`, `Scan`, `Category`, and `Settings`.
- **`screenshots/`**: Local storage for generated scan screenshots.
