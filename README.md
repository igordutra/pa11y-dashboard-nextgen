# Pa11y Dashboard NextGen

Pa11y Dashboard NextGen is a modern, high-performance web interface to the [Pa11y][pa11y] and [Lighthouse][lighthouse] accessibility reporters; allowing you to focus on *fixing* issues rather than hunting them down.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
[![Node.js version support](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Screenshots

![Dashboard](https://placehold.co/800x450?text=Dashboard+Screenshot)
*The main dashboard showing URL cards, statuses, and scores.*

![Report Page](https://placehold.co/800x450?text=Report+Screenshot)
*Detailed accessibility report with multi-step scan results and screenshots.*

---

## Key Features

### 📂 Category Management
Organize your monitored URLs into logical groups. NextGen supports rich metadata for categories:
- **Custom Icons**: Choose from a library of semantic icons (Globe, Building, Shopping Cart, etc.).
- **Color Coding**: Assign distinct colors to categories for quick visual identification.
- **Descriptions**: Add context to why a group of URLs is being monitored together.
- **Filtering**: Sidebar navigation allows you to quickly isolate URLs by category.

### ⚙️ Global & Per-URL Configuration
Fine-tune your accessibility scans at any level:
- **Global Defaults**: Set organization-wide standards for runners (Axe vs HTMLCS), viewports, and ignore rules.
- **Per-URL Overrides**: Override any global setting for a specific URL. Useful for legacy sites that need longer timeouts or specific viewports.
- **Custom Headers**: Add authentication tokens or cookies to test pages behind login screens.
- **Element Control**: Hide specific CSS selectors (like moving carousels) or limit testing to a "Root Element".

### 🎭 Scripted Multi-Step Actions
Test complex user journeys, not just landing pages. Our script editor supports:
- **`click`**: Interact with buttons, tabs, or menus. Supports piercing iframes with `iframe_selector >>> element_selector`.
- **`type`**: Fill out forms (e.g., login, search). Supports iframes with `iframe_selector >>> element_selector|text`.
- **`wait`**: Pause for a specific duration to allow animations to finish.
- **`wait-for-url`**: Synchronize with navigation events.
- **Interactive Reports**: Each step generates its own score and screenshot, allowing you to pinpoint exactly where accessibility degrades in a user flow.

### 📄 Standalone HTML Export
Generate and share professional accessibility reports with stakeholders.
- **Self-Contained**: Reports follow the WCAG-EM structure and include all necessary context.
- **Actionable**: Includes code snippets, selectors, and specific fix suggestions for every issue.
- **Visual Evidence**: Automatically embeds focused screenshots of the problematic elements.

### 📈 Visual Intelligence
- **Trend Charts**: Interactive Recharts-powered graphs show accessibility health over time.
- **Focused Issue Snippets**: NextGen automatically crops the page screenshot around each identified issue. You can see the exact problematic element directly in the issue list and exported reports.
- **Screenshot Overlays**: Maps Pa11y issues directly onto full-page screenshots. Click an issue in the list to see exactly where it is on the page.
- **Hybrid Scoring**: Combines Lighthouse's industry-standard metrics with our custom rule-based algorithm for intermediate scripted scripted steps.

---

## NextGen vs. Original Pa11y Dashboard

| Feature | Original Pa11y Dashboard | NextGen (This Project) |
|---------|-------------------------|------------------------|
| **Framework** | Express / EJS (Legacy) | Fastify / React 19 (Modern) |
| **Language** | Plain JavaScript | 100% TypeScript (Type-safe) |
| **Styling** | Custom LESS / CSS | Tailwind CSS 4.2 |
| **Testing** | Mocha / Should | Vitest / React Testing Library |
| **Scoring** | Basic issue counting | Hybrid Lighthouse + Weighted Rules |
| **Visuals** | Static reports | Interactive Charts & Screenshot Pins |
| **Speed** | Standard execution | Optimized Fastify + Concurrent Scheduler |
| **Scripting** | Text-based Pa11y actions | Interactive UI Script Editor |

---

## Scoring Algorithm

Pa11y Dashboard NextGen uses a hybrid scoring system to provide accurate and meaningful accessibility metrics:

### 1. Initial Load (Lighthouse)
For the first page load, we use the official **Lighthouse Accessibility Score** (0-100). This is the industry standard and covers a wide range of automated checks.

### 2. Multi-Step Actions (Custom Algorithm)
Since Lighthouse typically requires a full page reload (which would lose the state of your scripted actions), intermediate steps use a **Custom Rule-Based Deduction Algorithm** based on Pa11y/Axe results:

- **Base Score**: 100 points.
- **Unique Rule Deductions**: We deduct points based on the *severity* of unique rules that failed, rather than the total number of issues. This prevents a single repetitive error (like a missing `alt` tag on many icons) from zeroing out the score.
  - **Critical**: -15 points
  - **Serious**: -8 points
  - **Moderate**: -4 points
  - **Minor**: -1 point
- **Instance Penalty**: A small penalty of **0.1 points** is applied for every individual issue instance (capped at 20 points total) to reflect the scale of the problem.

### 3. Overall Scan Score
The final score displayed for a multi-step scan is the **average score** of all successful steps.

## Requirements

- [Node.js][node]: Pa11y Dashboard NextGen requires Node.js 24 or above.
- [MongoDB][mongodb]: This project stores test results in a MongoDB database and expects one to be available and running.
- [Docker][docker] (Optional): Recommended for easy setup and deployment.

## Running the Application

### Using Docker (Recommended)
The easiest way to get started is with Docker Compose:
```bash
docker-compose up -d
```
- **Dashboard**: [http://localhost:8080](http://localhost:8080)
- **API**: [http://localhost:3000](http://localhost:3000)

### Production Deployment (Free Tier)
We have provided a comprehensive, step-by-step guide for deploying this application completely for free on an **Oracle Cloud Ampere A1 instance**. This instance type provides enough memory (up to 24GB) and persistent storage to smoothly run Puppeteer and save generated screenshots.

👉 **[View the Oracle Cloud Deployment Guide](ORACLE_CLOUD_DEPLOYMENT.md)**

### Manual Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/pa11y/pa11y-dashboard-nextgen.git
   ```

2. **Install dependencies**:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. **Configure environment**:
   Create a `.env` file in the `server` directory (see [Configuring](#configuring-pa11y-dashboard-nextgen)).

4. **Run the application**:
   - **Backend**: `cd server && npm run dev`
   - **Frontend**: `cd client && npm run dev`

## Testing

We use [Vitest](https://vitest.dev/) for both frontend and backend testing.

### Server Tests
Includes API endpoint validation and scanning logic.
```bash
cd server
npm run test
```

### Client Tests
Includes component testing with React Testing Library.
```bash
cd client
npm run test
```

## API Documentation

The API includes built-in Swagger documentation. When the server is running, visit:
`http://localhost:3000/documentation`

## Configuring Pa11y Dashboard NextGen

Each configuration can be set with an environment variable in the `server` directory.

### `PORT`
*(number)* The port to run the API on (defaults to `3000`).

### `MONGO_URI`
*(string)* The MongoDB connection string (defaults to `mongodb://localhost:27017/pa11y-dashboard`).

### `CLIENT_URL`
*(string)* The URL of the frontend application (for CORS).

## Contributing

There are many ways to contribute to Pa11y Dashboard NextGen. If you're ready to contribute some code:

1. **Fork the repository**.
2. **Create a feature branch**: `git checkout -b feature/your-feature`.
3. **Run tests**:
   - Client: `cd client && npm run test`
   - Server: `cd server && npm run test`
4. **Submit a Pull Request**.

## Troubleshooting

### Common issues

- **MongoDB Connection**: Ensure MongoDB is running. If using Docker, check `docker-compose logs mongo`.
- **Puppeteer/Chrome**: On Linux, you might need additional dependencies for Headless Chrome.

## Support

If you're experiencing issues, please [create a new issue](https://github.com/pa11y/pa11y-dashboard-nextgen/issues/new).

## License

Pa11y Dashboard NextGen is licensed under the [MIT License](LICENSE).

[node]: http://nodejs.org/
[mongodb]: http://www.mongodb.org/
[pa11y]: https://github.com/pa11y/pa11y
[lighthouse]: https://developers.google.com/web/tools/lighthouse
[docker]: https://www.docker.com/
