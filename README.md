# Pa11y Dashboard

A modern, web-based dashboard for managing automated accessibility testing with Pa11y.

## Features

-   **URL Management**: Add, edit, and delete URLs to monitor.
-   **Automated Scanning**: Schedule scans with Cron expressions (e.g., daily, hourly).
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
    -   Organize URLs into categories with custom names, descriptions, icons (20 Lucide icons), and colors.
    -   Sidebar navigation with category filtering — click a category to show only its URLs.
    -   Manage categories (create, edit, delete) from the sidebar via a dialog.
    -   Assign categories when adding or editing URLs.
-   **Global Settings & Per-URL Overrides**:
    -   Configure Pa11y runner, viewport, timing, and reporting options globally.
    -   Override settings per URL for fine-grained control.
    -   View environment info (Node.js version, Pa11y version, installed runners).

### Scripted Actions

Define a sequence of browser actions to execute before scanning:

| Action | Description | Example Value |
|--------|-------------|---------------|
| `wait` | Pause for milliseconds | `2000` |
| `click` | Click a CSS selector | `#accept-cookies` |
| `type` | Type into an input | `#search\|query text` |
| `wait-for-url` | Wait for navigation | — |

Each step captures its own screenshot, score, and issue list. Results are viewable via step-navigation tabs on the Report page.

## Getting Started

The easiest way to run the dashboard is using Docker Compose.

### Prerequisites

-   Docker and Docker Compose installed.

### Running the Dashboard

1.  Navigate to the project root.
2.  Run the following command:

    ```bash
    docker-compose up -d
    ```

3.  Access the dashboard at [http://localhost:8080](http://localhost:8080).
4.  The API is available at [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/urls` | List all monitored URLs |
| `POST` | `/api/urls` | Add a new URL |
| `PUT` | `/api/urls/:id` | Update a URL |
| `DELETE` | `/api/urls/:id` | Delete a URL |
| `POST` | `/api/urls/:id/scan` | Trigger a scan |
| `GET` | `/api/urls/:id/latest-scan` | Get latest scan results |
| `GET` | `/api/urls/:id/history` | Get scan history |
| `GET` | `/api/scans/:scanId` | Get a specific historical scan |
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a category |
| `PUT` | `/api/categories/:id` | Update a category |
| `DELETE` | `/api/categories/:id` | Delete a category (unassigns URLs) |
| `GET` | `/api/settings` | Get global settings |
| `PUT` | `/api/settings` | Update global settings |
| `GET` | `/api/environment` | Get environment info |

## Tech Stack

-   **Frontend**: React, Vite, TailwindCSS, Shadcn UI, Recharts.
-   **Backend**: Node.js, Fastify, MongoDB, Mongoose, Puppeteer.
-   **Tools**: Pa11y, Lighthouse, Sharp.

## Development

To run in development mode with hot-reloading:

1.  Ensure MongoDB is running (e.g., via Docker).
2.  Start the server:
    ```bash
    cd server
    npm install
    npm run dev
    ```
3.  Start the client:
    ```bash
    cd client
    npm install
    npm run dev
    ```
