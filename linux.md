# Linux Migration Summary

This document outlines the changes made to port the PD2 Trader application to Linux, the rationale behind technical decisions, known limitations, and remaining work.

### Assumptions
* Let's for now assume you are running Bazzite with Wayland.  Terrible assumption, but I've got to start somewhere.
* Let's also assume you are running in Steam with some Proton compatibility layer that you have verified works with PD2.
* Let's assume you also know how to use the terminal, install system packages, and know your various installation directories, or at least how to find them.
* I have not declared all of the assumptions and steps I had to run to get this working.  I will update this document as I remember them.  There was work involved to get Rust and NPM installed, but I generally just followed the default installation for those system packages(Bazzite flavored).

## 1. Backend Changes (`src-tauri`)

The core challenge was decoupling Windows-specific APIs (Win32) from the application logic.

### Conditional Compilation & Dependencies
-   **[Cargo.toml](../src-tauri/Cargo.toml)**:
    -   Moved Windows-specific crates (`winapi`, `winreg`, `windows-sys`, `runas`) into `[target.'cfg(windows)'.dependencies]`.
    -   Added `notify` for cross-platform file watching (Chat Watcher).
    -   Updated `tauri-plugin-clipboard-manager` to a newer version.
-   **Code Guards**:
    -   Applied `#[cfg(target_os = "windows")]` attributes across [lib.rs](../src-tauri/src/lib.rs), [window.rs](../src-tauri/src/modules/window.rs), and [system.rs](../src-tauri/src/modules/system.rs) to isolate Windows-only logic.

### Window Management ([src/modules/window.rs](../src-tauri/src/modules/window.rs))
-   **Problem**: The app relies heavily on finding the "Diablo II" window handle (`HWND`) to get its position, size, and focus state.
-   **Linux Solution**:
    -   **Bounds Detection**: Instead of querying the OS window manager (which varies wildly between X11, Wayland, Gnome, KDE, etc.), we now read the `d2gl.json` configuration file.
    -   **Logic**: The [get_work_area](../src-tauri/src/modules/window.rs#104-138) function was refactored. On Linux, it reads the `d2gl.json` file from the configured **Diablo II Directory** to determine the game's resolution and position.
    -   **Focus Checks**: [is_diablo_focused](../src-tauri/src/modules/window.rs#69-73) is currently stubbed to always return `true` on Linux. This prevents the app from blocking interactions, as robust cross-platform window focus detection is complex.

### System Privileges ([src/modules/system.rs](../src-tauri/src/modules/system.rs))
-   **Problem**: The app checks for Admin privileges and attempts to restart itself as Admin on Windows.
-   **Linux Solution**:
    -   Stubbed [is_elevated](../src-tauri/src/modules/system.rs#31-37) to return `true` and [restart_as_admin](../src-tauri/src/modules/system.rs#38-70) to be a no-op. Linux users typically manage permissions via user groups or `sudo` if absolutely necessary, but the app should generally run in user space.

### Chat Watcher ([src/modules/chat_watcher.rs](../src-tauri/src/modules/chat_watcher.rs))
-   **New Feature**: Implemented a cross-platform log watcher to detect in-game whispers.
-   **Implementation**:
    -   Uses the `notify` crate to watch for file modifications.
    -   Uses standard `std::fs` and `std::io` for file reading, making it compatible with both Linux and Windows.
    -   Includes logic to auto-detect the Diablo II installation directory (checking Registry on Windows, common paths on Linux).

## 2. Frontend Changes ([src](../src))

The frontend required updates to support the new configuration requirements.

### Configuration UI ([GeneralForm](../src/components/dialogs/optionsv2/appearance/general-form.tsx#44-246))
-   **New Field**: Added **"Diablo II Directory"** to `Settings > General > Appearance`.
-   **Rationale**: Since we can't easily auto-detect the running game process path on Linux (or rely on Registry keys), we ask the user to explicitly point to their installation.
-   **Auto-Detection**: Added a button to invoke the backend's [auto_detect_diablo2_directory](../src-tauri/src/modules/chat_watcher.rs#69-73) command, which checks common Linux paths (e.g., `~/Games/Diablo II`, Steam libraries) and Windows Registry.

### State Management
-   **[useOptions](../src/hooks/useOptions.tsx#156-164)**: Updated the settings store to persist `diablo2Directory`. This path is passed to the backend to locate `d2gl.json` and `pd2_chat.log`.

## 3. Caveats & Shortcomings

### Window Focus (Critical)
-   **Current State**: The app assumes Diablo II is *always* focused on Linux.
-   **Impact**: Global hotkeys (like `Ctrl+C` for price checking) will fire even if you are alt-tabbed to another window (e.g., a browser), potentially overwriting your clipboard or triggering unwanted searches.
-   **Mitigation**: A warning is displayed in the Settings > General tab. Users should be aware of this behavior.
-   **Fix Required**: Implement X11 (via `xdotool` or `xcb`) and Wayland (via protocol extensions, though difficult) checks to verify active window title/class.

### Window Bounds
-   **Current State**: Bounds are static based on `d2gl.json`.
-   **Impact**: If `d2gl.json` is missing or the user is not using D2GL, the overlay will not position correctly.
-   **Mitigation**: The app now validates the existence of `d2gl.json` and will show an error if it is missing.

### Input Simulation
-   **Current State**: Uses `enigo` and `rdev` which have known challenges and incompatibilities with Wayland.
-   **Impact**:
    -   **Wayland**: Input simulation often fails on Wayland without specific compositor configuration or permissions or using XWayland maybe. The app might not be able to send `Ctrl+C` to the game.  **You currently always need to manually copy the item to the clipboard before using other commands like price checking or listing an item.**
    -   **X11**: Should work generally fine, but is as yet untested.

## 4. Remaining Work

1.  **Runtime Verification**:
    -   Verify `Ctrl+C` copy-paste flow works on the target Linux environment (Bazzite/Wayland).
    -   Verify the overlay window appears on top (Wayland often restricts "always on top" behavior).
2.  **Focus Implementation**:
    -   Research a crate or method to get the active window identifier on Linux to replace the `true` stub.
3.  **Path Refinement**:
    -   Ensure `d2gl.json` path construction handles case sensitivity correctly on Linux (Windows is case-insensitive) and supports alternative video modes for the PD2 game itself.
4.  **Packaging**:
    -   Update [tauri.conf.json](../src-tauri/tauri.conf.json) to include Linux-specific bundle configurations (deb, appimage).
    -   Make this cross-linux compatible, oof.  I have not tested packaging, and only have it working via `npm run tauri dev` or as installed from a packaged .deb file in an Ubuntu container running in my Bazzite install through DistroBox.  But it does work there.
