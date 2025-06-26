use crate::{keyboard, webview, window};

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
