# web

This is a Vite + React + React Router project with PWA support.

## Getting Started

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually [http://localhost:5173](http://localhost:5173), to see the result.

## Scripts

```bash
npm run dev     # Start the Vite dev server
npm run build   # Create a production build with PWA assets
npm run preview # Preview the production build locally
npm run lint    # Type-check the project
```

## PWA notes

- The app manifest and service worker are configured in `vite.config.ts`.
- The PWA icon reuses `/public/images/logo.png`.
- `app/main.tsx` registers the service worker with auto update.

## Routing

The current app is a single-page experience, but it already runs through React Router so you can add routes later without another framework switch.
