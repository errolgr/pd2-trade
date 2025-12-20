use serde::Serialize;
use tauri::{AppHandle, Emitter};

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
