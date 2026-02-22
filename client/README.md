# Pa11y Dashboard NextGen - Client

The frontend application for the Pa11y Dashboard, built with React and Vite.

## Tech Stack

- **Framework**: React 19 (TypeScript)
- **Styling**: Tailwind CSS 4.2, Radix UI (Shadcn UI)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router 7
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Vitest, React Testing Library

## Key Features

- **Dashboard**: High-level overview of all monitored sites with real-time status and accessibility scores.
- **Rich Categories**: Organize URLs with custom icons and colors for better manageability.
- **Interactive Reports**: 
    - Full-page screenshots with issue mapping (click issue to highlight on image).
    - Historical trend charts per URL.
    - Multi-step interaction results (see results for each click/type action).
- **Advanced Configuration**: UI for per-URL overrides (runners, viewports, headers, and element exclusion).
- **Cron Editor**: Intuitive schedule management with presets and human-readable feedback.

## Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8080`.

3. **Build for production**:
   ```bash
   npm run build
   ```

## Testing & Quality

- **Run tests**: `npm run test`
- **Lint code**: `npm run lint`

## Component Guidelines

We use Radix UI and Tailwind CSS for accessible, consistent UI components. When adding new components, follow the existing patterns in `src/components/ui/`.
