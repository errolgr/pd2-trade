use super::{PopupRect, WindowRect};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};
use tauri::{AppHandle, Emitter, Manager};

use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    UI::WindowsAndMessaging::{
        FindWindowW, GetCursorPos, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
        SystemParametersInfoW, EVENT_SYSTEM_FOREGROUND, SPI_GETWORKAREA, WINEVENT_OUTOFCONTEXT,
    },
};

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

pub fn get_diablo_rect(_app: &AppHandle) -> Option<WindowRect> {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };
    if hwnd == 0 {
        return None;
    }
    let mut r = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let ok = unsafe { GetWindowRect(hwnd, &mut r as *mut RECT) };
    if ok == 0 {
        return None;
    }
    Some(WindowRect {
        x: r.left,
        y: r.top,
        width: r.right - r.left,
        height: r.bottom - r.top,
    })
}

pub fn is_diablo_focused() -> bool {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };

    // 1. Check if Diablo II window was found
    if hwnd == 0 {
        return false;
    }

    let foreground = unsafe { GetForegroundWindow() };

    // 2. Check if Diablo II is the foreground window
    if hwnd == foreground {
        return true;
    }

    // 3. Check if the foreground window belongs to THIS application (PID check)
    // This prevents flickering when interacting with overlays (Chat, Settings, etc.)
    let mut foreground_pid: u32 = 0;
    unsafe { GetWindowThreadProcessId(foreground, &mut foreground_pid) };

    if foreground_pid == std::process::id() {
        return true;
    }

    false
}

pub fn get_work_area(_app: &AppHandle) -> Option<WindowRect> {
    let mut work_area = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let ok =
        unsafe { SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut work_area as *mut _ as *mut _, 0) };
    if ok == 0 {
        return None;
    }
    Some(WindowRect {
        x: work_area.left,
        y: work_area.top,
        width: work_area.right - work_area.left,
        height: work_area.bottom - work_area.top,
    })
}

pub fn get_appropriate_window_bounds(app: &AppHandle) -> Option<WindowRect> {
    if is_diablo_focused() {
        get_diablo_rect(app)
    } else {
        get_work_area(app)
    }
}

// --- Event-driven foreground monitoring ---

static mut FOREGROUND_HOOK: Option<HWINEVENTHOOK> = None;

static CALLBACK: Mutex<Option<Box<dyn Fn() + Send>>> = Mutex::new(None);

unsafe extern "system" fn win_event_proc(
    _hWinEventHook: HWINEVENTHOOK,
    _event: u32,
    _hwnd: HWND,
    _idObject: i32,
    _idChild: i32,
    _dwEventThread: u32,
    _dwmsEventTime: u32,
) {
    if let Some(cb) = &*CALLBACK.lock().unwrap() {
        cb();
    }
}

pub fn initialize_foreground_monitoring<F: Fn() + Send + 'static>(callback: F) {
    unsafe {
        let hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            0,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        );
        FOREGROUND_HOOK = Some(hook);
        *CALLBACK.lock().unwrap() = Some(Box::new(callback));
    }
}

static DIABLO_FOCUS_STATE: Mutex<Option<bool>> = Mutex::new(None);

pub fn initialize_diablo_focus_monitoring(
    app_handle: AppHandle,
    on_focus_change: Option<Box<dyn Fn(bool) + Send + 'static>>,
) {
    let initial_focus_state = is_diablo_focused();

    // Store initial state
    *DIABLO_FOCUS_STATE.lock().unwrap() = Some(initial_focus_state);

    // Emit initial state
    let _ = app_handle.emit("diablo-focus-changed", initial_focus_state);

    // Call optional callback with initial state
    if let Some(ref callback) = on_focus_change {
        callback(initial_focus_state);
    }

    initialize_foreground_monitoring(move || {
        let current_focus_state = is_diablo_focused();
        let mut last_state = DIABLO_FOCUS_STATE.lock().unwrap();

        if let Some(last) = *last_state {
            if current_focus_state != last {
                *last_state = Some(current_focus_state);
                let _ = app_handle.emit("diablo-focus-changed", current_focus_state);

                // Call optional callback when focus changes
                if let Some(callback) = &on_focus_change {
                    callback(current_focus_state);
                }
            }
        } else {
            *last_state = Some(current_focus_state);
            let _ = app_handle.emit("diablo-focus-changed", current_focus_state);

            // Call optional callback
            if let Some(callback) = &on_focus_change {
                callback(current_focus_state);
            }
        }
    });
}

pub fn cleanup_foreground_monitoring() {
    unsafe {
        if let Some(hook) = FOREGROUND_HOOK {
            UnhookWinEvent(hook);
            FOREGROUND_HOOK = None;
        }
        *CALLBACK.lock().unwrap() = None;
    }
}

static POPUP_RECTS: Lazy<Mutex<HashMap<String, Vec<PopupRect>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static MONITORING_STARTED: AtomicBool = AtomicBool::new(false);

pub fn update_popup_rects(window_label: String, rects: Vec<PopupRect>) {
    if let Ok(mut guard) = POPUP_RECTS.lock() {
        guard.insert(window_label, rects);
    }
}

pub fn start_cursor_monitoring(app_handle: AppHandle) {
    if MONITORING_STARTED.swap(true, Ordering::SeqCst) {
        return; // Already started
    }

    std::thread::spawn(move || {
        let mut last_states: HashMap<String, bool> = HashMap::new(); // label -> is_ignoring

        loop {
            // Poll at 20Hz (50ms)
            std::thread::sleep(std::time::Duration::from_millis(50));

            // Get cursor position
            let mut point = POINT { x: 0, y: 0 };
            unsafe {
                if GetCursorPos(&mut point) == 0 {
                    continue;
                }
            }

            let cursor_x = point.x as f64;
            let cursor_y = point.y as f64;

            // Check each window
            let windows_to_check: Vec<(String, Vec<PopupRect>)> = {
                match POPUP_RECTS.lock() {
                    Ok(guard) => guard.iter().map(|(k, v)| (k.clone(), v.clone())).collect(),
                    Err(_) => continue,
                }
            };

            for (label, rects) in windows_to_check {
                if let Some(window) = app_handle.get_webview_window(&label) {
                    // Skip if window is not visible
                    if let Ok(false) = window.is_visible() {
                        continue;
                    }

                    // Get window position
                    if let Ok(pos) = window.outer_position() {
                        let win_x = pos.x as f64;
                        let win_y = pos.y as f64;

                        let rel_x = cursor_x - win_x;
                        let rel_y = cursor_y - win_y;

                        let is_over_popup = rects.iter().any(|r| {
                            rel_x >= r.left
                                && rel_x <= r.right
                                && rel_y >= r.top
                                && rel_y <= r.bottom
                        });

                        // If over popup, we want INTERACTIVE (ignore = false)
                        // If NOT over popup, we want CLICK-THROUGH (ignore = true)
                        let should_ignore = !is_over_popup;

                        // Check if state changed
                        let current_ignore = last_states.get(&label).copied().unwrap_or(false);
                        let is_first_run = !last_states.contains_key(&label);

                        if is_first_run || current_ignore != should_ignore {
                            match window.set_ignore_cursor_events(should_ignore) {
                                Ok(_) => {
                                    last_states.insert(label, should_ignore);
                                }
                                Err(e) => {
                                    eprintln!(
                                        "Failed to set ignore cursor events for {}: {}",
                                        label, e
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}
