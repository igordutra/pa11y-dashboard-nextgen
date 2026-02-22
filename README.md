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

## Features

-   **URL Management**: Add, edit, and delete URLs to monitor.
-   **Automated Scanning**: Schedule scans with Cron expressions or intervals.
-   **Scripted Multi-Step Scans**: Define user flows (click, type, wait) to test pages behind interactions.
-   **Visual History**:
    -   **Trend Charts**: Track accessibility scores and issue counts over time.
    -   **Screenshots**: View full-page screenshots of scanned pages at each step.
-   **Scoring Algorithm**: Uses Lighthouse for initial load and a custom rule-based deduction for intermediate steps.

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
