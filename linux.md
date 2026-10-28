# Linux Migration Summary

This document outlines the changes made to port the PD2 Trader application to Linux, the rationale behind technical decisions, known limitations, and remaining work.

### Assumptions

- Let's for now assume you are running Bazzite with Wayland. Terrible assumption, but I've got to start somewhere.
- Let's also assume you are running in Steam with some Proton compatibility layer that you have verified works with PD2.
- Let's assume you also know how to use the terminal, install system packages, and know your various installation directories, or at least how to find them.
- I have not declared all of the assumptions and steps I had to run to get this working. I will update this document as I remember them. There was work involved to get Rust and NPM installed, but I generally just followed the default installation for those system packages(Bazzite flavored).

## 1. Backend Changes (`src-tauri`)

The core challenge was decoupling Windows-specific APIs (Win32) from the application logic.

### Conditional Compilation & Dependencies

- **[Cargo.toml](../src-tauri/Cargo.toml)**:
  - Moved Windows-specific crates (`winapi`, `winreg`, `windows-sys`, `runas`) into `[target.'cfg(windows)'.dependencies]`.
  - Added `notify` for cross-platform file watching (Chat Watcher).
  - Updated `tauri-plugin-clipboard-manager` to a newer version.
- **Code Guards**:
  - Applied `#[cfg(target_os = "windows")]` attributes across [lib.rs](../src-tauri/src/lib.rs), [window/](../src-tauri/src/modules/window/), and [system.rs](../src-tauri/src/modules/system.rs) to isolate Windows-only logic.

### Window Management ([src/modules/window/linux.rs](../src-tauri/src/modules/window/linux.rs))

- **Problem**: The app needs the "Diablo II" window's position, size and focus state, and every UI surface lives in one transparent overlay window that must let clicks through to the game.
- **Linux Solution** (X11 / XWayland via `x11rb`):
  - **Game window**: `find_diablo_window` locates the window by name; `get_diablo_rect` returns its root-relative geometry and `is_diablo_focused` compares it with `_NET_ACTIVE_WINDOW`.
  - **Overlay bounds**: `get_appropriate_window_bounds` returns the full rect of the monitor containing the centre of the Diablo II window (primary monitor if the game is not found). The single `Main` overlay window is sized to it.
  - **Click-through**: there is no window-wide ignore-cursor-events toggle. The frontend reports the rectangles of its visible panels through `set_interactive_region` ([region.rs](../src-tauri/src/modules/region.rs)); on Linux they become the GTK input shape (`input_shape_combine_region`, applied on the main thread). Everything outside the panels passes input to the game. An empty list becomes a 1x1 shape, so the overlay is fully click-through.
  - **Giving focus back**: `focus_diablo` sends a `_NET_ACTIVE_WINDOW` request, raises the window and sets input focus (best effort; depends on the window manager).

### System Privileges ([src/modules/system.rs](../src-tauri/src/modules/system.rs))

