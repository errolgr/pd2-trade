use crate::{keyboard, window};
use tauri::Manager;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_diablo_rect() -> Option<window::WindowRect> {
    window::get_diablo_rect()
}

#[tauri::command]
pub fn press_key(sequence: String) -> Result<(), String> {
    keyboard::press_key(sequence)
}

#[tauri::command]
pub fn is_diablo_focused() -> bool {
    window::is_diablo_focused()
}

#[tauri::command]
pub async fn open_project_diablo2_webview(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Spawn a new thread to avoid deadlocks on Windows
    std::thread::spawn(move || {
        let _ = crate::webview::open_project_diablo2_webview(app_handle);
    });
    Ok(())
}

#[tauri::command]
pub fn update_window_bounds(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(bounds) = window::get_appropriate_window_bounds() {
        if let Some(main_window) = app_handle.get_webview_window("main") {
            let _ = main_window.set_position(tauri::PhysicalPosition::new(bounds.x as f64, bounds.y as f64));
            let _ = main_window.set_size(tauri::PhysicalSize::new(bounds.width as f64, bounds.height as f64));
        }
    }
    Ok(())
}
