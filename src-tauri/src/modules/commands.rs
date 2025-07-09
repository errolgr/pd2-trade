use crate::{keyboard, window};
use tauri::Manager;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_diablo_rect(window_name: Option<String>) -> Option<window::WindowRect> {
    window::get_diablo_rect(window_name.as_deref().unwrap_or("Diablo II"))
}

#[tauri::command]
pub fn press_key(sequence: String) -> Result<(), String> {
    keyboard::press_key(sequence)
}

#[tauri::command]
pub fn is_diablo_focused(window_name: Option<String>) -> bool {
    window::is_diablo_focused(window_name.as_deref().unwrap_or("Diablo II"))
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

#[tauri::command]
pub fn set_window_click_through(app_handle: tauri::AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window.set_ignore_cursor_events(ignore)
            .map_err(|e| format!("Failed to set click-through: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn force_window_focus(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window.set_focus()
            .map_err(|e| format!("Failed to set window focus: {}", e))?;
        main_window.set_always_on_top(true)
            .map_err(|e| format!("Failed to set always on top: {}", e))?;
        // Reset always on top after a short delay
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(100));
            if let Some(window) = app_handle_clone.get_webview_window("main") {
                let _ = window.set_always_on_top(false);
            }
        });
    }
    Ok(())
}

#[tauri::command]
pub fn reposition_toast_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::{PhysicalPosition, PhysicalSize};

    // Toast window size
    let toast_width = 800;
    let toast_height = 250;
    let margin = 10;
    let offsetY = -150;

    #[cfg(target_os = "macos")]
    {
        let monitor = app_handle.primary_monitor().unwrap().unwrap();
        let size = monitor.size();
        let position = monitor.position();
        let width = size.width as i32;
        let height = size.height as i32;
        let x = position.x as i32;
        let y = position.y as i32;
        println!("[toast][macos][monitor] monitor position: x={}, y={}, size: width={}, height={}", x, y, width, height);
        let toast_x = x + width - toast_width - margin;
        let toast_y = y + height - toast_height - margin + offsetY;
        println!("[toast][macos][monitor] calculated position (bottom right): x={}, y={}", toast_x, toast_y);
        if let Some(toast_window) = app_handle.get_webview_window("toast") {
            println!("[toast] Setting position to x={}, y={}", toast_x, toast_y);
            toast_window
                .set_position(PhysicalPosition::new(toast_x as f64, toast_y as f64))
                .map_err(|e| format!("Failed to set toast window position: {}", e))?;
            toast_window
                .set_size(PhysicalSize::new(toast_width as f64, toast_height as f64))
                .map_err(|e| format!("Failed to set toast window size: {}", e))?;
        } else {
            println!("[toast] Could not get toast window");
        }
        return Ok(());
    }

    // Other platforms: use previous logic
    let bounds = window::get_appropriate_window_bounds()
        .ok_or("Could not get window bounds")?;
    let x = bounds.x + bounds.width - toast_width - margin;
    let y = bounds.y + bounds.height - toast_height - margin;
    if let Some(toast_window) = app_handle.get_webview_window("toast") {
        toast_window
            .set_position(PhysicalPosition::new(x as f64, y as f64))
            .map_err(|e| format!("Failed to set toast window position: {}", e))?;
        toast_window
            .set_size(PhysicalSize::new(toast_width as f64, toast_height as f64))
            .map_err(|e| format!("Failed to set toast window size: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .output();
    }
    // No-op on other platforms
}
