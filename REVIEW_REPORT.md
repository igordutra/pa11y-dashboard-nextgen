# Code Review & Accessibility Audit Report - v0.1

## 1. Accessibility Audit (WCAG 2.2 AA)

### Findings
| Component | Status | Issue | Recommendation |
|-----------|--------|-------|----------------|
| **UrlCard** | ⚠️ Warning | Icon-only buttons (Edit, Delete) lack descriptive labels. | Add `aria-label="Edit [Name]"` and `aria-label="Delete [Name]"` to buttons. |
| **UrlCard** | ⚠️ Warning | Result badges (Score, Issues) are links but lack context. | Add `sr-only` text like "View detailed report for [Name]". |
| **CronEditor** | ✅ Pass | Excellent usage of `cronstrue` for human-readable feedback. | Keep as is. |
| **Settings** | ⚠️ Warning | Color contrast for "Success" (Green) and "Warning" (Yellow) text might be low on white backgrounds. | Verify contrast ratios; ensure green is at least 4.5:1. |
| **Dialogs** | ✅ Pass | Focus management and keyboard closing (Esc) handled by Radix. | Keep as is. |
| **Forms** | ✅ Pass | Labels correctly associated with inputs via `htmlFor`. | Keep as is. |

---

## 2. Security Review

### Findings
- **Puppeteer Sandboxing (High Risk)**: The scanner runs with `--no-sandbox`. If a user adds a malicious URL that exploits Chromium, it could compromise the host.
  - *Recommendation*: Configure Puppeteer to run in a Linux Namespace sandbox or use a dedicated user with minimal permissions in Docker.
- **API Validation (Low Risk)**: Excellent use of Zod for schema validation on all endpoints.
- **Security Headers (Low Risk)**: `fastify-helmet` is implemented correctly.
- **Secrets Management (Medium Risk)**: Ensure `.env.example` is provided and `.env` is strictly ignored (already ignored in `.gitignore`).

---

## 3. Performance Analysis

### Findings
- **Scheduler (Optimization)**: The current `MAX_CONCURRENT = 3` is a good safeguard.
  - *Improvement*: Consider a priority queue if the number of URLs grows significantly (e.g., manual scans should jump the queue).
- **Screenshot Size (Optimization)**: Large screenshots are stored on disk and served via `@fastify/static`.
  - *Improvement*: For high-scale, consider S3 or similar object storage.
- **Frontend Rendering**: Resolved the infinite loop in `ReportPage.tsx`. The "Update state while rendering" pattern is now used correctly.
- **Database Indices**: Index on `urlId` and `timestamp` is optimal for the current queries.

---

## 4. Code Standards & Architecture

### Findings
- **Backend Modularity**: `server/index.ts` is becoming large (600+ lines).
  - *Recommendation*: Refactor into `/routes`, `/controllers`, and `/plugins`.
- **Type Safety**: TypeScript coverage is high. Use of `any` in `UrlModel.create` (line 196) should be resolved with better Mongoose/Zod type integration.
- **DRY Principle**: `IUrl` interface is duplicated in `client/src/types.ts` and `server/models/index.ts`.
  - *Recommendation*: Consider a shared workspace or a simple `shared` folder if possible, or keep them meticulously in sync.
- **Tests**: Good coverage for basic CRUD and scanning logic.
  - *Improvement*: Add unit tests for the custom scoring algorithm in `runner.ts`.

---

## 5. Summary of Recommended Improvements (Backlog)
1. [A11y] Add `aria-labels` to all icon-only buttons.
2. [A11y] Enhance screen reader descriptions for report links.
3. [Security] Harden Puppeteer sandbox configuration.
4. [Arch] Refactor `server/index.ts` into modular routes.
5. [Performance] Implement a scan queue instead of a simple interval-based chunk processor.
