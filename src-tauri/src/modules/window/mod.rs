use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

#[derive(Serialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Serialize, serde::Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PopupRect {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

#[cfg(not(target_os = "windows"))]
mod linux;
#[cfg(not(target_os = "windows"))]
pub use linux::*;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

// Shared Logic

/// Validates and sanitizes window bounds before saving to prevent integer overflow bugs
fn validate_and_sanitize_bounds(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    let size = window.inner_size()?;
    let pos = window.outer_position()?;
    
    // Check for invalid dimensions (Linux integer overflow bug)
    if size.width > 10000 || size.height > 10000 || pos.x.abs() > 50000 || pos.y.abs() > 50000 {
        eprintln!(
            "[window] Validating bounds before save: detected invalid dimensions, resetting... size: {:?}, pos: {:?}",
            size, pos
        );
        window.set_size(tauri::LogicalSize::new(800.0, 600.0))?;
        window.set_position(tauri::LogicalPosition::new(100.0, 100.0))?;
    }
    
    Ok(())
}

/// Attaches window state saving behavior to a window on focus/blur events
fn attach_window_state_saving(window: tauri::WebviewWindow) {
    let window_clone = window.clone();
    let app_handle = window.app_handle().clone();
    
    // Listen for focus/blur events using on_window_event
    window.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Focused(true) | tauri::WindowEvent::Focused(false) => {
                if let Err(e) = validate_and_sanitize_bounds(&window_clone) {
                    eprintln!("[window] Failed to validate bounds on focus change: {}", e);
                    return;
                }
                
                if let Err(e) = app_handle.save_window_state(StateFlags::all()) {
                    eprintln!("[window] Failed to save window state on focus change: {}", e);
                }
            }
            _ => {}
        }
    });
}

/// Initializes window state saving for all existing windows and sets up a background thread
/// to automatically attach listeners to newly created windows
pub fn initialize_window_state_saving(app: AppHandle) {
    // Attach to all existing windows
    for window in app.webview_windows().values() {
        attach_window_state_saving(window.clone());
    }
    
    // Set up a background thread to watch for newly created windows
    std::thread::spawn(move || {
        use std::collections::HashSet;
        let mut known_windows: HashSet<String> = HashSet::new();
        
        // Initialize with existing windows
        let existing_windows: Vec<_> = app.webview_windows().values().cloned().collect();
        for window in existing_windows {
            let label: String = window.label().into();
            known_windows.insert(label);
        }
        
        loop {
            // Check for new windows every 100ms
            std::thread::sleep(std::time::Duration::from_millis(100));
            
            // Get all current windows
            let current_windows: Vec<_> = app.webview_windows().values().cloned().collect();
            
            // Check for new windows and attach listeners
            for window in current_windows {
                let window_label: String = window.label().into();
                
                if !known_windows.contains(&window_label) {
                    println!("[window] New window detected: {}, attaching state saving", window_label);
                    attach_window_state_saving(window.clone());
                    known_windows.insert(window_label);
                }
            }
        }
    });
}

pub fn start_tracking_thread(app: AppHandle) {
    std::thread::spawn(move || {
        let mut prev_rect: Option<WindowRect> = None;
        let diff_threshold = 0; // Pixel difference to trigger update

        loop {
            // Unified call - platform modules must implement this
            let rect_opt = get_diablo_rect(&app);

            if let Some(rect) = rect_opt {
                let should_emit = match prev_rect {
                    Some(prev) => {
                        (rect.x - prev.x).abs() > diff_threshold
                            || (rect.y - prev.y).abs() > diff_threshold
                            || (rect.width - prev.width).abs() > diff_threshold
                            || (rect.height - prev.height).abs() > diff_threshold
                    }
                    None => true,
                };

                if should_emit {
                    let delta_x = if let Some(p) = prev_rect {
                        rect.x - p.x
                    } else {
                        0
                    };
                    let delta_y = if let Some(p) = prev_rect {
                        rect.y - p.y
                    } else {
                        0
                    };

                    // Emit event
                    let payload = serde_json::json!({
                       "rect": rect,
                       "delta": { "dx": delta_x, "dy": delta_y }
                    });

                    if let Err(e) = app.emit("diablo-window-moved", payload) {
                        eprintln!("[Tracking] Failed to emit event: {}", e);
                    }

                    prev_rect = Some(rect);
                }
            }

            // Sleep 50ms (20hz) - fast enough for smooth drag, low CPU
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
    });
}
