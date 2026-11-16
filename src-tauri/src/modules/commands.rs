use crate::modules::{d2_directory, opener, system};
use crate::{chat_watcher, debug_logger, keyboard, window};
use std::path::Path;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn get_diablo_rect(app_handle: tauri::AppHandle) -> Option<window::WindowRect> {
    window::get_diablo_rect(&app_handle)
}

/// Where a windowed Diablo II locks the cursor (physical px); None when the cursor is free or the game fullscreen.
#[tauri::command]
pub fn get_cursor_lock() -> Option<window::WindowRect> {
    window::get_cursor_lock()
}

#[tauri::command]
pub fn press_key(sequence: String) -> Result<(), String> {
    keyboard::press_key(sequence)
}

/// Game context, not raw focus: true while Diablo II is in front or our overlay was focused from it
/// (see `window::focus`). Same value as the `diablo-focus-changed` event.
#[tauri::command]
pub fn is_diablo_focused() -> bool {
    window::is_game_context()
}

/// Milliseconds since the user last touched the keyboard or mouse (any app); None when unknown.
#[tauri::command]
pub fn input_idle_ms() -> Option<u64> {
    system::input_idle_ms()
}

/// Diablo II fills its monitor (D2GL fullscreen): while it holds the foreground the graphics driver draws nothing
/// else on that monitor, so a panel only shows once the overlay takes the foreground (see `window::diablo_fullscreen`).
#[tauri::command]
pub fn is_diablo_fullscreen() -> bool {
    window::diablo_fullscreen()
}

#[tauri::command]
pub fn focus_diablo() -> bool {
    window::focus_diablo()
}

/// Watches for clicks outside the overlay's panels while a dismissable panel is open (Windows; emits
/// `overlay-outside-click`), so it can close without the overlay ever taking focus from the game.
#[tauri::command]
pub fn set_outside_click_watch(
    app_handle: tauri::AppHandle,
    overlay: tauri::WebviewWindow,
    enabled: bool,
) {
    #[cfg(target_os = "windows")]
    if let Ok(hwnd) = overlay.hwnd() {
        window::set_outside_click_watch(&app_handle, hwnd.0 as isize, enabled);
    }
    #[cfg(not(target_os = "windows"))]
    let _ = (app_handle, overlay, enabled);
}

/// Brings the overlay to the foreground so a panel gets the keyboard; false when the OS refused.
/// Sync on purpose: runs on the main thread, which owns the overlay window.
#[tauri::command]
pub fn focus_overlay(overlay: tauri::WebviewWindow) -> bool {
    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = overlay.hwnd() {
            if window::bring_to_foreground(hwnd.0 as isize) {
                return true;
            }
        }
        // Last resort, Tauri's own path (SetForegroundWindow, then a simulated Alt press)
        let _ = overlay.set_focus();
        overlay.is_focused().unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    {
        overlay.set_focus().is_ok()
    }
}

/// Fits the Main overlay to the monitor containing Diablo II (primary monitor fallback).
/// No-op when the window already covers that rect.
#[tauri::command]
pub fn update_window_bounds(app_handle: tauri::AppHandle) -> Result<(), String> {
    let Some(bounds) = window::get_appropriate_window_bounds(&app_handle) else {
        return Ok(());
    };
    let Some(main_window) =
        app_handle.get_webview_window(&crate::modules::config::WINDOW_CONFIG.labels.Main)
    else {
        return Ok(());
    };

    let position = main_window.outer_position().map_err(|e| e.to_string())?;
    if position.x != bounds.x || position.y != bounds.y {
        main_window
            .set_position(tauri::PhysicalPosition::new(bounds.x, bounds.y))
            .map_err(|e| e.to_string())?;
    }
    // Read the size only after moving: crossing onto a monitor with a different DPI makes
    // WM_DPICHANGED rescale the window, so a size read before the move would be stale.
    let size = main_window.outer_size().map_err(|e| e.to_string())?;
    if size.width as i32 != bounds.width || size.height as i32 != bounds.height {
        main_window
            .set_size(tauri::PhysicalSize::new(bounds.width as u32, bounds.height as u32))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn start_chat_watcher(
    app_handle: tauri::AppHandle,
    custom_d2_dir: Option<String>,
) -> Result<(), String> {
    chat_watcher::start_watching(app_handle, custom_d2_dir)
}

#[tauri::command]
pub fn stop_chat_watcher() -> Result<(), String> {
    chat_watcher::stop_watching()
}

#[tauri::command]
pub fn get_diablo2_directory(custom_path: Option<String>) -> Option<String> {
    chat_watcher::find_diablo2_directory(custom_path.as_deref())
        .and_then(|p| p.to_str().map(|s| s.to_string()))
}

#[tauri::command]
pub fn auto_detect_diablo2_directory() -> Option<String> {
    chat_watcher::auto_detect_diablo2_directory().and_then(|p| p.to_str().map(|s| s.to_string()))
}

/// Whether a typed or picked folder is a Diablo II install (or a Wine prefix holding one).
#[tauri::command]
pub fn check_diablo2_directory(path: String) -> d2_directory::DirectoryCheck {
    d2_directory::check(&path)
}

/// Native folder picker for the Diablo II directory, so it can be changed without typing (the overlay may not
/// get the keyboard, e.g. under KWin). A picked Wine prefix comes back as the install inside it. None = cancelled.
/// Async so the blocking wait runs off the main thread, which shows the dialog.
#[tauri::command]
pub async fn pick_diablo2_directory(
    app_handle: tauri::AppHandle,
    overlay: tauri::WebviewWindow,
    current: Option<String>,
) -> Option<String> {
    let mut dialog = app_handle.dialog().file().set_parent(&overlay);
    if let Some(dir) = current.as_deref().map(Path::new).filter(|dir| dir.is_dir()) {
        dialog = dialog.set_directory(dir);
    }
    let picked = dialog.blocking_pick_folder()?.into_path().ok()?;
    Some(
        d2_directory::resolve(&picked)
            .to_string_lossy()
            .into_owned(),
    )
}

#[tauri::command]
pub fn write_debug_logs(entries: String) -> Result<(), String> {
    debug_logger::write_logs(&entries)
}

/// Opens an http(s) URL in the default browser (sign-in, listings, profiles); fails when nothing could open it.
/// Off the async runtime's threads: on Linux it waits for the launcher's verdict.
#[tauri::command]
pub async fn open_url(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || opener::open_url(&app_handle, &url))
        .await
        .map_err(|e| e.to_string())?
}

/// Opens the app's config folder in the file manager (tray menu).
#[tauri::command]
pub async fn open_config_dir(app_handle: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || opener::open_config_dir(&app_handle))
        .await
        .map_err(|e| e.to_string())?
}

