# Development Guide

Welcome to the PD2 Trader development team! This guide will help you get started with the project and understand the development workflow.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)
- **Git** - [Download here](https://git-scm.com/)

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/errolgr/pd2-trade.git
   cd pd2-trade
   ```

2. **Install dependencies**

   ```bash
   # Install Node.js dependencies
   npm install

   # Install Rust dependencies (this will happen automatically on first build)
   ```

3. **Start development server**
   ```bash
   # Start the development server with hot reload
   npm run tauri dev
   ```

## 🛠 Tech Stack

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend (Tauri)

- **Rust** - System programming language
- **Tauri 2** - Desktop app framework
- **Serde** - Serialization/deserialization

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Sentry** - Error tracking and monitoring
- **Grafana Faro** - Usage metrics, web vitals and traces (enabled when `VITE_FARO_URL` is set at build time, see ARCHITECTURE.md)

## 📁 Project Structure

```
pd2-trade/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base UI components (shadcn/ui style)
│   │   ├── custom/        # Custom components
│   │   └── dialogs/       # Dialog components
│   ├── overlay/           # Single overlay window: panels, region click-through, keyboard, toasts
│   ├── pages/             # Panel contents
│   │   ├── landing/       # AppController (hotkeys, clipboard, chat watcher; renders nothing)
│   │   ├── price-check/   # Item price checking
│   │   ├── quick-list/    # Quick list functionality
│   │   └── settings/      # Settings page
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── common/            # Shared types and utilities
│   └── assets/            # Static assets
├── src-tauri/             # Rust/Tauri backend
│   ├── src/               # Rust source code
│   │   └── modules/       # Rust modules
│   └── Cargo.toml         # Rust dependencies
├── public/                # Public assets
│   └── runes/             # Rune images
└── docs/                  # Documentation
```

## 🔧 Development Commands

### Frontend Development

```bash
# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

### Pointing at a local backend

Search, deal badges, price history, saved-search alerts and the rest of the pd2trader.com API go to `BACKEND_URL` (`src/lib/pkce.ts`): `VITE_BACKEND_URL` when set at build/dev time, else `https://pd2trader.com`. To run against a local pd2-price-crawler (`npm run start:dev` there, port 3000 by default):

```bash
VITE_BACKEND_URL=http://localhost:3000 npm run tauri dev
# or put VITE_BACKEND_URL=http://localhost:3000 in .env.local (gitignored)
```

The market browser has no PD2 fallback for search: with the backend stopped it shows "Market service unavailable". PD2 calls (favorites, offers, the freshness check before an offer/whisper) still go to `api.projectdiablo2.com`.

### Documentation

```bash
# Start documentation dev server
npm run docs:dev

# Build documentation
npm run docs:build

# Preview documentation
npm run docs:preview
```

### Stat range data (each season)

Price check stat ranges copy BH's tooltip logic over PD2's data tables (`src/assets/stat-ranges.data.ts`). When the launcher manifest's `pd2data.mpq` checksum changes, regenerate it:

```bash
# needs StormLib's extract_mpq (libd2-pd2/packages/pd2/tools/extract_mpq)
EXTRACT_MPQ=/path/to/extract_mpq node scripts/generate-stat-ranges.mjs --download
```

Then re-capture `src/pages/price-check/lib/__fixtures__/stat-ranges-oracle.<season>.jsonl` from the live client (bh-harness, see `pd2-trade-oracle/README.md`) so `stat-ranges.test.ts` checks the new data against the real tooltips.

## 🎯 Key Features

### 1. Item Price Check

- Real-time item pricing from PD2 marketplace
- Rune exchange rates
- Item quality and stat analysis

### 2. Quick List

- Fast access to frequently used items
- Keyboard shortcuts for quick actions

### 3. Settings & Configuration

- User preferences
- Hotkey configuration
- Appearance settings

## 🔌 Development Workflow

### 1. Making Changes

1. Create a new branch for your feature/fix
2. Make your changes following the coding standards
3. Test your changes thoroughly
4. Commit with a descriptive message
5. Create a pull request

### 2. Code Standards

- Use TypeScript for all new code
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Never use `window.alert` / `confirm` / `prompt`: a native dialog wedges the non-focusable transparent overlay window (ESLint `no-alert`). Use `confirmToast` / `showToast` from `@/overlay` or an in-panel dialog
- New UI is a panel, not a window: add an entry to `src/overlay/registry.tsx` and open it with `useOverlay().openPanel(id, payload)`; read inputs with `usePanel()`. Mark drag handles with `data-panel-drag` (never `data-tauri-drag-region`)
- Do not emit app events from JS; `@/lib/browser-events` `listen` is only for events emitted by Rust
- Write meaningful commit messages
- Add comments for complex logic

### 3. Testing

- `npm test` runs the Vitest suite (also runs in CI on every PR and before release builds)
- `npm run test:coverage` adds a v8 coverage report (`coverage/`); game data tables in `src/assets` and type-only files are excluded
- Tests sit next to the code (`foo.ts` → `foo.test.ts`); DOM tests start with `// @vitest-environment happy-dom` and mock Tauri/plugin modules with `vi.mock`
- `it.fails` / `it.skip` tests marked `// BUG:` pin known bugs; fixing the bug flips them, so convert them to plain `it` in the fix
- Test and Tauri functionality
- Browser smoke test (no Tauri): `npm run dev` and open http://localhost:1420/. The app renders in the page (region and keyboard calls are no-ops). In dev builds the console exposes `window.__pd2Overlay`: `openPanel(id, payload?)`, `closePanel(id)`, `togglePanel(id, payload?)`, `isOpen(id)`, `showToast(payload)` and `state` (panel state snapshot), e.g. `__pd2Overlay.openPanel('settings')` or `__pd2Overlay.openPanel('currency', { tab: 'history' })`
- Verify hotkeys work correctly
- Test on Windows (primary platform)

### 4. Auto-Update Safety

A broken updater can only be fixed by users re-downloading the installer, so it is guarded at every stage:

- `src/hooks/useAppUpdates.test.tsx`, `src/lib/updater.test.ts`: check → download → relaunch flow, opt-out, notifications.
- `npm run verify:updater -- config`: version files agree; updater pubkey, endpoint, identifier and binary name match what installed builds expect; updater/process plugins registered and permitted. Changing the pinned values in `scripts/verify-updater.mjs` strands existing installs.
- Release workflow: before publishing, `verify-updater.mjs draft` checks the draft's `latest.json` (version, platforms, newer than live) and verifies every signature against its asset; after publishing, `verify-updater.mjs live` re-checks what installed apps download. Discord is only notified once that passes.
- `ci.yml` runs the live check daily.

## 🐛 Debugging

### Frontend Debugging

- Use browser dev tools for React debugging
- Check the console for errors
- Use React DevTools extension

### Tauri Debugging

- Check the Tauri console output
- Click-through problems: only `[data-interactive="true"]` panel frames, popovers, dialogs and toasts are clickable (`src/overlay/region.ts` → `set_interactive_region`); anything else passes clicks to the game
- Keyboard problems: the overlay only takes keyboard focus while a panel that accepts input is in use (`src/overlay/keyboard.ts`); closing the last one hands focus back to Diablo II (`focus_diablo`)
- Use `npm run tauri:debug` for debug builds

### Common Issues

1. **Port conflicts**: Ensure port 1420 is available
2. **Rust compilation errors**: Run `cargo clean` and try again
3. **Node modules issues**: Delete `node_modules` and `package-lock.json`, then `npm install`

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
