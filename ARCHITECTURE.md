# 🏗️ PD2 Trader Application Architectures

## 1. ⚛️ Frontend Architecture (TypeScript)

The frontend is a **React** application built with **Vite** and styled using **Tailwind CSS**. It serves as the primary user interface for trading, price checking, and settings management.

### Key Components

- **Overlay**: `src/overlay`. The whole UI runs in **one** transparent, always-on-top Tauri window (`Main`) that hosts every surface as a _panel_ in a single React tree (see [Overlay window & panels](#overlay-window--panels)).
- **Pages**: Located in `src/pages`. Each feature (Price Check, Trade Chat, Settings) has its own directory; each page is the content of a panel.
- **App controller**: `src/pages/landing/AppController.tsx` holds app-wide behaviour that is not a panel: global hotkeys, clipboard item capture, chat watcher, socket notifications, updates/auth/changelog.
- **Hooks**: Custom hooks in `src/hooks` encapsulate logic for authentication (`usePD2Auth`), trading (`useTradeOffers`), and system interaction. Providers (options, items, PD2 website, net worth) are mounted exactly once at the root in `src/main.tsx`.
- **IPC Layer**: `invoke` for Rust commands; `src/lib/browser-events.ts` `listen` only subscribes to events **emitted by Rust** (chat watcher, Diablo focus). The frontend never emits app events: UI actions go through the overlay API and data through providers. `src/lib/browser-http.ts` wraps HTTP for external APIs.

### Overlay window & panels

- **One window**: Rust builds `Main` transparent, undecorated, always on top, `focusable(false)`, `resizable(false)`, covering the full monitor that contains the Diablo II window (primary monitor as fallback), and re-fits it when the game moves or regains focus. There are no other windows (no Toast window, no window-state plugin).
- **Panels**: `src/overlay/registry.tsx` defines every panel (`itemSearch`, `quickList`, `currency`, `chat`, `chatButton`, `tradeMessages`, `settings`, `changeLog`, `signIn`, `delist`, `netWorthTicker`, `netWorthPanel`) with its size, default placement (relative to the game rect, the screen or the cursor), persistence, keyboard policy and whether it stays mounted while closed. Code opens them through `useOverlay()` (`openPanel(id, payload)`, `closePanel`, `togglePanel`, `isOpen`); a panel reads its input with `usePanel()` (`payload`, `payloadVersion`, `close`, `setRect`). Panels drag by elements marked `data-panel-drag` (never `data-tauri-drag-region`, which would drag the whole overlay).
- **Region click-through**: the window is click-through everywhere except where panels are. `src/overlay/region.ts` collects the rects of `[data-interactive]` frames and open popovers/dialogs/toasts and sends them, in physical pixels, to the Rust command `set_interactive_region` (`src-tauri/src/modules/region.rs`: `SetWindowRgn` on Windows, GTK input shape on Linux). Rust seeds an empty region right after creating the window, so it is click-through before React mounts.
- **Keyboard claim/release**: the window is normally not focusable, so the game keeps focus (and keeps playing sound). Opening or clicking a panel never takes focus; only a click into a text field does. `src/overlay/keyboard.ts` `claimKeyboard()` then makes the window focusable and brings it to the front with the Rust command `focus_overlay` (plain `setFocus()` is refused by Windows while the game holds the foreground right; `focus_overlay` attaches to the foreground thread's input queue to get past that, and reports whether it worked). A click anywhere else in a panel, or closing the last keyboard panel, calls `releaseKeyboard()`: non-focusable again and `focus_diablo`. Hotkeys that copy the item under the cursor release first, so the Ctrl+C reaches the game.
- **Dismissing panels (`closeOnBlur`)**: a click outside every panel closes them. On Windows a low-level mouse hook (`src-tauri/src/modules/window/outside_click.rs`) runs only while such a panel is open and hit-tests button-downs against the current interactive region, emitting `overlay-outside-click`; the click still reaches the game. Leaving the overlay or the game for another app also closes them, from the Rust foreground hook (`foreground-changed`, see `window/focus.rs`), except for our own hand-offs to the game.
- **Toasts**: `showToast()` / `confirmToast()` from `@/overlay` render in the in-overlay toast layer.
- **Never use `window.alert` / `confirm` / `prompt`**: a native dialog wedges the non-focusable transparent window (ESLint `no-alert` enforces this). Use `confirmToast` or an in-panel dialog.

### 👶 "Explain it like I'm 5"

Imagine the frontend is like the dashboard of a car. It shows you the speed (prices), lets you turn on the radio (chat), and tells the engine (backend) what to do when you press the pedals (buttons).

## 2. 🦀 Backend Architecture (Rust)

The backend is built with **Tauri** using **Rust**. It handles system-level tasks that a web browser cannot do, like reading game files, simulating keystrokes, and managing transparent overlay windows.

### Key Modules

- **Commands**: Defined in `src-tauri/src/modules/commands.rs`. These are functions the frontend can call directly (e.g., `get_diablo_rect`, `press_key`).
- **Chat Watcher**: `src-tauri/src/modules/chat_watcher.rs`. Monitors the Diablo 2 chat log file for new messages and emits events to the frontend.
- **Window Management**: `src-tauri/src/modules/window/`. Finds the Diablo II window (rect, focus, `focus_diablo`), brings the overlay to the front for typing (`focus_overlay`), sizes the overlay window to the game's monitor, tracks foreground changes (`focus.rs`: game context and raw foreground owner) and watches for clicks outside the panels (`outside_click.rs`, Windows). `src-tauri/src/modules/region.rs` applies the interactive region (click-through outside panels) so that the overlay appears correctly over the game.
- **Keystroke Simulation**: Implemented in `src-tauri/src/modules/keyboard.rs` using the **Enigo** crate.
  - **How it works**: The frontend sends a string like "Ctrl+V". The backend parses this string, separating modifiers (Ctrl, Alt) from the main key (V). It then uses OS-level inputs to simulate pressing the modifiers down, clicking the main key, and releasing the modifiers. This is essential for features like "Quick List" or Item Search, where you can hover over an item and press the hotkey to quick list it and the application will first copy the item you are hovering over then issuing the list command.

### 👶 "Explain it like I'm 5"

The backend is the car's engine and wheels. It does the heavy lifting—reading the road (game files), moving the car (windows), and honking the horn (simulating keys) when the dashboard (frontend) tells it to. It uses a robotic finger (Enigo) to press buttons on your keyboard when you ask it to.

## 3. 🔄 Frontend <-> Backend Interaction

The two sides communicate using **Tauri's Inter-Process Communication (IPC)**.

### Common Interaction Flows

#### A. Price Checking an Item

1.  **User Action**: User presses `Ctrl+C` on an item in Diablo 2.
2.  **Backend Detect**: The clipboard change or hotkey is detected (managed by `tauri-plugin-clipboard` or global shortcuts).
3.  **Frontend Receive**: Logic in `src/hooks/useShortcuts.tsx` or clipboard listeners captures the item text.
4.  **Process**: `AppController` encodes the item text and calls `openPanel('itemSearch', { text })`.
5.  **Display**: The `itemSearch` panel (`src/pages/price-check/ItemPage.tsx`) reads the payload via `usePanel()`, starts a new search on every `payloadVersion`, and queries the PD2 API for prices.

```mermaid
sequenceDiagram
    participant User
    participant Game as Diablo 2
    participant BE as Rust Backend
    participant FE as React Frontend
    participant API as PD2 API

    User->>Game: Hovers Item & Press Hotkey
    User->>BE: Triggers Global Shortcut
    BE->>FE: Emits Event (shortcuts:price-check)
    FE->>BE: Request Clipboard Content
    BE->>FE: Return Item Text
    FE->>API: Query Item Price
    API->>FE: Return Market Data
    FE->>User: Show Price Overlay
```

#### B. Trade Chat Monitoring

1.  **Setup**: Frontend calls `start_chat_watcher` with the game directory.
2.  **Monitor**: Backend polls or watches the `chat.log` file for changes.
3.  **Notify**: When a line is written, Backend emits a `chat-event` to Frontend.
4.  **Display**: Frontend parses the line (e.g., "Offer: ...") and shows a notification.

### 👶 "Explain it like I'm 5"

It's like a walkie-talkie. The Frontend presses a button to say "Hey Backend, check the prices!" The Backend heads out, does the work, and radioes back "Here are the prices!" Sometimes the Backend speaks first, like "Hey Frontend, I just heard a new chat message!"

## 4. 🔒 Security & Authorization Flows

Authentication is handled securely via **JSON Web Tokens (JWT)**.

### Auth Flow

- **Token Storage**: The JWT is stored in the application settings (`src/hooks/useOptions.tsx`).
- **Login**:
  - If no token exists or it is expired, `usePD2Auth.tsx` triggers a login flow.
  - **Tauri**: Opens a secure webview to `projectdiablo2.com/auth`.
  - **Browser**: Redirects to the auth page.
- **Handover**: Once authenticated on the website, the site passes the token back to the application via a custom protocol or event, which is captured and saved.

### API Security

- All requests to `api.projectdiablo2.com` include the `Authorization: Bearer <token>` header.
- The backend does _not_ store passwords. It only holds the temporary access token.

> [!IMPORTANT]
> **Authenticated Actions**
> The following actions require a valid PD2 Token:
>
> - **Fetching Trade Offers**: Viewing incoming and outgoing offers.
> - **Managing Offers**: Accepting, rejecting, or revoking offers.
> - **Price Checking (Specific)**: Some detailed market data may require user context (though general price checks are often public).
> - **Social**: Retrieving user account details or friends.

```mermaid
sequenceDiagram
    participant App as PD2 Trader
    participant Web as Auth Webview
    participant Server as PD2 Server

    App->>App: Check Token Expiry
    alt Token Expired/Missing
        App->>Web: Open Auth Page
        Web->>Server: User Logs In
        Server->>Web: Return JWT
        Web->>App: Pass JWT to App
        App->>App: Save Token to Settings
    end
    App->>Server: API Request + Token
    Server->>App: Protected Data
```

### 👶 "Explain it like I'm 5"

The app needs a special ticket (Token) to talk to the project servers. It doesn't know your username or password. Instead, it sends you to the official website to sign in. The website gives the app a ticket that says "This user is okay." The app uses this ticket for all requests until it expires, then it asks you to get a new one.

## 5. 🛠️ Build Process

The application is built and released using **GitHub Actions**, ensuring a consistent and automated delivery pipeline.

### Build Steps (CI/CD)

The workflow is defined in `.github/workflows/publish-to-manual-release.yml` and performs the following:

1.  **Environment Setup**:
    - Installs Node.js (LTS) and Rust (Stable).
    - On Linux (Ubuntu), installs system dependencies like `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, and other build essentials.
2.  **Dependencies**:
    - Runs `npm install` to install frontend packages.
3.  **Tauri Build**:
    - Uses `tauri-apps/tauri-action` to build the application for multiple platforms (Windows, Linux, macOS).
    - This compiles the Rust backend and bundles the React frontend into a native executable/installer (`.msi`, `.deb`, `.AppImage`).
4.  **Release**:
    - Automatically creates a GitHub Release draft.
    - Uploads the artifacts.
    - Publishes the release and sends a Discord notification with the changelog.

### Manual Build (Local)

To build the application locally:

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### 👶 "Explain it like I'm 5"

Building the app is like baking a cake. You need the ingredients (code components), the kitchen tools (Node.js & Rust), and a recipe (Build Script).

1.  **Mix Ingredients**: We mix the flour and sugar (Frontend code) and the eggs and milk (Backend code).
2.  **Bake**: We put it in the oven (Compiler) which turns the raw ingredients into a solid cake (Executable file).
3.  **Frosting**: We put it in a nice box (Installer) so it's ready to be given to people (Users).

## 6. 🐞 Logging & Error Monitoring (Sentry + Grafana)

Monitoring is split in two:

- **Sentry** tracks errors and crashes so developers can fix bugs quickly.
- **Grafana Faro** (Grafana Cloud Frontend Observability) collects usage metrics, web vitals and traces to our own backend.

### Sentry (errors)

- **Initialization**: Sentry is initialized in `src/main.tsx` asynchronously to avoid slowing down startup.
- **Errors**: Uncaught errors and `console.error` are reported. Expected user-state errors (`AccountMismatchError`, `AuthenticationError`, "is not associated with your logged-in account") are dropped. API failures go through `src/lib/error-reporting.ts`, which reports only 5xx responses, grouped by service, status code and endpoint.
- **Performance**: Captures 100% of transactions (`tracesSampleRate: 1.0`) to debug performance issues.
- **Replays**: Records session replays for 10% of sessions (100% on errors) to see exactly what the user did before a crash.
- **Privacy**: Local API calls (IPC) are filtered out to reduce noise and protect privacy.
  - **Session Replay Privacy**: By default, Sentry masks **all text content** and **inputs** (including usernames and passwords) with asterisks (`***`). It does **not** record raw keystrokes or sensitive data entered into forms.
- **Source maps**: uploaded by `@sentry/vite-plugin` when `SENTRY_AUTH_TOKEN` is set at build time.

### Grafana Faro (metrics, web vitals, traces)

- **Configuration**: Faro is only initialized when the build-time `VITE_FARO_URL` (Faro collector URL) is set. Local builds without it send nothing to Grafana.
- **Initialization**: `src/lib/faro.ts` (called from `src/main.tsx`). The whole overlay runs in the single `Main` webview, so there is one Faro session; the `window_label` session attribute and the view name are `Main` (`browser` in browser dev mode), and the route (path only) is the Faro page id.
- **No errors**: Faro's error and console instrumentations are not installed, so exceptions are only reported to Sentry.
- **Measurements & events**: `src/lib/telemetry.ts` (`trackMeasurement` for operations with durations/counts, `trackEvent` for discrete actions). Names are snake_case, value keys carry their unit (`duration_ms`, `*_items`, `price_hr`), attributes must stay low-cardinality.
- **Tracing**: fetch/XHR spans are recorded; the `traceparent` header is only sent to our own backend (`VITE_BACKEND_URL` / pd2trader.com), never to the projectdiablo2.com API.
- **Privacy**: Tauri IPC traffic (`ipc.localhost`) is excluded from tracing, and query strings are stripped from page URLs.

### 👶 "Explain it like I'm 5"

Sentry is like the car's "Black Box". If the app crashes or runs slowly, Sentry records what happened right before and sends a report to the developers so they can fix the engine. Grafana is the dashboard: it counts how often each feature is used and how fast it is.