/// The sign-in window: an ordinary app window (taskbar entry, minimizable, not always on top) so it can sit
/// behind other apps while the user signs in in the browser. Its page is a view; Main runs the sign-in.
pub const SIGN_IN_LABEL: &str = "SignIn";
/// Emitted to Main when the user closes the sign-in window.
pub const SIGN_IN_CLOSED_EVENT: &str = "sign-in-window-closed";

/// Opens the sign-in window, or restores it if minimized; either way brings it to the front with focus.
/// Async: building a window from a sync command deadlocks on Windows.
#[tauri::command]
pub async fn open_sign_in_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = match app_handle.get_webview_window(SIGN_IN_LABEL) {
        Some(window) => {
            let _ = window.unminimize();
            let _ = window.show();
            window
        }
        None => tauri::WebviewWindowBuilder::new(
            &app_handle,
            SIGN_IN_LABEL,
            tauri::WebviewUrl::App("index.html?window=sign-in".into()),
        )
        .title("PD2 Trader - Sign in")
        .inner_size(440.0, 340.0)
        .resizable(false)
        .maximizable(false)
        .center()
        .always_on_top(false)
        .skip_taskbar(false)
        .focused(true)
        .build()
        .map_err(|e| e.to_string())?,
    };
    focus_window(&window);
    Ok(())
}

/// Brings a window to the front even while another app holds the foreground (the browser, mid sign-in).
fn focus_window(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    if let Ok(hwnd) = window.hwnd() {
        if window::bring_to_foreground(hwnd.0 as isize) {
            return;
        }
    }
    let _ = window.set_focus();
}

#[tauri::command]
pub fn close_sign_in_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window(SIGN_IN_LABEL) {
        let _ = window.destroy();
    }
}

/// Whether the updater can replace this install in place. Linux deb/rpm installs get the AppImage from latest.json
/// (rejected or EACCES in /usr/bin), and an AppImage in a folder the user can't write to can't be swapped either;
/// the frontend checks this before downloading ~100 MiB that could never install.
#[tauri::command]
pub fn self_update_supported() -> bool {
    #[cfg(target_os = "linux")]
    {
        use tauri::utils::{config::BundleType, platform::bundle_type};
        let package_managed = matches!(bundle_type(), Some(BundleType::Deb | BundleType::Rpm));
        let target = std::env::var_os("APPIMAGE")
            .map(std::path::PathBuf::from)
            .or_else(|| std::env::current_exe().ok());
        can_replace_install(package_managed, target.as_deref())
    }
    #[cfg(not(target_os = "linux"))]
    {
        true
    }
}

/// Linux decision: package-managed installs never self-update; otherwise the folder holding the binary must be writable.
#[cfg(any(target_os = "linux", test))]
fn can_replace_install(package_managed: bool, target: Option<&std::path::Path>) -> bool {
    if package_managed {
        return false;
    }
    match target.and_then(std::path::Path::parent) {
        Some(dir) => dir_writable(dir),
        None => true,
    }
}

/// Probes by creating (and removing) a file: permission bits alone miss ACLs, read-only mounts and root.
#[cfg(any(target_os = "linux", test))]
fn dir_writable(dir: &std::path::Path) -> bool {
    let probe = dir.join(format!(".pd2-trader-update-probe-{}", std::process::id()));
    match std::fs::OpenOptions::new().write(true).create_new(true).open(&probe) {
        Ok(_) => {
            let _ = std::fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod self_update_tests {
    use super::*;

    #[test]
    fn package_managed_install_never_self_updates() {
        let dir = std::env::temp_dir();
        assert!(!can_replace_install(true, Some(&dir.join("pd2-trader"))));
        assert!(!can_replace_install(true, None));
    }

    #[test]
    fn writable_folder_allows_update_and_leaves_no_probe() {
        let dir = std::env::temp_dir().join(format!("pd2-upd-ok-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        assert!(can_replace_install(false, Some(&dir.join("pd2-trader.AppImage"))));
        assert_eq!(std::fs::read_dir(&dir).unwrap().count(), 0);
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn missing_or_unwritable_folder_blocks_update() {
        let gone = std::env::temp_dir().join(format!("pd2-upd-missing-{}", std::process::id()));
        assert!(!can_replace_install(false, Some(&gone.join("pd2-trader.AppImage"))));
    }

    #[test]
    fn unknown_location_falls_back_to_updating() {
        assert!(can_replace_install(false, None));
    }

    #[test]
    fn command_is_true_off_linux() {
        if !cfg!(target_os = "linux") {
            assert!(self_update_supported());
        }
    }
}
