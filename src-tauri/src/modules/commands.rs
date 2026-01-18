use crate::{chat_watcher, double_shift, keyboard, window};
use tauri::Manager;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_diablo_rect(app_handle: tauri::AppHandle) -> Option<window::WindowRect> {
    window::get_diablo_rect(&app_handle)
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
    if let Some(bounds) = window::get_appropriate_window_bounds(&app_handle) {
        if let Some(main_window) =
            app_handle.get_webview_window(&crate::modules::config::WINDOW_CONFIG.labels.Main)
        {
            // Ensure window is not maximized before resizing
            if let Ok(true) = main_window.is_maximized() {
                let _ = main_window.unmaximize();
            }

            // Set Position
            let _ = main_window.set_position(tauri::PhysicalPosition::new(
                bounds.x as f64,
                bounds.y as f64,
            ));

            // Set Size
            let _ = main_window.set_size(tauri::PhysicalSize::new(
                bounds.width as f64,
                bounds.height as f64,
            ));
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_window_click_through(app_handle: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(main_window) =
        app_handle.get_webview_window(&crate::modules::config::WINDOW_CONFIG.labels.Main)
    {
        main_window
            .set_ignore_cursor_events(ignore)
            .map_err(|e| format!("Failed to set click-through: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn force_window_focus(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(main_window) =
        app_handle.get_webview_window(&crate::modules::config::WINDOW_CONFIG.labels.Main)
    {
        main_window
            .set_focus()
            .map_err(|e| format!("Failed to set window focus: {}", e))?;
        main_window
            .set_always_on_top(true)
            .map_err(|e| format!("Failed to set always on top: {}", e))?;
        // Reset always on top after a short delay
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if let Some(window) = app_handle_clone
                .get_webview_window(&crate::modules::config::WINDOW_CONFIG.labels.Main)
            {
                let _ = window.set_always_on_top(false);
            }
        });
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
pub fn start_double_shift_listener(app_handle: tauri::AppHandle) -> Result<(), String> {
    double_shift::start_listening(app_handle)
}

#[tauri::command]
pub fn stop_double_shift_listener() -> Result<(), String> {
    double_shift::stop_listening()
}
