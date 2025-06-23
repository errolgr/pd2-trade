# PD2 Session Token & WebSocket Integration: Developer Overview

This document details how the PD2 Trader app obtains session tokens from the Project Diablo 2 website, how it uses them to interact with your websocket API, and addresses security and integration concerns. This is intended for maintainers of the PD2 website backend.

---

## 1. How Session Tokens Are Obtained (All Local)

- **Webview Login Flow:**  
  The app opens a dedicated webview window to `https://projectdiablo2.com/login` using Tauri's secure webview API.
- **User Authentication:**  
  The user logs in manually via the official website UI in the webview.
- **Token Extraction (Local Only):**  
  - The app injects a [small JavaScript snippet](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src-tauri/src/modules/webview.rs#L36-L44) into the webview that polls `localStorage` for a key named `pd2-token` (this is the only key checked for token extraction).
  - Once found, the token is sent to the **local Tauri process** (which runs on the user's own computer, not a remote server) via a custom URL scheme (`tauri://pd2-token-found?token=...`).
  - The Tauri process emits a local event to the app's frontend, which updates the app's settings and triggers websocket authentication.
  - **All of this happens locally on the user's device.** No session tokens or credentials are ever sent to any third-party or remote backend controlled by the app developers.
- **No Credential Interception:**  
  - The app does **not** intercept user credentials or passwords.
  - Only the session token (JWT) is extracted after successful login, and only from the webview's localStorage.

#### Code Reference
- [`src-tauri/src/modules/webview.rs`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src-tauri/src/modules/webview.rs): Webview creation and JS injection.
- [`src/hooks/pd2website/usePd2EventListeners.ts`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src/hooks/pd2website/usePd2EventListeners.ts): Event handling for token acquisition.

---

## 2. Session Token Storage & Security

- **In-Memory and Local Storage:**  
  - The session token is stored in the app's settings (`settings.json` in the app config directory) for the current user session.
  - The token is **not** persisted outside the app's config directory and is never transmitted to third parties.
- **No Token Sharing:**  
  - The token is only used for authenticating websocket connections to the official PD2 API.
  - The app does not expose the token to plugins, extensions, or external services.
  
#### Code Reference
- [`src/hooks/useOptions.tsx`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src/hooks/useOptions.tsx): Settings management and token storage.

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
    - See: [`src/hooks/pd2website/useStashCache.ts`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src/hooks/pd2website/useStashCache.ts) for implementation details.
  - **Event-Driven:**  
    - All requests and responses are handled via event listeners, ensuring that only authenticated users can perform actions.

#### Code Reference
- [`src/hooks/pd2website/usePd2Socket.ts`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src/hooks/pd2website/usePd2Socket.ts): Websocket connection and authentication.
- [`src/hooks/pd2website/useMarketActions.ts`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src/hooks/pd2website/useMarketActions.ts): Market actions.
- [`src/hooks/pd2website/useStashCache.ts`](https://github.com/errolgr/pd2-trade/blob/feat_list_item_and_get_listings/src/hooks/pd2website/useStashCache.ts): Stash fetching and caching.