- **Problem**: The app checks for Admin privileges and attempts to restart itself as Admin on Windows.
- **Linux Solution**:
  - Stubbed [is_elevated](../src-tauri/src/modules/system.rs#31-37) to return `true` and [restart_as_admin](../src-tauri/src/modules/system.rs#38-70) to be a no-op. Linux users typically manage permissions via user groups or `sudo` if absolutely necessary, but the app should generally run in user space.

### Chat Watcher ([src/modules/chat_watcher.rs](../src-tauri/src/modules/chat_watcher.rs))

- **New Feature**: Implemented a cross-platform log watcher to detect in-game whispers.
- **Implementation**:
  - Uses the `notify` crate to watch for file modifications.
  - Uses standard `std::fs` and `std::io` for file reading, making it compatible with both Linux and Windows.
  - Includes logic to auto-detect the Diablo II installation directory (checking Registry on Windows, common paths on Linux).

## 2. Frontend Changes ([src](../src))

The frontend required updates to support the new configuration requirements.

### Configuration UI ([GeneralForm](../src/components/dialogs/optionsv2/appearance/general-form.tsx#44-246))

- **New Field**: Added **"Diablo II Directory"** to `Settings > General > Appearance`.
- **Rationale**: Since we can't easily auto-detect the running game process path on Linux (or rely on Registry keys), we ask the user to explicitly point to their installation.
- **Auto-Detection**: Added a button to invoke the backend's [auto_detect_diablo2_directory](../src-tauri/src/modules/chat_watcher.rs#69-73) command, which checks common Linux paths (e.g., `~/Games/Diablo II`, Steam libraries) and Windows Registry.

### State Management

- **[useOptions](../src/hooks/useOptions.tsx#156-164)**: Updated the settings store to persist `diablo2Directory`. This path is passed to the backend to locate `d2gl.json` and `pd2_chat.log`.

## 3. Caveats & Shortcomings

### Window Focus & Bounds (Critical)

- **Current State**: Focus, game rect and `focus_diablo` use X11 (`_NET_ACTIVE_WINDOW`). Under native Wayland (no XWayland for the game) the game window cannot be found.
- **Impact**: Without a game window the overlay covers the primary monitor, panels are placed relative to the whole screen, and global hotkeys cannot tell whether the game is in front.
- **Mitigation**: A warning is displayed in the Settings > General tab. Users should be aware of this behavior.

### Click-through on Wayland

- **Current State**: The interactive region is applied as a GTK input shape. Compositors that ignore input shapes for transparent always-on-top windows will make the whole overlay either clickable or click-through.

### Input Simulation

- **Current State**: Uses `enigo` and `rdev` which have known challenges and incompatibilities with Wayland.
- **Impact**:
  - **Wayland**: Input simulation often fails on Wayland without specific compositor configuration or permissions or using XWayland maybe. The app might not be able to send `Ctrl+C` to the game. **You currently always need to manually copy the item to the clipboard before using other commands like price checking or listing an item.**
  - **X11**: Should work generally fine, but is as yet untested.
- **When the Ctrl+C doesn't arrive**: the price check and Quick List say "No item was copied" (the clipboard didn't change) instead of "Item is not supported or invalid". KDE Plasma may ask for permission to control input devices; allow it. If the message stays, press `Ctrl+C` on the item yourself before the hotkey.

### Opening Links ([src/modules/opener.rs](../src-tauri/src/modules/opener.rs))

- **Problem**: The AppImage bundles the build machine's `xdg-open` (Ubuntu 22.04, xdg-utils 1.1.3), which exits successfully without opening anything on KDE Plasma 6, and AppRun points `LD_LIBRARY_PATH`, `GIO_EXTRA_MODULES`, `GTK_PATH` and friends into the image, which breaks the host's launchers and browser. tauri-plugin-opener also reports success as soon as the launcher started.
- **Linux Solution**: Links and the config folder open through the host's `xdg-open` (then `gio open`, `kde-open`, `gnome-open`), found on `PATH` without the image's directories and run with the image's entries taken out of the environment. A launcher that exits with an error counts as a failure; the sign-in then keeps waiting and both the sign-in window and Settings > Account offer **Copy link** to open it by hand.

### Rendering (WebKitGTK)

- **NVIDIA**: WebKitGTK's DMA-BUF renderer fails to allocate its buffers with NVIDIA's driver (`Failed to create GBM buffer`), leaving black or blank windows. When the `nvidia` kernel module is loaded the app sets `WEBKIT_DMABUF_RENDERER_FORCE_SHM=1` (shared-memory buffers; WebKitGTK 2.44+) unless `WEBKIT_DISABLE_DMABUF_RENDERER`, `WEBKIT_DMABUF_RENDERER_FORCE_SHM` or `WEBKIT_DISABLE_COMPOSITING_MODE` is already set. It avoids `WEBKIT_DISABLE_DMABUF_RENDERER=1`: since WebKitGTK 2.46 that turns accelerated compositing off altogether, which draws pages partially or crashes them.
- **Other GPUs with a black window**: start the app with `WEBKIT_DMABUF_RENDERER_FORCE_SHM=1`.

### Single Instance

- Launching the app while it already runs ends the new process right away (exit 0 after ~0.1 s in the journal) and opens Settings in the running one. If nothing appears, the running instance is stuck: quit it from the tray or `pkill -f pd2-trader-installer`.

## 4. Remaining Work

1.  **Runtime Verification**:
    - Verify `Ctrl+C` copy-paste flow works on the target Linux environment (Bazzite/Wayland).
    - Verify the overlay window appears on top (Wayland often restricts "always on top" behavior).
2.  **Focus Implementation**:
    - Research a crate or method to get the active window identifier on Linux to replace the `true` stub.
3.  **Path Refinement**:
    - Ensure `d2gl.json` path construction handles case sensitivity correctly on Linux (Windows is case-insensitive) and supports alternative video modes for the PD2 game itself.
4.  **Packaging**:
    - Update [tauri.conf.json](../src-tauri/tauri.conf.json) to include Linux-specific bundle configurations (deb, appimage).
    - Make this cross-linux compatible, oof. I have not tested packaging, and only have it working via `npm run tauri dev` or as installed from a packaged .deb file in an Ubuntu container running in my Bazzite install through DistroBox. But it does work there.
    - I have encountered an issue with hardware rendering(nvidia, mesa, wayland, x11, etc.) related to libEGL. A quick bit of researching uncovered an environment variable that forces software rendering and resolved the warning: `LIBGL_ALWAYS_SOFTWARE=1`. This may actually be a "safer" way of running the app in more distros since it probably abstracts the app from the underlying hardware. Obvious downside is potential performance impact due to software vs. hardware rendering. I have tested on my PC and it seems to run fine, no discernable difference in performance.

## 5. Build Process

I started with a fresh Debian bookworm container image: docker.io/library/debian:bookworm-backports

- sudo apt-get update
- sudo apt-get install -y git build-essential pkg-config libx11-dev libxi-dev libxtst-dev libglib2.0-dev libgdk-pixbuf2.0-dev libsoup-3.0-dev libnotify-dev libatk1.0-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev xdg-utils librsvg2-dev patchelf file
- git clone https://github.com/combatwombat16/pd2-trade.git
- cd pd2-trade
- ./scripts/install-rust.sh
- ./scripts/install-node.sh
- npm install
- npm run tauri build

This should create a deb, rpm, and appimage version of the application in the releases directory.
