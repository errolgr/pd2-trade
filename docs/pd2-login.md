# PD2 Session Token & WebSocket Integration: Developer Overview

This document details how the PD2 Trader app obtains session tokens from the Project Diablo 2 website, how it uses them to interact with your websocket API, and addresses security and integration concerns. This is intended for maintainers of the PD2 website backend.

---

## 1. How Session Tokens Are Obtained (All Local)

- **Webview Login Flow:**  
  The app opens a dedicated webview window to `https://projectdiablo2.com/login` using Tauri's secure webview API.
- **User Authentication:**  
  The user logs in manually via the official website UI in the webview.
- **Token Extraction (Local Only):**  
  - The app injects a small JavaScript snippet into the webview that polls `localStorage` for a key named `pd2-token` (this is the only key checked for token extraction).
  - Once found, the token is sent to the **local Tauri process** (which runs on the user's own computer, not a remote server) via a custom URL scheme (`tauri://pd2-token-found?token=...`).
  - The Tauri process emits a local event to the app's frontend, which updates the app's settings and triggers websocket authentication.
  - **All of this happens locally on the user's device.** No session tokens or credentials are ever sent to any third-party or remote backend controlled by the app developers.
- **No Credential Interception:**  
  - The app does **not** intercept user credentials or passwords.
  - Only the session token (JWT) is extracted after successful login, and only from the webview's localStorage.

#### Code Reference
- `src-tauri/src/modules/webview.rs`: Webview creation and JS injection.
- `src/hooks/pd2website/usePd2EventListeners.ts`: Event handling for token acquisition.

---

## 2. Session Token Storage & Security

- **In-Memory and Local Storage:**  
  - The session token is stored in the app's settings (`settings.json` in the app config directory) for the current user session.
  - The token is **not** persisted outside the app's config directory and is never transmitted to third parties.
- **No Token Sharing:**  
  - The token is only used for authenticating websocket connections to the official PD2 API.
  - The app does not expose the token to plugins, extensions, or external services.
- **User Control:**  
  - Users can clear or refresh their session at any time by logging out and back in.

#### Code Reference
- `src/hooks/useOptions.tsx`: Settings management and token storage.

---

## 3. WebSocket API Usage

- **Connection:**  
  - The app connects to `wss://api.projectdiablo2.com` using `socket.io-client`.
- **Authentication:**  
  - On connect, the app sends a `create security/session` command with the JWT (`accessToken`) via the raw websocket.
  - The server's response is parsed and, if valid, the user's account info is stored in memory.
- **API Actions:**  
  - **Market Listings:**  
    - The app can search for, list, and fetch market items using the authenticated websocket.
    - Commands are sent as JSON arrays, e.g. `["find", "market/listing", query]` or `["create", "market/listing", {...}]`.
  - **Stash Access:**  
    - The app can fetch the user's stash with `["get","game/stash", account, {...}]`.
  - **Stash Caching (Load Reduction):**  
    - To reduce load on the PD2 API, game stashes are cached locally in memory for a short period (5 minutes). Repeated requests for the stash within this window are served from the cache rather than making additional websocket requests. This helps minimize unnecessary traffic to the PD2 backend.
    - See: `src/hooks/pd2website/useStashCache.ts` for implementation details.
  - **Event-Driven:**  
    - All requests and responses are handled via event listeners, ensuring that only authenticated users can perform actions.

#### Code Reference
- `src/hooks/pd2website/usePd2Socket.ts`: Websocket connection and authentication.
- `src/hooks/pd2website/useMarketActions.ts`: Market actions.
- `src/hooks/pd2website/useStashCache.ts`: Stash fetching and caching.

---

## 4. Security & Privacy Considerations

- **No Credential Storage:**  
  - The app never stores or transmits user credentials (username/password).
- **Token Scope:**  
  - The session token is only used for websocket authentication and is never sent to third-party services.
- **Webview Isolation:**  
  - The login webview is isolated from the main app context and is only used for the login flow.
- **Permissions:**  
  - The app requests only the minimum permissions required for webview and websocket functionality (see `src-tauri/capabilities/default.json`).

---

## 5. Integration Notes for PD2 Website Maintainers

- **Token Key:**  
  - The app expects the JWT to be available in `localStorage` under the key `pd2-token` after login.
  - If the website changes its storage strategy, please notify the app maintainers to update the extraction logic.
- **WebSocket API:**  
  - The app uses only documented, authenticated websocket endpoints.
  - All actions are performed as the logged-in user, and the app does not attempt to escalate privileges or bypass security checks.
- **Event-Driven Architecture:**  
  - The app's frontend and local Tauri process communicate via Tauri events, ensuring a clear separation of concerns and easy debugging.

---

## 6. Troubleshooting

- **Login Issues:**  
  - If the app cannot find the session token, ensure the website is storing it in `localStorage.pd2-token`.
- **WebSocket Errors:**  
  - Ensure the token is valid and not expired; the app will prompt the user to re-login if authentication fails.
- **Permission Errors:**  
  - Check that the app has the required webview and websocket permissions in its Tauri config.

---

For further questions or to coordinate API changes, please contact the PD2 Trader app maintainers.