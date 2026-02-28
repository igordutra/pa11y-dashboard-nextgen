# Code Review & Accessibility Audit Report - v1.0

This report outlines the current state of the Pa11y Dashboard NextGen project, reflecting all major features, architectural decisions, and security postures as of the v1.0 release.

## 1. Accessibility Audit (WCAG 2.2 AA)

### Core UI Components
- **Dashboard Interface**: All icon-only buttons (Edit, Delete, Scan) have descriptive `aria-labels`. Navigation relies on semantic HTML and keyboard-navigable components provided by Radix UI.
- **Reporting & Data**: Result badges and issue lists utilize `sr-only` text to ensure screen readers receive the same context as visual users.
- **Forms & Inputs**: Labels are correctly associated with inputs (`htmlFor`). The `CronEditor` uses `cronstrue` to convert complex schedules into human-readable text for immediate feedback.

### Status: ✅ PASS
The application dashboard itself meets high accessibility standards, aligning with the core mission of the tool it serves.

---

## 2. Security Posture

### Application Layer
- **API Validation**: Zod schema validation is strictly enforced on all incoming fastify requests, preventing NoSQL injection and malformed data attacks.
- **Content Security Policy (CSP)**: `fastify-helmet` is implemented. **Note for Oracle Deployment:** To support access via a raw HTTP IP address on the Oracle Free Tier, strict `upgrade-insecure-requests`, `origin-agent-cluster`, and `cross-origin-opener-policy` rules have been intentionally relaxed. It is recommended to configure a reverse proxy with an SSL certificate for public-facing production instances.

### Infrastructure Layer
- **Puppeteer Sandboxing**: The scanner is configured to run inside a Docker container. By granting the container `SYS_ADMIN` capabilities and executing the Node process as a non-root user, Chromium's built-in sandbox remains active and secure without needing to pass the dangerous `--no-sandbox` flag.
- **Secrets Management**: No secrets are committed to the repository; environmental configuration is managed via `.env` files and Docker Compose variables.

---

## 3. Performance & Architecture

### Backend (Node.js/Fastify)
- **Modular Routing**: The application is structured cleanly with separated route handlers (`/urls`, `/scans`, `/categories`, `/settings`) registering to the main Fastify instance.
- **Concurrency Control**: A custom `ScanQueue` manages the background execution of Pa11y and Lighthouse audits. It strictly limits active scans (`MAX_CONCURRENT = 3`) to prevent CPU exhaustion and Out-Of-Memory (OOM) crashes, especially crucial on low-resource environments.
- **Static Asset Delivery**: Screenshots and the compiled React frontend are served directly and efficiently via `@fastify/static`.

### Frontend (React/Vite)
- **State Management**: TanStack Query is utilized heavily to cache API responses and manage polling during active scans, preventing infinite re-render loops.
- **HTML Export**: Standalone reports are generated entirely client-side using `reportGenerator.ts`, reducing server load and allowing users to instantly download static, stylized HTML evidence of their accessibility scans.

### Image Processing
- **Automated Snippets**: `sharp` is used on the backend to automatically crop full-page screenshots down to the specific bounding box of individual accessibility issues. This drastically improves the UI and the usefulness of exported reports.

---

## 4. Completed Objectives from v0.1

The following backlog items from the initial prototype have been successfully implemented:
- ✅ **[A11y]** Added `aria-labels` to all icon-only buttons.
- ✅ **[A11y]** Enhanced screen reader descriptions for report links.
- ✅ **[Security]** Hardened Puppeteer sandbox configuration via Docker `SYS_ADMIN`.
- ✅ **[Arch]** Refactored `server/index.ts` into modular routes.
- ✅ **[Performance]** Implemented a bounded `ScanQueue` to replace the simple interval processor.
- ✅ **[UX]** Added visual feedback (polling and disabled states) for active scans.
- ✅ **[Feature]** Developed Standalone HTML Export.
- ✅ **[Feature]** Implemented focused issue screenshot cropping.
- ✅ **[DevOps]** Created a unified, multi-stage Docker build optimized for Oracle Cloud ARM instances.