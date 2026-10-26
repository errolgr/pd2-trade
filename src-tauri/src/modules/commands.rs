use crate::{chat_watcher, debug_logger, keyboard, window};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn get_diablo_rect(app_handle: tauri::AppHandle) -> Option<window::WindowRect> {
    let rect = window::get_diablo_rect(&app_handle);
    #[cfg(target_os = "linux")]
    if crate::modules::layer_shell::is_active() {
        return rect.map(crate::modules::layer_shell::to_overlay);
    }
    rect
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
    // A layer surface is sized by the compositor to its monitor; only the monitor can change.
    #[cfg(target_os = "linux")]
    if crate::modules::layer_shell::is_active() {
        crate::modules::layer_shell::move_to(&main_window, bounds);
        return Ok(());
    }

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

#[tauri::command]
pub fn write_debug_logs(entries: String) -> Result<(), String> {
    debug_logger::write_logs(&entries)
}

#[tauri::command]
pub async fn open_oauth_url(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Invalid URL scheme: only HTTP(S) is allowed".to_string());
    }

    app_handle
        .opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {}", e))
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
