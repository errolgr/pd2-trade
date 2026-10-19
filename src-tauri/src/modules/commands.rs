use crate::{chat_watcher, debug_logger, keyboard, window};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn get_diablo_rect(app_handle: tauri::AppHandle) -> Option<window::WindowRect> {
    window::get_diablo_rect(&app_handle)
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
