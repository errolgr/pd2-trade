//! Interactive (click-receiving) region of the transparent overlay window.
//!
//! The Main window covers the whole monitor; only the rects reported by the
//! frontend receive mouse input, everything else falls through to the game.

use serde::Deserialize;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewWindow};

/// Rects of the region last applied to the Main window, for hit-testing clicks (see window::outside_click).
static CURRENT: Mutex<Vec<RegionRect>> = Mutex::new(Vec::new());

/// Point (physical pixels, relative to the Main window) on one of its interactive rects. Unknown counts as
/// inside, so nothing closes on a guess.
pub fn contains(x: i32, y: i32) -> bool {
    CURRENT
        .lock()
        .map(|rects| rects_contain(&rects, x, y))
        .unwrap_or(true)
}

fn rects_contain(rects: &[RegionRect], x: i32, y: i32) -> bool {
    rects
        .iter()
        .any(|r| x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height)
}

/// Rect in physical pixels relative to the Main window's top-left corner.
#[derive(Deserialize, Clone, Copy, Debug)]
pub struct RegionRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[tauri::command]
pub fn set_interactive_region(app_handle: AppHandle, rects: Vec<RegionRect>) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&crate::modules::config::WINDOW_CONFIG.labels.Main)
        .ok_or("Main window not found")?;
    apply_region(&window, &rects)
}

#[cfg(target_os = "windows")]
pub fn apply_region(window: &WebviewWindow, rects: &[RegionRect]) -> Result<(), String> {
    use windows_sys::Win32::Graphics::Gdi::{
        CombineRgn, CreateRectRgn, DeleteObject, SetWindowRgn, RGN_OR,
    };

    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
    unsafe {
        // An empty region (0x0) makes the whole window click-through.
        let region = CreateRectRgn(0, 0, 0, 0);
        if region == 0 {
            return Err("CreateRectRgn failed".into());
        }
        for r in rects.iter().filter(|r| r.width > 0 && r.height > 0) {
            let rect_region = CreateRectRgn(r.x, r.y, r.x + r.width, r.y + r.height);
            if rect_region == 0 {
                continue;
            }
            CombineRgn(region, region, rect_region, RGN_OR);
            DeleteObject(rect_region);
        }
        // On success the system owns `region`; only free it on failure.
        if SetWindowRgn(hwnd, region, 1) == 0 {
            DeleteObject(region);
            return Err("SetWindowRgn failed".into());
        }
    }
    if let Ok(mut current) = CURRENT.lock() {
        *current = rects.to_vec();
    }
    Ok(())
}

#[cfg(target_os = "linux")]
pub fn apply_region(window: &WebviewWindow, rects: &[RegionRect]) -> Result<(), String> {
    use gtk::cairo::{RectangleInt, Region};
    use gtk::prelude::WidgetExt;

    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    // GTK input shapes are in logical (device-independent) pixels.
    let mut logical: Vec<RectangleInt> = rects
        .iter()
        .filter(|r| r.width > 0 && r.height > 0)
        .map(|r| {
            let left = (r.x as f64 / scale).floor() as i32;
            let top = (r.y as f64 / scale).floor() as i32;
            let right = ((r.x + r.width) as f64 / scale).ceil() as i32;
            let bottom = ((r.y + r.height) as f64 / scale).ceil() as i32;
            RectangleInt::new(left, top, right - left, bottom - top)
        })
        .collect();
    if logical.is_empty() {
        // An empty input shape means "no shape" (whole window clickable) on X11;
        // use a 1x1 rect like tao's set_ignore_cursor_events.
        logical.push(RectangleInt::new(0, 0, 1, 1));
    }

    let target = window.clone();
    window
        .run_on_main_thread(move || {
            let Ok(gtk_window) = target.gtk_window() else {
                return;
            };
            let region = Region::create_rectangles(&logical);
            gtk_window.input_shape_combine_region(Some(&region));
        })
        .map_err(|e| e.to_string())
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
pub fn apply_region(_window: &WebviewWindow, _rects: &[RegionRect]) -> Result<(), String> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const fn rect(x: i32, y: i32, width: i32, height: i32) -> RegionRect {
        RegionRect {
            x,
            y,
            width,
            height,
        }
    }

    #[test]
    fn hit_tests_the_interactive_rects() {
        let rects = [rect(10, 10, 100, 50), rect(300, 0, 20, 20)];
        assert!(rects_contain(&rects, 10, 10));
        assert!(rects_contain(&rects, 109, 59));
        assert!(!rects_contain(&rects, 110, 30)); // right edge is exclusive
        assert!(!rects_contain(&rects, 200, 30)); // between panels: the game
        assert!(rects_contain(&rects, 305, 5));
    }

    #[test]
    fn no_panels_means_every_click_is_outside() {
        assert!(!rects_contain(&[], 0, 0));
    }
}
