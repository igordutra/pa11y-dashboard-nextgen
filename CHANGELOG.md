# Changelog

All notable changes to this project will be documented in this file.

## [0.6.1] - 2026-03-14

### Security
- **Demo Mode Restrictions**: Implemented robust read-only enforcement when `DEMO_MODE=true` is set. All mutation APIs (POST, PUT, DELETE) now return `403 Forbidden` with descriptive error messages (#46).
- **Frontend Read-Only UI**: The dashboard now automatically detects read-only status and disables all modification buttons with informative tooltips. Added a "Demo Mode" header banner for clear status visibility.
- **XSS Prevention**: Implemented comprehensive HTML escaping for all dynamic content, including URL names, target URLs, and scanner error messages, in both the dashboard and exported HTML reports (#36).
- **API Rate Limiting**: Integrated `@fastify/rate-limit` to prevent abuse. Added a global limit of 100 requests per minute and a strict limit of 2 manual scan triggers per minute per IP (#35).
- **Puppeteer Sandboxing**: Re-enabled the built-in Puppeteer sandbox by default for improved process isolation in Docker environments. Added `PUPPETEER_NO_SANDBOX` environment variable for compatibility in restricted environments (#34).

## [0.6.0] - 2026-03-09

### Added
- **Visual Script Recorder**: Added a proxy-based visual recorder allowing users to easily point, click, and type to generate complex interaction scripts, including multi-page journeys (#39).
- **Empty State UI**: Implemented a welcoming empty state for the dashboard when no URLs are configured, providing a clear call to action (#43).

### Changed
- **Scan Engine Optimization**: The backend engine now merges interaction steps (clicks, typing) with subsequent wait actions. This prevents cluttered reports by eliminating meaningless mid-transition screenshots and focuses only on final loaded states.
- **Report Page UI**: Standalone wait steps are now automatically hidden from the Report Page tabs to further reduce UI noise.

### Fixed
- **Demo Script Stability**: Updated GitHub action workflow to automatically pull latest source before executing the daily demo reset script (#42).

## [0.5.2] - 2026-03-07

### Added
- **Extended Job Monitoring**: Redesigned the monitoring dashboard to include a full list of scheduled tasks with human-readable frequencies and next run times.
- **Failure History Tracking**: Implemented a new 'Recent Failures' system that tracks the last 50 scan errors with descriptive messages.
- **Configurable Concurrency**: Moved the hardcoded scan limit to a global setting, allowing users to adjust system load (1-10 simultaneous scans) via the Settings page.
- **Real-time Queue Visibility**: Status, wait times, and execution durations for all background tasks with automatic 5-second polling.
- **AI-Powered Development**: This project has been significantly evolved and maintained with the assistance of **Gemini CLI**.

## [0.4.3] - 2026-03-07

### Security
- **Documentation Access**: Disabled Swagger UI and OpenAPI JSON endpoints in production environments (`NODE_ENV=production`) to reduce the application's attack surface.

## [0.4.2] - 2026-03-07

### Fixed
- **Swagger Documentation**: Registered `jsonSchemaTransform` to ensure Zod schemas are correctly converted to OpenAPI format, resolving `TypeError: w.toJS is not a function` in Swagger UI.
- **API Response Consistency**: Eliminated remaining `z.any()` types and corrected 204 No Content responses to match strict schema definitions.

## [0.4.1] - 2026-03-07

### Fixed
- **Swagger UI Compatibility**: Replaced problematic `z.any()` types with specific schemas and used `z.preprocess()` for ObjectIds to resolve `TypeError: w.toJS is not a function` in the documentation console.
- **API Type Safety**: Resolved backend typecheck failures by properly converting Mongoose Maps to plain objects and ensuring optional fields match schema definitions.

## [0.4.0] - 2026-03-07

### Added
- **Automated A11y Testing**: Integrated `vitest-axe` into the client test suite for automated accessibility audits of UI components.
- **Queue Monitoring**: Added execution and wait-time logging to the background `ScanQueue` for better performance visibility.
- **Comprehensive API Docs**: Fully documented all REST endpoints using Swagger/OpenAPI, including detailed request/response schemas and field descriptions.

### Changed
- **Accessible Overlays**: Rebuilt static issue overlays in `ScreenshotOverlay` and `InteractiveScreenshot` as keyboard-accessible buttons with full ARIA support.
- **Architectural Cleanup**: Centralized shared Zod schemas into `server/types/schemas.ts` to eliminate code duplication across API routes.
- **Resilient Scanning**: Implemented `try...finally` browser lifecycle management in the scanning engine to prevent resource leaks on failure.

### Fixed
- **Editor Accessibility**: Added missing `aria-label` attributes to all input fields in the `ActionEditor`.
- **Visual Feedback**: Implemented active state highlighting for the "Custom" schedule button in the `CronEditor`.
- **Performance Bottlenecks**: Optimized `ActionEditor` row rendering using `useCallback` to prevent unnecessary re-renders during script editing.

## [0.3.0] - 2026-03-07

### Added
- **Automated Initial Scan**: New URLs are now automatically enqueued for scanning immediately upon creation.
- **Project Favicon**: Added custom branded favicon (Closes #15).
- **Responsive Design**: Implemented mobile-first responsive layout across all pages, including a navigation drawer for mobile and adaptive grids for URLs and reports (Closes #10).
- **Demo Reset 2.0**: Enhanced `reset-demo.sh` with automated seeding of News and Personal categories and high-quality example sites.
- **Docker-First Workflow**: New root-level npm scripts (`npm run dev`, `npm run logs`, `npm run docker:test`) to simplify the development experience.
- **Reliability Features**: Added startup cleanup for stuck scans and global Puppeteer timeouts to prevent indefinite hangs.
- **Architectural Test Suite**: Refactored API integration tests to use mocking for background tasks and environment-aware database setup (shared Mongo in Docker vs memory server on host).

### Changed
- **Modern Defaults**: Updated default accessibility standard to **WCAG 2.2 AA**.
- **Cleaner Scheduling**: Default schedule is now **Manual (None)**.
- **UI Refinement**: Removed "Hourly" and "Daily" presets from the Cron Editor to promote cleaner, more intentional scheduling.
- **Release Versioning**: Unified versioning across client, server, and root packages.

### Fixed
- **ESLint Conflicts**: Resolved dependency mismatch between `@eslint/js` and `eslint` that was blocking Docker builds.
- **ARM64 Compatibility**: Fixed issues with `MongoMemoryServer` binary downloads on Apple Silicon by switching to shared containers for Docker tests.
- **Race Conditions**: Eliminated `DocumentNotFoundError` in tests by introducing a `waitForIdle` mechanism for the scan queue.

## [0.2.0] - 2026-03-03
### Added
- Pre-commit hooks with Husky and lint-staged (Closes #25).
- Type-checking and linting in CI.

## [0.1.0] - 2026-02-25
### Added
- Initial release of Pa11y Dashboard NextGen.
- Multi-step scripted scans.
- Lighthouse integration.
- HTML report export.
