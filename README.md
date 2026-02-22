# Pa11y Dashboard

A modern, web-based dashboard for managing automated accessibility testing with Pa11y and Lighthouse.

## Features

-   **URL Management**: Add, edit, and delete URLs to monitor.
-   **Automated Scanning**: Schedule scans with Cron expressions (e.g., daily, hourly) or intervals.
-   **WCAG Standards**: Supports WCAG 2.0, 2.1, and 2.2 at levels A, AA, and AAA.
-   **Scripted Multi-Step Scans**: Define user flows (click, type, wait) to test pages behind interactions like cookie banners or login forms.
-   **Detailed Reports**: View comprehensive accessibility reports with issue breakdowns.
    -   **Issue Fix Links**: Each issue includes a "How to fix" link to W3C technique pages (HTMLCS) or Deque University docs (axe).
-   **Visual History**:
    -   **Trend Charts**: Track accessibility scores and issue counts over time with readable timestamps.
    -   **Scan History Navigation**: Click any historical scan to view its full results — screenshots, scores, steps, and issues.
    -   **Screenshots**: View full-page screenshots of scanned pages at each step.
    -   **Accessibility Scores**: Get a high-level score (0-100) based on Lighthouse/Pa11y metrics.
-   **Categories**:
    -   Organize URLs into categories with custom names, descriptions, icons, and colors.
    -   Sidebar navigation with category filtering.
-   **Global Settings & Per-URL Overrides**:
    -   Configure Pa11y runner, viewport, timing, and reporting options globally.
    -   Override settings per URL for fine-grained control.

## Scoring Algorithm

The dashboard uses a hybrid scoring system to provide meaningful accessibility metrics:

1.  **Initial Load**: Uses the official **Lighthouse Accessibility Score** (0-100).
2.  **Scripted Steps**: Since Lighthouse usually forces a page reload (losing step state), intermediate steps use a **Custom Rule-Based Deduction Algorithm** based on Pa11y results:
    -   **Base Score**: Starts at 100.
    -   **Rule Deductions**: Deducts points based on unique rule failures (to prevent score zeroing from repetitive errors).
        -   Critical: -15 pts
        -   Serious: -8 pts
        -   Moderate: -4 pts
        -   Minor: -1 pt
    -   **Instance Penalty**: A small penalty of 0.1 pts is applied per individual issue instance (max 20 pts).
3.  **Overall Scan Score**: The final score for a multi-step scan is the **average score** across all successful steps.

## Getting Started (Docker)

The easiest way to run the dashboard is using Docker Compose.

```bash
docker-compose up -d
```

-   **Dashboard**: [http://localhost:8080](http://localhost:8080)
-   **API**: [http://localhost:3000](http://localhost:3000)
-   **Swagger Docs**: [http://localhost:3000/documentation](http://localhost:3000/documentation)

## API Reference

The backend is built with Fastify and includes built-in Swagger documentation.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/urls` | List all monitored URLs |
| `POST` | `/api/urls` | Add a new URL |
| `PUT` | `/api/urls/:id` | Update a URL configuration |
| `DELETE` | `/api/urls/:id` | Delete a URL and all its scan history |
| `POST` | `/api/urls/:id/scan` | Trigger an immediate manual scan |
| `GET` | `/api/urls/:id/history` | Get the last 20 scan summaries for a URL |
| `GET` | `/api/scans/:scanId` | Get full details (including screenshots/steps) for a scan |
| `GET` | `/api/settings` | Get global scanning configuration |
| `PUT` | `/api/settings` | Update global scanning configuration |

## Development Guide

### Environment Setup
1.  **Clone the repo**.
2.  **Prerequisites**: Node.js 24+, MongoDB.
3.  **Install Dependencies**:
    ```bash
    cd client && npm install
    cd ../server && npm install
    ```

### Running Locally (with HMR)
1.  Start MongoDB (e.g., `docker run -d -p 27017:27017 mongo`).
2.  **Backend**: `cd server && npm run dev` (Runs on port 3000).
3.  **Frontend**: `cd client && npm run dev` (Runs on port 8080).

### Testing & Linting
-   **Client**: `cd client && npm run test` and `npm run lint`.
-   **Server**: `cd server && npm run test`.

## Contribution Guide

1.  **Fork the repository**.
2.  **Create a feature branch**: `git checkout -b feature/your-feature`.
3.  **Implement changes**: Ensure you follow the existing code style and add tests where appropriate.
4.  **Verify**: Run all linting and test commands before committing.
5.  **Submit a Pull Request**: Provide a clear description of the changes and the problem they solve.

## Tech Stack

-   **Frontend**: React 19, Vite, TailwindCSS 4, Radix UI, TanStack Query.
-   **Backend**: Node.js, Fastify, MongoDB (Mongoose), Puppeteer, Pa11y, Lighthouse.
