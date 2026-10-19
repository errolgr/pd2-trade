use super::WindowRect;
use std::sync::Mutex;
use std::{ffi::OsStr, iter, os::windows::prelude::OsStrExt, ptr};
use tauri::{AppHandle, Emitter};

use windows_sys::Win32::{
    Foundation::{HWND, POINT, RECT},
    Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MonitorFromWindow, HMONITOR, MONITORINFO,
        MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY,
    },
    UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK},
    UI::WindowsAndMessaging::{
        FindWindowW, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId, IsIconic,
        SetForegroundWindow, ShowWindow, EVENT_SYSTEM_FOREGROUND, SW_RESTORE,
        WINEVENT_OUTOFCONTEXT,
    },
};

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(iter::once(0)).collect()
}

fn find_diablo_hwnd() -> Option<HWND> {
    let title_w = to_wide("Diablo II");
    let hwnd: HWND = unsafe { FindWindowW(ptr::null(), title_w.as_ptr()) };
    (hwnd != 0).then_some(hwnd)
}

pub fn get_diablo_rect(_app: &AppHandle) -> Option<WindowRect> {
    let hwnd = find_diablo_hwnd()?;
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
    // 1. Check if Diablo II window was found
    let Some(hwnd) = find_diablo_hwnd() else {
        return false;
    };

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

/// Gives keyboard focus back to the Diablo II window.
pub fn focus_diablo() -> bool {
    let Some(hwnd) = find_diablo_hwnd() else {
        return false;
    };
    unsafe {
        if IsIconic(hwnd) != 0 {
            ShowWindow(hwnd, SW_RESTORE);
        }
        SetForegroundWindow(hwnd) != 0
    }
}

fn monitor_rect(monitor: HMONITOR) -> Option<WindowRect> {
    if monitor == 0 {
        return None;
    }
    let mut info: MONITORINFO = unsafe { std::mem::zeroed() };
    info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
    if unsafe { GetMonitorInfoW(monitor, &mut info) } == 0 {
        return None;
    }
    let r = info.rcMonitor;
    Some(WindowRect {
        x: r.left,
        y: r.top,
        width: r.right - r.left,
        height: r.bottom - r.top,
    })
}

/// Full rect (not work area) of the monitor containing Diablo II, else the primary monitor.
pub fn get_appropriate_window_bounds(_app: &AppHandle) -> Option<WindowRect> {
    let monitor = match find_diablo_hwnd() {
        Some(hwnd) => unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) },
        None => unsafe { MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY) },
    };
    monitor_rect(monitor)
}

// --- Event-driven foreground monitoring ---

static mut FOREGROUND_HOOK: Option<HWINEVENTHOOK> = None;

static CALLBACK: Mutex<Option<Box<dyn Fn() + Send>>> = Mutex::new(None);

unsafe extern "system" fn win_event_proc(
    _hook: HWINEVENTHOOK,
    _event: u32,
    _hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _event_thread: u32,
    _event_time: u32,
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
        let mut last_state: std::sync::MutexGuard<'_, Option<bool>> = DIABLO_FOCUS_STATE.lock().unwrap();

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
