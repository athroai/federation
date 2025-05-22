# Athro Federation

A unified Vite Module Federation project that connects multiple Athro applications:
- athro-dashboard
- athro-metrics
- athro-workspace-2
- lovable-athro-ai-3

## Structure

- `apps/` - Contains the individual applications
- `packages/` - Contains shared libraries and components
  - `ui-components/` - Shared UI components
  - `shared/` - Shared utilities, types, and services
  - `remotes/` - Remote module definitions

## Development

```bash
# Install dependencies
npm install

# Run all apps in development mode
npm run dev
```
